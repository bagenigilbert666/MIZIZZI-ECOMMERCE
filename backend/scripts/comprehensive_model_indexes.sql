-- =====================================================================
-- Comprehensive Database Indexing Strategy for All Mizizzi Models
-- =====================================================================
-- This script creates optimized indexes for all tables to maximize
-- query performance across the entire application platform.
--
-- Execution: Run this script on production database to add all indexes
-- Safety: Uses CONCURRENTLY to avoid locking table during creation
-- =====================================================================

-- =====================================================================
-- SECURITY & AUTH MODELS INDEXES
-- =====================================================================

-- TokenBlacklist Table - Fast JWT token revocation lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_blacklist_jti 
  ON token_blacklist(jti) WHERE token_type IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_blacklist_user_expires 
  ON token_blacklist(user_id, expires_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_blacklist_expires_at 
  ON token_blacklist(expires_at) WHERE expires_at < NOW();

-- AdminActivityLog Table - Audit trail searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_activity_logs_admin_id_created 
  ON admin_activity_logs(admin_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_activity_logs_action_created 
  ON admin_activity_logs(action, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_activity_logs_endpoint 
  ON admin_activity_logs(endpoint, method);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_activity_logs_created_at_status 
  ON admin_activity_logs(created_at DESC, status_code);

-- AdminMFA Table - Multi-factor authentication
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_mfa_user_id_enabled 
  ON admin_mfa(user_id, is_enabled);

-- User Table - Authentication and user lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
  ON users(email, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_created 
  ON users(role, created_at DESC);

-- =====================================================================
-- PRODUCT CATALOG INDEXES (Already optimized in enhanced_product_indexes.sql)
-- These are here for reference and additional supplementary indexes
-- =====================================================================

-- Additional product search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_is_active_is_visible 
  ON products(is_active, is_visible) WHERE is_active = true AND is_visible = true;

-- =====================================================================
-- FLASH SALES & PROMOTIONAL MODELS INDEXES
-- =====================================================================

-- FlashSaleEvent Table - Event timing and status lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flash_sale_events_active_time 
  ON flash_sale_events(is_active, start_time DESC, end_time ASC) 
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flash_sale_events_featured_active 
  ON flash_sale_events(is_featured, start_time DESC) 
  WHERE is_active = true AND is_featured = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flash_sale_events_live 
  ON flash_sale_events(start_time, end_time) 
  WHERE is_active = true;

-- =====================================================================
-- CATEGORY & BANNER MODELS INDEXES
-- =====================================================================

-- CategoryBanner Table - Banner display lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_category_banners_active_order 
  ON category_banners(is_active, display_order ASC) 
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_category_banners_category_active 
  ON category_banners(category_id, is_active, display_order ASC) 
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_category_banners_created_by 
  ON category_banners(created_by, created_at DESC);

-- =====================================================================
-- CAROUSEL BANNER INDEXES
-- =====================================================================

-- CarouselBanner Table - Homepage carousel optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_carousel_banners_active_position 
  ON carousel_banners(is_active, position, sort_order ASC) 
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_carousel_banners_position_order 
  ON carousel_banners(position, sort_order ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_carousel_banners_active_created 
  ON carousel_banners(is_active, created_at DESC) 
  WHERE is_active = true;

-- =====================================================================
-- CONTACT CTA INDEXES
-- =====================================================================

-- ContactCTA Table - Contact slide display
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_cta_active_sort 
  ON contact_cta_slides(is_active, sort_order ASC) 
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_cta_created_at 
  ON contact_cta_slides(created_at DESC);

-- =====================================================================
-- NOTIFICATION INDEXES
-- =====================================================================

-- Notification Table - User notification queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read_created 
  ON notifications(user_id, read, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_type 
  ON notifications(user_id, type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, read) 
  WHERE read = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_order_id 
  ON notifications(order_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_product_id 
  ON notifications(product_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_expires_at 
  ON notifications(expires_at) 
  WHERE expires_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at_type 
  ON notifications(created_at DESC, type);

-- NotificationPreference Table - User preferences
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_preferences_user_id 
  ON notification_preferences(user_id);

-- =====================================================================
-- SEARCH ANALYTICS INDEXES
-- =====================================================================

-- SearchQuery Table - Query analytics and trending
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_queries_user_date 
  ON search_queries(user_id, search_time DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_queries_session_date 
  ON search_queries(session_id, search_time DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_queries_text_time 
  ON search_queries(query_text, search_time DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_queries_converted 
  ON search_queries(user_id, converted, search_time DESC) 
  WHERE converted = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_queries_product_clicked 
  ON search_queries(clicked_product_id) 
  WHERE clicked_product_id IS NOT NULL;

-- SearchClick Table - Click-through analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_clicks_query_id 
  ON search_clicks(search_query_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_clicks_product_id 
  ON search_clicks(product_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_clicks_product_query 
  ON search_clicks(product_id, search_query_id);

-- SearchConversion Table - Conversion tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_conversions_query_id 
  ON search_conversions(search_query_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_conversions_order_id 
  ON search_conversions(order_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_conversions_conversion_time 
  ON search_conversions(conversion_time DESC);

-- SearchSuggestion Table - Autocomplete optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_suggestions_text 
  ON search_suggestions(suggestion_text);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_suggestions_count_search 
  ON search_suggestions(search_count DESC, last_searched DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_suggestions_category 
  ON search_suggestions(category_id) 
  WHERE category_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_suggestions_brand 
  ON search_suggestions(brand_id) 
  WHERE brand_id IS NOT NULL;

-- SearchPerformanceMetric Table - Analytics dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_performance_date 
  ON search_performance_metrics(date DESC);

-- SearchTrendingTopic Table - Trending analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_trending_active_score 
  ON search_trending_topics(is_active, trend_score DESC) 
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_trending_volume 
  ON search_trending_topics(search_volume DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_trending_date 
  ON search_trending_topics(date_detected DESC);

-- SearchUserProfile Table - Personalization engine
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_user_profiles_user_id 
  ON search_user_profiles(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_user_profiles_session 
  ON search_user_profiles(session_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_user_profiles_updated 
  ON search_user_profiles(last_updated DESC);

-- =====================================================================
-- ADMIN EMAIL LOG INDEXES
-- =====================================================================

-- AdminEmailLog Table - Email tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_email_logs_user_id 
  ON admin_email_logs(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_email_logs_admin_id 
  ON admin_email_logs(admin_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_email_logs_sent_at 
  ON admin_email_logs(sent_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_email_logs_status 
  ON admin_email_logs(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_email_logs_user_sent 
  ON admin_email_logs(user_id, sent_at DESC);

-- =====================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- =====================================================================

-- Flash sales with filtering (used by homepage and featured sections)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flash_sales_query_pattern 
  ON flash_sale_events(is_active, is_featured, start_time DESC) 
  WHERE is_active = true;

-- Notifications with pagination (user dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_pagination 
  ON notifications(user_id, created_at DESC) 
  WHERE is_active = true;

-- Search analytics for reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_analytics_reporting 
  ON search_queries(search_time DESC, user_id, converted);

-- =====================================================================
-- PERFORMANCE ANALYSIS INDEXES
-- =====================================================================

-- Create index on frequently aggregated columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_queries_date_aggregation 
  ON search_queries(DATE(search_time) DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_date_aggregation 
  ON notifications(DATE(created_at) DESC);

-- =====================================================================
-- VACUUM AND ANALYZE
-- =====================================================================

-- Analyze tables to update query planner statistics
-- This helps the database optimizer make better execution plans
ANALYZE token_blacklist;
ANALYZE admin_activity_logs;
ANALYZE admin_mfa;
ANALYZE users;
ANALYZE flash_sale_events;
ANALYZE category_banners;
ANALYZE carousel_banners;
ANALYZE contact_cta_slides;
ANALYZE notifications;
ANALYZE notification_preferences;
ANALYZE search_queries;
ANALYZE search_clicks;
ANALYZE search_conversions;
ANALYZE search_suggestions;
ANALYZE search_performance_metrics;
ANALYZE search_trending_topics;
ANALYZE search_user_profiles;
ANALYZE admin_email_logs;
