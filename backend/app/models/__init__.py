"""
Models Package - Export all models for easy importing
"""
import logging

logger = logging.getLogger(__name__)

from .models import (
    db,
    User,
    Product,
    Category,
    Brand,
    Order,
    OrderItem,
    Cart,
    CartItem,
    Review,
    WishlistItem,
    Address,
    Payment,
    Coupon,
    ProductVariant,
    ProductImage,
    ProductEmbedding
)

# Import MeilisearchModel from the singular file (meilisearch_model.py)
MeilisearchModel = None
try:
    from .meilisearch_models import MeilisearchModel
    logger.debug("Successfully imported MeilisearchModel from meilisearch_model.py")
except ImportError as e:
    logger.warning(f"Could not import MeilisearchModel from meilisearch_model.py: {e}")
    # Create a stub class if import fails
    class MeilisearchModel:
        """Stub MeilisearchModel class when meilisearch_model.py is not available"""
        @classmethod
        def get_client(cls): return None
        @classmethod
        def get_index(cls): return None
        @classmethod
        def sync_products(cls, products): return {'success': False, 'error': 'MeilisearchModel not available', 'synced': 0}
        @classmethod
        def sync_single_product(cls, product): return {'success': False, 'error': 'MeilisearchModel not available'}
        @classmethod
        def delete_product(cls, product_id): return {'success': False, 'error': 'MeilisearchModel not available'}
        @classmethod
        def search(cls, query, **kwargs): return {'hits': [], 'query': query, 'estimatedTotalHits': 0}
        @classmethod
        def get_stats(cls): return {'available': False}
        @classmethod
        def clear_index(cls): return {'success': False, 'error': 'MeilisearchModel not available'}

# Import SQLAlchemy models from the plural file (meilisearch_models.py)
MeilisearchSyncLog = None
MeilisearchProductSync = None
SearchLog = None
SearchSuggestion = None
SearchAnalyticsDaily = None
MeilisearchConfig = None

try:
    from .meilisearch_models import (
        MeilisearchSyncLog,
        MeilisearchProductSync,
        SearchLog,
        SearchSuggestion,
        SearchAnalyticsDaily,
        MeilisearchConfig
    )
    logger.debug("Successfully imported SQLAlchemy models from meilisearch_models.py")
except ImportError as e:
    logger.warning(f"Could not import meilisearch_models: {e}")

try:
    from .carousel_model import *
except ImportError as e:
    logger.warning(f"Could not import carousel_model: {e}")

try:
    from .contact_cta_model import *
except ImportError as e:
    logger.warning(f"Could not import contact_cta_model: {e}")

try:
    from .footer_settings import *
except ImportError as e:
    logger.warning(f"Could not import footer_settings: {e}")

try:
    from .notification_model import *
except ImportError as e:
    logger.warning(f"Could not import notification_model: {e}")

try:
    from .side_panel_model import *
except ImportError as e:
    logger.warning(f"Could not import side_panel_model: {e}")

try:
    from .theme_settings import *
except ImportError as e:
    logger.warning(f"Could not import theme_settings: {e}")

try:
    from .topbar_model import *
except ImportError as e:
    logger.warning(f"Could not import topbar_model: {e}")

__all__ = [
    'db',
    'User',
    'Product',
    'Category',
    'Brand',
    'Order',
    'OrderItem',
    'Cart',
    'CartItem',
    'Review',
    'WishlistItem',
    'Address',
    'Payment',
    'Coupon',
    'ProductVariant',
    'ProductImage',
    'ProductEmbedding',
    'MeilisearchModel',
    'MeilisearchSyncLog',
    'MeilisearchProductSync',
    'SearchLog',
    'SearchSuggestion',
    'SearchAnalyticsDaily',
    'MeilisearchConfig'
]
