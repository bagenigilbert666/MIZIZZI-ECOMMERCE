"""
Clean blueprint import registry.
Single source of truth for all route blueprints.
"""

# Each entry is (module_path, blueprint_name, url_prefix)
# Module path uses standard app.routes.* pattern only
BLUEPRINT_ROUTES = [
    # User routes
    ('app.routes.cart.cart_routes', 'cart_routes', '/api/cart'),
    ('app.routes.user.user', 'validation_routes', None),
    
    # Admin core routes
    ('app.routes.admin.admin', 'admin_routes', '/api/admin'),
    ('app.routes.admin.admin_auth', 'admin_auth_routes', '/api/admin/auth'),
    ('app.routes.admin.admin_google_auth', 'admin_google_auth_routes', '/api/admin/auth/google'),
    ('app.routes.admin.admin_email_routes', 'admin_email_routes', '/api/admin/email'),
    ('app.routes.admin.dashboard', 'dashboard_routes', '/api/admin/dashboard'),
    ('app.routes.admin.admin_cart_routes', 'admin_cart_routes', '/api/admin/cart'),
    ('app.routes.admin.admin_cloudinary_routes', 'admin_cloudinary_routes', '/api/admin/cloudinary'),
    ('app.routes.admin.admin_category_routes', 'admin_category_routes', '/api/admin/categories'),
    ('app.routes.admin.admin_shop_categories_routes', 'admin_shop_categories_routes', '/api/admin/shop-categories'),
    
    # Order routes
    ('app.routes.order.order_routes', 'order_routes', '/api/orders'),
    ('app.routes.order.admin_order_routes', 'admin_order_routes', '/api/admin/orders'),
    
    # Product routes
    ('app.routes.products.products_routes', 'products_routes', '/api/products'),
    ('app.routes.products.admin_products_routes', 'admin_products_routes', '/api/admin/products'),
    ('app.routes.products.featured_routes', 'featured_routes', '/api/featured'),
    ('app.routes.products.product_images_batch', 'product_images_batch_bp', '/api/products/images'),
    
    # Category routes
    ('app.routes.categories.categories_routes', 'categories_routes', '/api/categories'),
    
    # Address routes
    ('app.routes.address.user_address_routes', 'user_address_routes', '/api/address'),
    ('app.routes.address.admin_address_routes', 'admin_address_routes', '/api/admin/address'),
    
    # Inventory routes
    ('app.routes.inventory.user_inventory_routes', 'user_inventory_routes', '/api/inventory'),
    ('app.routes.inventory.admin_inventory_routes', 'admin_inventory_routes', '/api/admin/inventory'),
    
    # Brand routes
    ('app.routes.brands.user_brand_routes', 'user_brand_routes', '/api/brands'),
    ('app.routes.brands.admin_brand_routes', 'admin_brand_routes', '/api/admin/brands'),
    
    # Review routes
    ('app.routes.reviews.user_review_routes', 'user_review_routes', '/api/reviews'),
    ('app.routes.reviews.admin_review_routes', 'admin_review_routes', '/api/admin/reviews'),
    
    # Wishlist routes
    ('app.routes.wishlist.user_wishlist_routes', 'user_wishlist_routes', '/api/wishlist'),
    ('app.routes.wishlist.admin_wishlist_routes', 'admin_wishlist_routes', '/api/admin/wishlist'),
    
    # Payment routes
    ('app.routes.payments.pesapal_routes', 'pesapal_routes', '/api/payments/pesapal'),
    
    # Coupon routes
    ('app.routes.coupon.coupon_routes', 'coupon_routes', '/api/coupons'),
    
    # Notification routes
    ('app.routes.notifications.notification_routes', 'notification_routes', '/api/notifications'),
    
    # Content/UI routes
    ('app.routes.carousel.carousel_routes', 'carousel_routes', '/api/carousel'),
    ('app.routes.theme.theme_routes', 'theme_routes', '/api/theme'),
    ('app.routes.footer.footer_routes', 'footer_routes', '/api/footer'),
    ('app.routes.panels.side_panel_routes', 'side_panel_routes', '/api/side-panel'),
    ('app.routes.topbar.topbar_routes', 'topbar_routes', '/api/topbar'),
    ('app.routes.contact_cta.contact_cta_routes', 'contact_cta_routes', '/api/contact-cta'),
    
    # Search routes
    ('app.routes.meilisearch.meilisearch_routes', 'meilisearch_routes', '/api/search'),
    ('app.routes.meilisearch.admin_meilisearch_routes', 'admin_meilisearch_routes', '/api/admin/search'),
    
    # Flash sale routes
    ('app.routes.flash_sale.flash_sale_routes', 'flash_sale_routes', '/api/flash-sale'),
    
    # Homepage routes (at the end to catch root)
    ('app.routes.homepage.homepage_routes', 'homepage_routes', '/'),
]


def get_blueprint_registry():
    """Get the blueprint registry."""
    return BLUEPRINT_ROUTES


def try_import_blueprint(module_path, blueprint_name):
    """
    Try to import a blueprint from the given module path.
    
    Args:
        module_path: Full module path (e.g., 'app.routes.cart.cart_routes')
        blueprint_name: Name of the blueprint variable in the module
    
    Returns:
        The blueprint object if found, None otherwise
    """
    try:
        module = __import__(module_path, fromlist=[blueprint_name])
        return getattr(module, blueprint_name, None)
    except (ImportError, AttributeError):
        return None
