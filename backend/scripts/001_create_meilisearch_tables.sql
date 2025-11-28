-- Meilisearch Database Tables for Search Analytics and Sync Tracking
-- Run this script to create the necessary tables for Meilisearch integration

-- Table: meilisearch_sync_log
-- Tracks product sync operations to Meilisearch
CREATE TABLE IF NOT EXISTS meilisearch_sync_log (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL DEFAULT 'manual',  -- 'manual', 'auto', 'scheduled', 'webhook'
    status VARCHAR(20) NOT NULL DEFAULT 'pending',    -- 'pending', 'in_progress', 'completed', 'failed'
    total_products INTEGER DEFAULT 0,
    synced_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    error_message TEXT,
    task_uid VARCHAR(100),                            -- Meilisearch task UID
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,                              -- Duration in milliseconds
    triggered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: meilisearch_product_sync
-- Tracks individual product sync status
CREATE TABLE IF NOT EXISTS meilisearch_product_sync (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'pending',        -- 'pending', 'synced', 'failed', 'deleted'
    last_error TEXT,
    retry_count INTEGER DEFAULT 0,
    meilisearch_id VARCHAR(100),                      -- ID in Meilisearch index
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id)
);

-- Table: search_log
-- Tracks user search queries for analytics
CREATE TABLE IF NOT EXISTS search_log (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    normalized_query TEXT,                            -- Lowercase, trimmed query
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    results_count INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    filters_used JSONB,                               -- Applied filters
    sort_used VARCHAR(50),
    page INTEGER DEFAULT 1,
    clicked_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    clicked_position INTEGER,                         -- Position in results where user clicked
    converted BOOLEAN DEFAULT FALSE,                  -- Did user add to cart/purchase?
    source VARCHAR(50) DEFAULT 'web',                 -- 'web', 'mobile', 'api'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: search_suggestion
-- Stores popular/suggested search terms
CREATE TABLE IF NOT EXISTS search_suggestion (
    id SERIAL PRIMARY KEY,
    term VARCHAR(255) NOT NULL,
    normalized_term VARCHAR(255) NOT NULL,
    search_count INTEGER DEFAULT 1,
    click_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_promoted BOOLEAN DEFAULT FALSE,                -- Manually promoted suggestions
    is_blocked BOOLEAN DEFAULT FALSE,                 -- Blocked/inappropriate terms
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(normalized_term)
);

-- Table: search_analytics_daily
-- Aggregated daily search analytics
CREATE TABLE IF NOT EXISTS search_analytics_daily (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    total_searches INTEGER DEFAULT 0,
    unique_queries INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    zero_result_searches INTEGER DEFAULT 0,
    avg_processing_time_ms DECIMAL(10,2),
    total_clicks INTEGER DEFAULT 0,
    click_through_rate DECIMAL(5,4),                  -- CTR as decimal (e.g., 0.1234 = 12.34%)
    conversion_rate DECIMAL(5,4),
    top_queries JSONB,                                -- Top 10 queries for the day
    top_zero_result_queries JSONB,                    -- Top queries with no results
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- Table: meilisearch_config
-- Stores Meilisearch configuration and settings
CREATE TABLE IF NOT EXISTS meilisearch_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(key)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON meilisearch_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_sync_log_created ON meilisearch_sync_log(created_at);
CREATE INDEX IF NOT EXISTS idx_product_sync_product ON meilisearch_product_sync(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sync_status ON meilisearch_product_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_search_log_query ON search_log(normalized_query);
CREATE INDEX IF NOT EXISTS idx_search_log_user ON search_log(user_id);
CREATE INDEX IF NOT EXISTS idx_search_log_created ON search_log(created_at);
CREATE INDEX IF NOT EXISTS idx_search_log_session ON search_log(session_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_term ON search_suggestion(normalized_term);
CREATE INDEX IF NOT EXISTS idx_suggestion_count ON search_suggestion(search_count DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON search_analytics_daily(date);

-- Insert default configuration
INSERT INTO meilisearch_config (key, value, description) VALUES
    ('index_settings', '{"primaryKey": "id", "searchableAttributes": ["name", "description", "category_name", "brand_name", "sku"], "filterableAttributes": ["category_id", "brand_id", "price", "is_active", "stock_quantity"], "sortableAttributes": ["price", "name", "created_at"]}', 'Default Meilisearch index settings'),
    ('sync_settings', '{"batch_size": 1000, "auto_sync_enabled": true, "sync_interval_minutes": 30}', 'Product sync configuration'),
    ('search_settings', '{"default_limit": 20, "max_limit": 100, "typo_tolerance": true, "min_word_length_for_typo": 4}', 'Search behavior settings')
ON CONFLICT (key) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_meilisearch_sync_log_updated_at ON meilisearch_sync_log;
CREATE TRIGGER update_meilisearch_sync_log_updated_at
    BEFORE UPDATE ON meilisearch_sync_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meilisearch_product_sync_updated_at ON meilisearch_product_sync;
CREATE TRIGGER update_meilisearch_product_sync_updated_at
    BEFORE UPDATE ON meilisearch_product_sync
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_search_suggestion_updated_at ON search_suggestion;
CREATE TRIGGER update_search_suggestion_updated_at
    BEFORE UPDATE ON search_suggestion
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meilisearch_config_updated_at ON meilisearch_config;
CREATE TRIGGER update_meilisearch_config_updated_at
    BEFORE UPDATE ON meilisearch_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Meilisearch tables created successfully!';
    RAISE NOTICE 'Tables created: meilisearch_sync_log, meilisearch_product_sync, search_log, search_suggestion, search_analytics_daily, meilisearch_config';
END $$;
