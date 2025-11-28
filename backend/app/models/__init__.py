"""
Models Package - Export all models for easy importing
"""

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

try:
    from .meilisearch_model import MeilisearchModel
except ImportError as e:
    MeilisearchModel = None
    import logging
    logging.getLogger(__name__).warning(f"Could not import MeilisearchModel: {e}")

try:
    from .meilisearch_models import (
        MeilisearchSyncLog,
        MeilisearchProductSync,
        SearchLog,
        SearchSuggestion,
        SearchAnalyticsDaily,
        MeilisearchConfig
    )
except ImportError as e:
    MeilisearchSyncLog = None
    MeilisearchProductSync = None
    SearchLog = None
    SearchSuggestion = None
    SearchAnalyticsDaily = None
    MeilisearchConfig = None
    import logging
    logging.getLogger(__name__).warning(f"Could not import meilisearch_models: {e}")

try:
    from .carousel_model import *
except ImportError as e:
    import logging
    logging.getLogger(__name__).warning(f"Could not import carousel_model: {e}")

try:
    from .contact_cta_model import *
except ImportError as e:
    import logging
    logging.getLogger(__name__).warning(f"Could not import contact_cta_model: {e}")

try:
    from .footer_settings import *
except ImportError as e:
    import logging
    logging.getLogger(__name__).warning(f"Could not import footer_settings: {e}")

try:
    from .notification_model import *
except ImportError as e:
    import logging
    logging.getLogger(__name__).warning(f"Could not import notification_model: {e}")

try:
    from .side_panel_model import *
except ImportError as e:
    import logging
    logging.getLogger(__name__).warning(f"Could not import side_panel_model: {e}")

try:
    from .theme_settings import *
except ImportError as e:
    import logging
    logging.getLogger(__name__).warning(f"Could not import theme_settings: {e}")

try:
    from .topbar_model import *
except ImportError as e:
    import logging
    logging.getLogger(__name__).warning(f"Could not import topbar_model: {e}")

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
