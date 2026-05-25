from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class StockMentionBase(BaseModel):
    post_id: str
    ticker_symbol: str
    title: str
    body_text: Optional[str] = None
    author: str
    url: str
    post_created_at: datetime

class StockMentionCreate(StockMentionBase):
    pass

class StockMentionOut(StockMentionBase):
    id: int
    price_at_mention: Optional[float]
    current_price: Optional[float]
    initial_sentiment_score: Optional[float]
    initial_sentiment_confidence: Optional[float]
    delayed_comment_sentiment_score: Optional[float]
    comment_crawl_status: str
    created_at: datetime
    
    # Calculated field
    perf_delta: Optional[float] = None
    mention_volume: Optional[int] = None

    class Config:
        orm_mode = True
        from_attributes = True

class DashboardParams(BaseModel):
    time_window_hours: int = 24
    min_volume: int = 1
    divergence_filter: bool = False
    price_tier: Optional[str] = None # 'SUB_PENNY', 'MICRO_CAP', 'TRUE_PENNY'
    min_perf_delta: Optional[float] = None
