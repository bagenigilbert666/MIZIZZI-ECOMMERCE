"""
Meilisearch Models Module
=========================
Provides resilient Meilisearch helper classes and SQLAlchemy models.
Falls back to safe no-op stubs when dependencies are unavailable.
"""

import logging
from datetime import datetime
from typing import Optional, Any, Dict, List

logger = logging.getLogger(__name__)

# Track what's available
_db_available = False
_meilisearch_available = False
db = None

# Try to import SQLAlchemy db instance
try:
    from app.extensions import db as _db
    db = _db
    _db_available = True
    logger.info("✅ SQLAlchemy db instance imported successfully")
except ImportError as e:
    logger.warning(f"⚠️ Could not import db from app.extensions: {e}")
    try:
        from flask_sqlalchemy import SQLAlchemy
        db = SQLAlchemy()
        _db_available = True
        logger.info("✅ Created standalone SQLAlchemy instance")
    except ImportError:
        logger.warning("⚠️ flask_sqlalchemy not available, using stub models")

# Try to import Meilisearch client
try:
    import meilisearch
    _meilisearch_available = True
    logger.info("✅ Meilisearch client imported successfully")
except ImportError:
    logger.warning("⚠️ Meilisearch client not available")


# =============================================================================
# SQLAlchemy Models (with fallback stubs)
# =============================================================================

