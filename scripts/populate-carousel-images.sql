-- This script populates missing carousel, premium experience, and product showcase image URLs
-- Run this on the backend database to fix the image display issues

-- Update carousel items with placeholder/default images if missing
UPDATE carousel_items 
SET image_url = COALESCE(image_url, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&h=600&fit=crop')
WHERE image_url IS NULL OR image_url = '';

-- Update premium experience items with images
UPDATE premium_experience_items 
SET image = COALESCE(image, 'https://images.unsplash.com/photo-1556821552-7f41c5d440db?w=400&h=400&fit=crop')
WHERE image IS NULL OR image = '';

-- Update product showcase items with images  
UPDATE product_showcase_items
SET image = COALESCE(image, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop')
WHERE image IS NULL OR image = '';

-- Verify the updates
SELECT 
  'carousel_items' as table_name,
  COUNT(*) as total,
  SUM(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 ELSE 0 END) as with_images
FROM carousel_items
UNION ALL
SELECT 
  'premium_experience_items' as table_name,
  COUNT(*) as total,
  SUM(CASE WHEN image IS NOT NULL AND image != '' THEN 1 ELSE 0 END) as with_images
FROM premium_experience_items
UNION ALL
SELECT 
  'product_showcase_items' as table_name,
  COUNT(*) as total,
  SUM(CASE WHEN image IS NOT NULL AND image != '' THEN 1 ELSE 0 END) as with_images
FROM product_showcase_items;
