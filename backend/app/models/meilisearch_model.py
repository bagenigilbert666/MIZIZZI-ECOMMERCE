"""
SQLAlchemy Models for Meilisearch Integration
Provides database models for tracking search analytics, sync operations, and configurations.

This module is designed to be resilient - it will provide fallback stub classes
if SQLAlchemy or the database is not available.
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

__all__ = [
    'MeilisearchSyncLog',
    'MeilisearchProductSync',
    'SearchLog',
    'SearchSuggestion',
    'SearchAnalyticsDaily',
    'MeilisearchConfig',
    'MeilisearchModel',
]

MeilisearchSyncLog = None
MeilisearchProductSync = None
SearchLog = None
SearchSuggestion = None
SearchAnalyticsDaily = None
MeilisearchConfig = None
MeilisearchModel = None

_db = None
_DB_AVAILABLE = False

# Try importing db from various locations
try:
    from ..configuration.extensions import db as _db
    _DB_AVAILABLE = True
    logger.debug("Imported db from configuration.extensions")
except ImportError:
    try:
        from app.configuration.extensions import db as _db
        _DB_AVAILABLE = True
        logger.debug("Imported db from app.configuration.extensions")
    except ImportError:
        try:
            from flask_sqlalchemy import SQLAlchemy
            _db = SQLAlchemy()
            _DB_AVAILABLE = True
            logger.debug("Created new SQLAlchemy instance")
        except ImportError:
            logger.warning("SQLAlchemy not available - using stub classes")
            _DB_AVAILABLE = False

if _DB_AVAILABLE:
    try:
        from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, DECIMAL, Date, UniqueConstraint, Index
        from sqlalchemy.orm import relationship
    except ImportError:
        _DB_AVAILABLE = False


class _StubModel:
    """Stub model base class when SQLAlchemy is not available."""
    __tablename__ = 'stub'
    
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def to_dict(self):
        return {k: v for k, v in self.__dict__.items() if not k.startswith('_')}
    
    @classmethod
    def query(cls):
        return _StubQuery()


class _StubQuery:
    """Stub query class that returns empty results."""
    
    def filter_by(self, **kwargs):
        return self
    
    def filter(self, *args):
        return self
    
    def first(self):
        return None
    
    def all(self):
        return []
    
    def count(self):
        return 0
    
    def order_by(self, *args):
        return self
    
    def limit(self, n):
        return self
    
    def offset(self, n):
        return self


class _StubMeilisearchModel:
    """Stub MeilisearchModel when meilisearch_model.py is not available"""
    
    @classmethod
    def get_client(cls):
        return None
    
    @classmethod
    def get_index(cls):
        return None
    
    @classmethod
    def sync_products(cls, products):
        return {'success': False, 'error': 'MeilisearchModel not available', 'synced': 0}
    
    @classmethod
    def sync_single_product(cls, product):
        return {'success': False, 'error': 'MeilisearchModel not available'}
    
    @classmethod
    def delete_product(cls, product_id):
        return {'success': False, 'error': 'MeilisearchModel not available'}
    
    @classmethod
    def search(cls, query, **kwargs):
        return {'hits': [], 'query': query, 'estimatedTotalHits': 0, 'error': 'MeilisearchModel not available'}
    
    @classmethod
    def get_stats(cls):
        return {'available': False, 'error': 'MeilisearchModel not available'}
    
    @classmethod
    def clear_index(cls):
        return {'success': False, 'error': 'MeilisearchModel not available'}
    
    @classmethod
    def product_to_meilisearch(cls, product):
        return {}


MeilisearchModel = _StubMeilisearchModel


if _DB_AVAILABLE and _db is not None:
    # Use actual SQLAlchemy models
    
    class _MeilisearchSyncLog(_db.Model):
        """Tracks product sync operations to Meilisearch"""
        __tablename__ = 'meilisearch_sync_log'
        
        id = Column(Integer, primary_key=True)
        sync_type = Column(String(50), nullable=False, default='manual')
        status = Column(String(20), nullable=False, default='pending')
        total_products = Column(Integer, default=0)
        synced_count = Column(Integer, default=0)
        failed_count = Column(Integer, default=0)
        error_message = Column(Text)
        task_uid = Column(String(100))
        started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
        completed_at = Column(DateTime(timezone=True))
        duration_ms = Column(Integer)
        triggered_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
        created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
        updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
        
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

    class _MeilisearchProductSync(_db.Model):
        """Tracks individual product sync status"""
        __tablename__ = 'meilisearch_product_sync'
        
        id = Column(Integer, primary_key=True)
        product_id = Column(Integer, ForeignKey('products.id', ondelete='CASCADE'), nullable=False, unique=True)
        last_synced_at = Column(DateTime(timezone=True))
        sync_status = Column(String(20), default='pending')
        last_error = Column(Text)
        retry_count = Column(Integer, default=0)
        meilisearch_id = Column(String(100))
        created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
        updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
        
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

    class _SearchLog(_db.Model):
        """Tracks user search queries for analytics"""
        __tablename__ = 'search_log'
        
        id = Column(Integer, primary_key=True)
        query = Column(Text, nullable=False)
        normalized_query = Column(Text)
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
        source = Column(String(50), default='web')
        created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
        
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

    class _SearchSuggestion(_db.Model):
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

    class _SearchAnalyticsDaily(_db.Model):
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

    class _MeilisearchConfig(_db.Model):
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
                _db.session.add(config)
            _db.session.commit()
            return config

    MeilisearchSyncLog = _MeilisearchSyncLog
    MeilisearchProductSync = _MeilisearchProductSync
    SearchLog = _SearchLog
    SearchSuggestion = _SearchSuggestion
    SearchAnalyticsDaily = _SearchAnalyticsDaily
    MeilisearchConfig = _MeilisearchConfig
    logger.debug("Successfully created SQLAlchemy Meilisearch models")

else:
    logger.info("Using stub Meilisearch models (database not available)")
    
    class _StubMeilisearchSyncLog(_StubModel):
        """Stub MeilisearchSyncLog for when DB is not available"""
        __tablename__ = 'meilisearch_sync_log'
        
        def __init__(self, **kwargs):
            self.id = kwargs.get('id')
            self.sync_type = kwargs.get('sync_type', 'manual')
            self.status = kwargs.get('status', 'pending')
            self.total_products = kwargs.get('total_products', 0)
            self.synced_count = kwargs.get('synced_count', 0)
            self.failed_count = kwargs.get('failed_count', 0)
            self.error_message = kwargs.get('error_message')
            self.task_uid = kwargs.get('task_uid')
            self.started_at = kwargs.get('started_at')
            self.completed_at = kwargs.get('completed_at')
            self.duration_ms = kwargs.get('duration_ms')
            self.triggered_by = kwargs.get('triggered_by')
            self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))
            self.updated_at = kwargs.get('updated_at', datetime.now(timezone.utc))

    class _StubMeilisearchProductSync(_StubModel):
        """Stub MeilisearchProductSync for when DB is not available"""
        __tablename__ = 'meilisearch_product_sync'
        
        def __init__(self, **kwargs):
            self.id = kwargs.get('id')
            self.product_id = kwargs.get('product_id')
            self.last_synced_at = kwargs.get('last_synced_at')
            self.sync_status = kwargs.get('sync_status', 'pending')
            self.last_error = kwargs.get('last_error')
            self.retry_count = kwargs.get('retry_count', 0)
            self.meilisearch_id = kwargs.get('meilisearch_id')
            self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))
            self.updated_at = kwargs.get('updated_at', datetime.now(timezone.utc))

    class _StubSearchLog(_StubModel):
        """Stub SearchLog for when DB is not available"""
        __tablename__ = 'search_log'
        
        def __init__(self, **kwargs):
            self.id = kwargs.get('id')
            self.query = kwargs.get('query', '')
            self.normalized_query = kwargs.get('normalized_query')
            self.user_id = kwargs.get('user_id')
            self.session_id = kwargs.get('session_id')
            self.ip_address = kwargs.get('ip_address')
            self.user_agent = kwargs.get('user_agent')
            self.results_count = kwargs.get('results_count', 0)
            self.processing_time_ms = kwargs.get('processing_time_ms')
            self.filters_used = kwargs.get('filters_used')
            self.sort_used = kwargs.get('sort_used')
            self.page = kwargs.get('page', 1)
            self.clicked_product_id = kwargs.get('clicked_product_id')
            self.clicked_position = kwargs.get('clicked_position')
            self.converted = kwargs.get('converted', False)
            self.source = kwargs.get('source', 'web')
            self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))

    class _StubSearchSuggestion(_StubModel):
        """Stub SearchSuggestion for when DB is not available"""
        __tablename__ = 'search_suggestion'
        
        def __init__(self, **kwargs):
            self.id = kwargs.get('id')
            self.term = kwargs.get('term', '')
            self.normalized_term = kwargs.get('normalized_term', '')
            self.search_count = kwargs.get('search_count', 1)
            self.click_count = kwargs.get('click_count', 0)
            self.conversion_count = kwargs.get('conversion_count', 0)
            self.last_searched_at = kwargs.get('last_searched_at', datetime.now(timezone.utc))
            self.is_promoted = kwargs.get('is_promoted', False)
            self.is_blocked = kwargs.get('is_blocked', False)
            self.category_id = kwargs.get('category_id')
            self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))
            self.updated_at = kwargs.get('updated_at', datetime.now(timezone.utc))

    class _StubSearchAnalyticsDaily(_StubModel):
        """Stub SearchAnalyticsDaily for when DB is not available"""
        __tablename__ = 'search_analytics_daily'
        
        def __init__(self, **kwargs):
            self.id = kwargs.get('id')
            self.date = kwargs.get('date')
            self.total_searches = kwargs.get('total_searches', 0)
            self.unique_queries = kwargs.get('unique_queries', 0)
            self.unique_users = kwargs.get('unique_users', 0)
            self.zero_result_searches = kwargs.get('zero_result_searches', 0)
            self.avg_processing_time_ms = kwargs.get('avg_processing_time_ms')
            self.total_clicks = kwargs.get('total_clicks', 0)
            self.click_through_rate = kwargs.get('click_through_rate')
            self.conversion_rate = kwargs.get('conversion_rate')
            self.top_queries = kwargs.get('top_queries')
            self.top_zero_result_queries = kwargs.get('top_zero_result_queries')
            self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))

    class _StubMeilisearchConfig(_StubModel):
        """Stub MeilisearchConfig for when DB is not available"""
        __tablename__ = 'meilisearch_config'
        
        def __init__(self, **kwargs):
            self.id = kwargs.get('id')
            self.key = kwargs.get('key', '')
            self.value = kwargs.get('value', {})
            self.description = kwargs.get('description')
            self.is_active = kwargs.get('is_active', True)
            self.updated_by = kwargs.get('updated_by')
            self.created_at = kwargs.get('created_at', datetime.now(timezone.utc))
            self.updated_at = kwargs.get('updated_at', datetime.now(timezone.utc))
        
        @classmethod
        def get_config(cls, key, default=None):
            return default
        
        @classmethod
        def set_config(cls, key, value, description=None, user_id=None):
            return cls(key=key, value=value, description=description, updated_by=user_id)

    # Assign stub models to module-level names
    MeilisearchSyncLog = _StubMeilisearchSyncLog
    MeilisearchProductSync = _StubMeilisearchProductSync
    SearchLog = _StubSearchLog
    SearchSuggestion = _StubSearchSuggestion
    SearchAnalyticsDaily = _StubSearchAnalyticsDaily
    MeilisearchConfig = _StubMeilisearchConfig


import sys

_alternative_mod = sys.modules.get('app.models.meilisearch_models') or sys.modules.get('meilisearch_models')
if _alternative_mod is not None and hasattr(_alternative_mod, 'MeilisearchModel'):
    try:
        candidate = getattr(_alternative_mod, 'MeilisearchModel')
        # Avoid reusing the local stub if it's the same type
        if candidate is not None and candidate is not _StubMeilisearchModel:
            MeilisearchModel = candidate
            logger.debug("Using MeilisearchModel implementation from already-loaded meilisearch_models module")
        else:
            logger.debug("Found MeilisearchModel in sibling module but it matches the local stub; keeping local stub")
    except Exception as e:
        logger.debug(f"Error while adopting MeilisearchModel from sibling module: {e}")
else:
    logger.debug("No preloaded alternative MeilisearchModel found; using local stub implementation")

# Register aliases so code importing `app.models.meilisearch_models` or `meilisearch_models`
# will get this module and its exported names (MeilisearchModel, MeilisearchSyncLog, etc).
try:
    module_obj = sys.modules.get(__name__)
    if module_obj:
        sys.modules.setdefault('app.models.meilisearch_models', module_obj)
        sys.modules.setdefault('meilisearch_models', module_obj)
        logger.debug("Registered module aliases: 'app.models.meilisearch_models' and 'meilisearch_models' -> %s", __name__)
except Exception as e:
    logger.debug("Failed to register meilisearch_models aliases: %s", e)
