import asyncio
import os
import random
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from models import Base, StockMention

from sqlalchemy import text

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/stonkboard")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

TICKERS = ["$CTXR", "$ALPP", "$BNGO", "$ZOM", "$SENS", "$OCGN", "$TRCH", "$AGTC", "$CIDM"]

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if already seeded
        result = await session.execute(text("SELECT COUNT(*) FROM stock_mentions"))
        count = result.scalar()
        if count > 0:
            print("Database already seeded")
            return

        mentions = []
        now = datetime.utcnow()
        for i in range(100):
            ticker = random.choice(TICKERS)
            created_at = now - timedelta(hours=random.randint(0, 48))
            
            # Generate random realistic sentiment and price
            initial_sentiment = random.uniform(-1.0, 1.0)
            delayed_sentiment = random.uniform(-1.0, 1.0) if random.random() > 0.3 else None
            
            # 20% chance of pump-and-dump (high initial, low delayed)
            if random.random() < 0.2:
                initial_sentiment = random.uniform(0.6, 1.0)
                delayed_sentiment = random.uniform(-1.0, -0.4)
                
            price_at_mention = random.uniform(0.01, 4.50)
            
            # 50% chance went up, 50% down
            current_price = price_at_mention * random.uniform(0.5, 1.5)
            
            status = "COMPLETED" if delayed_sentiment is not None else "PENDING"
            
            m = StockMention(
                post_id=f"post_{i}_{int(now.timestamp())}",
                ticker_symbol=ticker,
                title=f"DD on {ticker} - To the moon!",
                body_text="Here is some detailed analysis...",
                author=f"user_{random.randint(1000, 9999)}",
                url=f"https://reddit.com/r/pennystocks/comments/abc{i}",
                price_at_mention=price_at_mention,
                current_price=current_price,
                initial_sentiment_score=initial_sentiment,
                initial_sentiment_confidence=random.uniform(0.5, 1.0),
                delayed_comment_sentiment_score=delayed_sentiment,
                comment_crawl_status=status,
                created_at=created_at,
                post_created_at=created_at - timedelta(minutes=random.randint(1, 60))
            )
            mentions.append(m)
            
        session.add_all(mentions)
        await session.commit()
        print(f"Seeded {len(mentions)} records.")

if __name__ == "__main__":
    asyncio.run(seed())
