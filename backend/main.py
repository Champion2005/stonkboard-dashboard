from fastapi import FastAPI, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from typing import List, Optional
import math
from fastapi.middleware.cors import CORSMiddleware

from database import get_db, engine, Base
from models import StockMention
from schemas import StockMentionOut

app = FastAPI(title="Stonkboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/api/dashboard", response_model=List[StockMentionOut])
async def get_dashboard(
    time_window_hours: int = Query(24),
    min_volume: int = Query(1),
    divergence_filter: bool = Query(False),
    price_tier: Optional[str] = Query(None),
    min_perf_delta: Optional[float] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    # Base query for aggregation and filtering
    query = """
        SELECT 
            sm.*,
            (
                CASE 
                    WHEN sm.price_at_mention IS NOT NULL AND sm.price_at_mention > 0 
                    THEN ((sm.current_price - sm.price_at_mention) / sm.price_at_mention) * 100 
                    ELSE 0 
                END
            ) AS perf_delta,
            vol.mention_volume
        FROM stock_mentions sm
        JOIN (
            SELECT ticker_symbol, COUNT(DISTINCT post_id) AS mention_volume
            FROM stock_mentions
            WHERE created_at >= NOW() - INTERVAL '{time_window_hours} hours'
            GROUP BY ticker_symbol
            HAVING COUNT(DISTINCT post_id) >= {min_volume}
        ) vol ON sm.ticker_symbol = vol.ticker_symbol
        WHERE sm.created_at >= NOW() - INTERVAL '{time_window_hours} hours'
    """
    
    query = query.replace("{time_window_hours}", str(time_window_hours)).replace("{min_volume}", str(min_volume))

    # Sentiment Divergence Filter
    if divergence_filter:
        query += """
            AND sm.initial_sentiment_score >= 0.5
            AND sm.delayed_comment_sentiment_score <= -0.3
            AND sm.comment_crawl_status = 'COMPLETED'
        """
        
    # Penny Price Tiering
    if price_tier == 'SUB_PENNY':
        query += " AND sm.current_price < 0.10"
    elif price_tier == 'MICRO_CAP':
        query += " AND sm.current_price >= 0.10 AND sm.current_price <= 1.00"
    elif price_tier == 'TRUE_PENNY':
        query += " AND sm.current_price > 1.00 AND sm.current_price <= 5.00"

    # Price Performance Delta
    if min_perf_delta is not None:
        query += f"""
            AND (
                CASE 
                    WHEN sm.price_at_mention IS NOT NULL AND sm.price_at_mention > 0 
                    THEN ((sm.current_price - sm.price_at_mention) / sm.price_at_mention) * 100 
                    ELSE 0 
                END
            ) > {min_perf_delta}
        """

    query += " ORDER BY sm.created_at DESC"

    result = await db.execute(text(query))
    rows = result.fetchall()
    
    # Map raw SQL rows to the Pydantic schema
    mentions = []
    for row in rows:
        row_dict = dict(row._mapping)
        mentions.append(StockMentionOut(**row_dict))
        
    return mentions

@app.get("/api/health")
async def health():
    return {"status": "ok"}
