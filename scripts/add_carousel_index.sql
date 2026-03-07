-- Optimize carousel queries with composite index on Neon
-- Run this directly in Neon console: psql $DATABASE_URL < scripts/add_carousel_index.sql

-- Create composite index for homepage carousel filtering and sorting
-- Covers: WHERE is_active = true AND position = 'homepage' ORDER BY sort_order ASC
CREATE INDEX IF NOT EXISTS idx_carousel_homepage 
ON carousel_banners (is_active, position, sort_order) 
WHERE is_active = true;

-- Verify index was created
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename = 'carousel_banners' 
ORDER BY indexname;
