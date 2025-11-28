"""
SQLAlchemy Models for Meilisearch Integration
Provides database models for tracking search analytics, sync operations, and configurations.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, DECIMAL, Date, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from ..configuration.extensions import db


class MeilisearchSyncLog(db.Model):
    """Tracks product sync operations to Meilisearch"""
    __tablename__ = 'meilisearch_sync_log'
    
    id = Column(Integer, primary_key=True)
    sync_type = Column(String(50), nullable=False, default='manual')  # manual, auto, scheduled, webhook
    status = Column(String(20), nullable=False, default='pending')     # pending, in_progress, completed, failed
    total_products = Column(Integer, default=0)
    synced_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    error_message = Column(Text)
    task_uid = Column(String(100))  # Meilisearch task UID
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True))
    duration_ms = Column(Integer)
    triggered_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    triggered_by_user = relationship('User', foreign_keys=[triggered_by], backref='meilisearch_syncs')
    
    def to_dict(self):
        return {
            'id': self.id,
            'sync_type': self.sync_type,
            'status': self.status,
            'total_products': self.total_products,
            'synced_count': self.synced_count,
            'failed_count': self.failed_count,
            'error_message': self.error_message,
            'task_uid': self.task_uid,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'duration_ms': self.duration_ms,
            'triggered_by': self.triggered_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class MeilisearchProductSync(db.Model):
    """Tracks individual product sync status"""
    __tablename__ = 'meilisearch_product_sync'
    
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey('products.id', ondelete='CASCADE'), nullable=False, unique=True)
    last_synced_at = Column(DateTime(timezone=True))
    sync_status = Column(String(20), default='pending')  # pending, synced, failed, deleted
    last_error = Column(Text)
    retry_count = Column(Integer, default=0)
    meilisearch_id = Column(String(100))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    product = relationship('Product', backref='meilisearch_sync')
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'last_synced_at': self.last_synced_at.isoformat() if self.last_synced_at else None,
            'sync_status': self.sync_status,
            'last_error': self.last_error,
            'retry_count': self.retry_count,
            'meilisearch_id': self.meilisearch_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class SearchLog(db.Model):
    """Tracks user search queries for analytics"""
    __tablename__ = 'search_log'
    
    id = Column(Integer, primary_key=True)
    query = Column(Text, nullable=False)
    normalized_query = Column(Text)  # Lowercase, trimmed
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    session_id = Column(String(100))
    ip_address = Column(String(45))
    user_agent = Column(Text)
    results_count = Column(Integer, default=0)
    processing_time_ms = Column(Integer)
    filters_used = Column(JSON)
    sort_used = Column(String(50))
    page = Column(Integer, default=1)
    clicked_product_id = Column(Integer, ForeignKey('products.id', ondelete='SET NULL'))
    clicked_position = Column(Integer)
    converted = Column(Boolean, default=False)
    source = Column(String(50), default='web')  # web, mobile, api
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship('User', foreign_keys=[user_id], backref='search_logs')
    clicked_product = relationship('Product', foreign_keys=[clicked_product_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_search_log_query', 'normalized_query'),
        Index('idx_search_log_user', 'user_id'),
        Index('idx_search_log_created', 'created_at'),
        Index('idx_search_log_session', 'session_id'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'query': self.query,
            'user_id': self.user_id,
            'results_count': self.results_count,
            'processing_time_ms': self.processing_time_ms,
            'filters_used': self.filters_used,
            'sort_used': self.sort_used,
            'page': self.page,
            'clicked_product_id': self.clicked_product_id,
            'clicked_position': self.clicked_position,
            'converted': self.converted,
            'source': self.source,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class SearchSuggestion(db.Model):
    """Stores popular/suggested search terms"""
    __tablename__ = 'search_suggestion'
    
    id = Column(Integer, primary_key=True)
    term = Column(String(255), nullable=False)
    normalized_term = Column(String(255), nullable=False, unique=True)
    search_count = Column(Integer, default=1)
    click_count = Column(Integer, default=0)
    conversion_count = Column(Integer, default=0)
    last_searched_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    is_promoted = Column(Boolean, default=False)
    is_blocked = Column(Boolean, default=False)
    category_id = Column(Integer, ForeignKey('categories.id', ondelete='SET NULL'))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    category = relationship('Category', backref='search_suggestions')
    
    # Indexes
    __table_args__ = (
        Index('idx_suggestion_term', 'normalized_term'),
        Index('idx_suggestion_count', 'search_count'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'term': self.term,
            'search_count': self.search_count,
            'click_count': self.click_count,
            'conversion_count': self.conversion_count,
            'is_promoted': self.is_promoted,
            'category_id': self.category_id,
            'last_searched_at': self.last_searched_at.isoformat() if self.last_searched_at else None
        }


class SearchAnalyticsDaily(db.Model):
    """Aggregated daily search analytics"""
    __tablename__ = 'search_analytics_daily'
    
    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False, unique=True)
    total_searches = Column(Integer, default=0)
    unique_queries = Column(Integer, default=0)
    unique_users = Column(Integer, default=0)
    zero_result_searches = Column(Integer, default=0)
    avg_processing_time_ms = Column(DECIMAL(10, 2))
    total_clicks = Column(Integer, default=0)
    click_through_rate = Column(DECIMAL(5, 4))
    conversion_rate = Column(DECIMAL(5, 4))
    top_queries = Column(JSON)
    top_zero_result_queries = Column(JSON)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'total_searches': self.total_searches,
            'unique_queries': self.unique_queries,
            'unique_users': self.unique_users,
            'zero_result_searches': self.zero_result_searches,
            'avg_processing_time_ms': float(self.avg_processing_time_ms) if self.avg_processing_time_ms else None,
            'total_clicks': self.total_clicks,
            'click_through_rate': float(self.click_through_rate) if self.click_through_rate else None,
            'conversion_rate': float(self.conversion_rate) if self.conversion_rate else None,
            'top_queries': self.top_queries,
            'top_zero_result_queries': self.top_zero_result_queries
        }


class MeilisearchConfig(db.Model):
    """Stores Meilisearch configuration and settings"""
    __tablename__ = 'meilisearch_config'
    
    id = Column(Integer, primary_key=True)
    key = Column(String(100), nullable=False, unique=True)
    value = Column(JSON, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    updated_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    updated_by_user = relationship('User', foreign_keys=[updated_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'value': self.value,
            'description': self.description,
            'is_active': self.is_active,
            'updated_by': self.updated_by,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def get_config(cls, key, default=None):
        """Get configuration value by key"""
        config = cls.query.filter_by(key=key, is_active=True).first()
        return config.value if config else default
    
    @classmethod
    def set_config(cls, key, value, description=None, user_id=None):
        """Set configuration value"""
        config = cls.query.filter_by(key=key).first()
        if config:
            config.value = value
            if description:
                config.description = description
            config.updated_by = user_id
        else:
            config = cls(key=key, value=value, description=description, updated_by=user_id)
            db.session.add(config)
        db.session.commit()
        return config
