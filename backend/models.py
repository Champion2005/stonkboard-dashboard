from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Index
from sqlalchemy.sql import func
from database import Base

class StockMention(Base):
    __tablename__ = "stock_mentions"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(String, index=True, unique=True, nullable=False)
    ticker_symbol = Column(String, nullable=False)
    title = Column(String, nullable=False)
    body_text = Column(Text, nullable=True)
    author = Column(String, nullable=False)
    url = Column(String, nullable=False)
    
    # Pricing
    price_at_mention = Column(Float, nullable=True)
    current_price = Column(Float, nullable=True)
    
    # Sentiment
    initial_sentiment_score = Column(Float, nullable=True) # -1.0 to 1.0
    initial_sentiment_confidence = Column(Float, nullable=True) # 0.0 to 1.0
    delayed_comment_sentiment_score = Column(Float, nullable=True) # -1.0 to 1.0
    
    # Processing Status
    comment_crawl_status = Column(String, default="PENDING") # 'PENDING', 'COMPLETED', 'FAILED'
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now())
    post_created_at = Column(DateTime(timezone=True), nullable=False) # Original reddit post time

# Composite B-Tree index for Volume Filter
Index('idx_ticker_created', StockMention.ticker_symbol, StockMention.created_at)