if _db_available and db is not None:
    class SearchLog(db.Model):
        """
        SQLAlchemy model for logging search queries and analytics.
        """
        __tablename__ = 'search_logs'
        __table_args__ = {'extend_existing': True}
        
        id = db.Column(db.Integer, primary_key=True, autoincrement=True)
        query = db.Column(db.String(500), nullable=False, index=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
        session_id = db.Column(db.String(100), nullable=True, index=True)
        results_count = db.Column(db.Integer, default=0)
        response_time_ms = db.Column(db.Float, nullable=True)
        filters_applied = db.Column(db.JSON, nullable=True)
        created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
        ip_address = db.Column(db.String(45), nullable=True)
        user_agent = db.Column(db.String(500), nullable=True)
        
        def __repr__(self):
            return f'<SearchLog {self.id}: "{self.query[:30]}...">'
        
        def to_dict(self) -> Dict[str, Any]:
            return {
                'id': self.id,
                'query': self.query,
                'user_id': self.user_id,
                'session_id': self.session_id,
                'results_count': self.results_count,
                'response_time_ms': self.response_time_ms,
                'filters_applied': self.filters_applied,
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'ip_address': self.ip_address,
                'user_agent': self.user_agent
            }

    class MeilisearchSyncLog(db.Model):
        """
        SQLAlchemy model for tracking Meilisearch sync operations.
        """
        __tablename__ = 'meilisearch_sync_logs'
        __table_args__ = {'extend_existing': True}
        
        id = db.Column(db.Integer, primary_key=True, autoincrement=True)
        index_name = db.Column(db.String(100), nullable=False, index=True)
        operation = db.Column(db.String(50), nullable=False)  # 'full_sync', 'incremental', 'delete', 'update'
        status = db.Column(db.String(20), default='pending')  # 'pending', 'in_progress', 'completed', 'failed'
        records_processed = db.Column(db.Integer, default=0)
        records_failed = db.Column(db.Integer, default=0)
        error_message = db.Column(db.Text, nullable=True)
        started_at = db.Column(db.DateTime, default=datetime.utcnow)
        completed_at = db.Column(db.DateTime, nullable=True)
        triggered_by = db.Column(db.String(100), nullable=True)  # 'manual', 'cron', 'webhook'
        metadata = db.Column(db.JSON, nullable=True)
        
        def __repr__(self):
            return f'<MeilisearchSyncLog {self.id}: {self.index_name} - {self.status}>'
        
        def to_dict(self) -> Dict[str, Any]:
            return {
                'id': self.id,
                'index_name': self.index_name,
                'operation': self.operation,
                'status': self.status,
                'records_processed': self.records_processed,
                'records_failed': self.records_failed,
                'error_message': self.error_message,
                'started_at': self.started_at.isoformat() if self.started_at else None,
                'completed_at': self.completed_at.isoformat() if self.completed_at else None,
                'triggered_by': self.triggered_by,
                'metadata': self.metadata
            }
        
        def mark_completed(self, records_processed: int = 0):
            self.status = 'completed'
            self.records_processed = records_processed
            self.completed_at = datetime.utcnow()
        
        def mark_failed(self, error_message: str):
            self.status = 'failed'
            self.error_message = error_message
            self.completed_at = datetime.utcnow()

else:
    # Fallback stub classes when SQLAlchemy is not available
    class SearchLog:
        """Stub SearchLog class when database is unavailable."""
        __tablename__ = 'search_logs'
        
        def __init__(self, **kwargs):
            self.id = None
            self.query = kwargs.get('query', '')
            self.user_id = kwargs.get('user_id')
            self.session_id = kwargs.get('session_id')
            self.results_count = kwargs.get('results_count', 0)
            self.response_time_ms = kwargs.get('response_time_ms')
            self.filters_applied = kwargs.get('filters_applied')
            self.created_at = kwargs.get('created_at', datetime.utcnow())
            self.ip_address = kwargs.get('ip_address')
            self.user_agent = kwargs.get('user_agent')
            logger.warning("SearchLog stub created - database not available")
        
        def __repr__(self):
            return f'<SearchLog(stub): "{self.query[:30]}...">'
        
        def to_dict(self) -> Dict[str, Any]:
            return {
                'id': self.id,
                'query': self.query,
                'user_id': self.user_id,
                'results_count': self.results_count,
                'created_at': self.created_at.isoformat() if self.created_at else None
            }

    class MeilisearchSyncLog:
        """Stub MeilisearchSyncLog class when database is unavailable."""
        __tablename__ = 'meilisearch_sync_logs'
        
        def __init__(self, **kwargs):
            self.id = None
            self.index_name = kwargs.get('index_name', '')
            self.operation = kwargs.get('operation', '')
            self.status = kwargs.get('status', 'pending')
            self.records_processed = kwargs.get('records_processed', 0)
            self.records_failed = kwargs.get('records_failed', 0)
            self.error_message = kwargs.get('error_message')
            self.started_at = kwargs.get('started_at', datetime.utcnow())
            self.completed_at = kwargs.get('completed_at')
            self.triggered_by = kwargs.get('triggered_by')
            self.metadata = kwargs.get('metadata')
            logger.warning("MeilisearchSyncLog stub created - database not available")
        
        def __repr__(self):
            return f'<MeilisearchSyncLog(stub): {self.index_name} - {self.status}>'
        
        def to_dict(self) -> Dict[str, Any]:
            return {
                'id': self.id,
                'index_name': self.index_name,
                'operation': self.operation,
                'status': self.status,
                'records_processed': self.records_processed,
                'error_message': self.error_message
            }
        
        def mark_completed(self, records_processed: int = 0):
            self.status = 'completed'
            self.records_processed = records_processed
            self.completed_at = datetime.utcnow()
        
        def mark_failed(self, error_message: str):
            self.status = 'failed'
            self.error_message = error_message
            self.completed_at = datetime.utcnow()


# =============================================================================
# MeilisearchModel Helper Class
# =============================================================================

class MeilisearchModel:
    """
    Helper class for Meilisearch operations with safe no-op fallbacks.
    Provides methods for indexing, searching, and managing Meilisearch indexes.
    """
    
    _client = None
    _initialized = False
    
    def __init__(self, host: Optional[str] = None, api_key: Optional[str] = None):
        """
        Initialize Meilisearch client.
        
        Args:
            host: Meilisearch server URL (default: from env MEILISEARCH_HOST)
            api_key: Meilisearch API key (default: from env MEILISEARCH_API_KEY)
        """
        self.host = host
        self.api_key = api_key
        self._client = None
        
        if _meilisearch_available:
            self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the Meilisearch client with configuration."""
        import os
        
        host = self.host or os.environ.get('MEILISEARCH_HOST', 'http://localhost:7700')
        api_key = self.api_key or os.environ.get('MEILISEARCH_API_KEY', '')
        
        try:
            self._client = meilisearch.Client(host, api_key)
            # Test connection
            self._client.health()
            self._initialized = True
            logger.info(f"✅ Meilisearch client initialized: {host}")
        except Exception as e:
            logger.warning(f"⚠️ Could not connect to Meilisearch: {e}")
            self._client = None
            self._initialized = False
    
    @property
    def is_available(self) -> bool:
        """Check if Meilisearch is available and connected."""
        return self._initialized and self._client is not None
    
    def get_index(self, index_name: str):
        """
        Get or create a Meilisearch index.
        
        Args:
            index_name: Name of the index
            
        Returns:
            Index object or None if unavailable
        """
        if not self.is_available:
            logger.warning(f"Meilisearch unavailable - cannot get index '{index_name}'")
            return None
        
        try:
            return self._client.index(index_name)
        except Exception as e:
            logger.error(f"Error getting index '{index_name}': {e}")
            return None
    
    def create_index(self, index_name: str, primary_key: str = 'id') -> bool:
        """
        Create a new Meilisearch index.
        
        Args:
            index_name: Name of the index
            primary_key: Primary key field name
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available:
            logger.warning(f"Meilisearch unavailable - cannot create index '{index_name}'")
            return False
        
        try:
            self._client.create_index(index_name, {'primaryKey': primary_key})
            logger.info(f"✅ Created index '{index_name}' with primary key '{primary_key}'")
            return True
        except Exception as e:
            logger.error(f"Error creating index '{index_name}': {e}")
            return False
    
    def add_documents(self, index_name: str, documents: List[Dict], primary_key: str = 'id') -> Optional[Dict]:
        """
        Add documents to an index.
        
        Args:
            index_name: Name of the index
            documents: List of documents to add
            primary_key: Primary key field name
            
        Returns:
            Task info dict or None if failed
        """
        if not self.is_available:
            logger.warning(f"Meilisearch unavailable - cannot add documents to '{index_name}'")
            return None
        
        if not documents:
            logger.warning("No documents provided to add")
            return None
        
        try:
            index = self._client.index(index_name)
            result = index.add_documents(documents, primary_key)
            logger.info(f"✅ Added {len(documents)} documents to '{index_name}'")
            return result
        except Exception as e:
            logger.error(f"Error adding documents to '{index_name}': {e}")
            return None
    
    def search(self, index_name: str, query: str, options: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Search an index.
        
        Args:
            index_name: Name of the index
            query: Search query string
            options: Optional search parameters (limit, offset, filters, etc.)
            
        Returns:
            Search results dict (empty dict with hits=[] if unavailable)
        """
        empty_result = {'hits': [], 'query': query, 'processingTimeMs': 0, 'estimatedTotalHits': 0}
        
        if not self.is_available:
            logger.warning(f"Meilisearch unavailable - returning empty results for '{query}'")
            return empty_result
        
        try:
            index = self._client.index(index_name)
            result = index.search(query, options or {})
            return result
        except Exception as e:
            logger.error(f"Error searching '{index_name}' for '{query}': {e}")
            return empty_result
    
    def delete_document(self, index_name: str, document_id: Any) -> bool:
        """
        Delete a document from an index.
        
        Args:
            index_name: Name of the index
            document_id: ID of the document to delete
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available:
            logger.warning(f"Meilisearch unavailable - cannot delete document '{document_id}'")
            return False
        
        try:
            index = self._client.index(index_name)
            index.delete_document(document_id)
            logger.info(f"✅ Deleted document '{document_id}' from '{index_name}'")
            return True
        except Exception as e:
            logger.error(f"Error deleting document '{document_id}' from '{index_name}': {e}")
            return False
    
    def delete_all_documents(self, index_name: str) -> bool:
        """
        Delete all documents from an index.
        
        Args:
            index_name: Name of the index
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available:
            logger.warning(f"Meilisearch unavailable - cannot delete documents from '{index_name}'")
            return False
        
        try:
            index = self._client.index(index_name)
            index.delete_all_documents()
            logger.info(f"✅ Deleted all documents from '{index_name}'")
            return True
        except Exception as e:
            logger.error(f"Error deleting all documents from '{index_name}': {e}")
            return False
    
    def update_settings(self, index_name: str, settings: Dict) -> bool:
        """
        Update index settings (searchable attributes, filterable attributes, etc.).
        
        Args:
            index_name: Name of the index
            settings: Settings dictionary
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available:
            logger.warning(f"Meilisearch unavailable - cannot update settings for '{index_name}'")
            return False
        
        try:
            index = self._client.index(index_name)
            index.update_settings(settings)
            logger.info(f"✅ Updated settings for '{index_name}'")
            return True
        except Exception as e:
            logger.error(f"Error updating settings for '{index_name}': {e}")
            return False
    
    def get_stats(self, index_name: str) -> Optional[Dict]:
        """
        Get index statistics.
        
        Args:
            index_name: Name of the index
            
        Returns:
            Stats dict or None if unavailable
        """
        if not self.is_available:
            return None
        
        try:
            index = self._client.index(index_name)
            return index.get_stats()
        except Exception as e:
            logger.error(f"Error getting stats for '{index_name}': {e}")
            return None
    
    def health_check(self) -> Dict[str, Any]:
        """
        Check Meilisearch health status.
        
        Returns:
            Health status dict
        """
        if not self.is_available:
            return {'status': 'unavailable', 'message': 'Meilisearch client not initialized'}
        
        try:
            health = self._client.health()
            return {'status': 'available', 'health': health}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}


# =============================================================================
# Module-level convenience functions
# =============================================================================

# Create a default instance for convenience
_default_client: Optional[MeilisearchModel] = None

def get_meilisearch_client() -> MeilisearchModel:
    """Get or create the default Meilisearch client instance."""
    global _default_client
    if _default_client is None:
        _default_client = MeilisearchModel()
    return _default_client


def search_products(query: str, options: Optional[Dict] = None) -> Dict[str, Any]:
    """Convenience function to search the products index."""
    client = get_meilisearch_client()
    return client.search('products', query, options)


def index_product(product_data: Dict) -> Optional[Dict]:
    """Convenience function to index a single product."""
    client = get_meilisearch_client()
    return client.add_documents('products', [product_data])


def remove_product(product_id: Any) -> bool:
    """Convenience function to remove a product from the index."""
    client = get_meilisearch_client()
    return client.delete_document('products', product_id)


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    # Models
    'SearchLog',
    'MeilisearchSyncLog',
    # Helper class
    'MeilisearchModel',
    # Convenience functions
    'get_meilisearch_client',
    'search_products',
    'index_product',
    'remove_product',
    # Status flags
    'db',
    '_db_available',
    '_meilisearch_available',
]

logger.info(f"✅ meilisearch_models module loaded (db_available={_db_available}, meilisearch_available={_meilisearch_available})")
