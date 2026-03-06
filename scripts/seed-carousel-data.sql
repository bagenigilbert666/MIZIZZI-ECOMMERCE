-- Comprehensive script to populate carousel, premium experience, and product showcase data with images

-- 1. Insert carousel items if they don't exist
INSERT INTO carousel_items (title, description, image_url, cta_text, cta_link, is_active, created_at, updated_at)
SELECT 'Featured Premium Products', 'Discover our exclusive collection', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&h=600&fit=crop', 'Shop Now', '/products', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM carousel_items WHERE title = 'Featured Premium Products')
UNION ALL
SELECT 'New Arrivals', 'Latest items in stock', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=600&fit=crop', 'Explore', '/products?filter=new', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM carousel_items WHERE title = 'New Arrivals')
UNION ALL
SELECT 'Flash Sale', 'Limited time offers', 'https://images.unsplash.com/photo-1556821552-7f41c5d440db?w=1200&h=600&fit=crop', 'Browse', '/products?filter=sale', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM carousel_items WHERE title = 'Flash Sale');

-- 2. Insert premium experience items
INSERT INTO premium_experience_items (title, metric, description, icon_name, image, gradient, is_active, created_at, updated_at)
SELECT 'Premium Membership', '98.7%', 'Satisfaction Rate', 'Crown', 'https://images.unsplash.com/photo-1566894476415-e0f2eb3e6e87?w=400&h=400&fit=crop', 'from-amber-500 to-orange-600', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM premium_experience_items WHERE title = 'Premium Membership')
UNION ALL
SELECT 'Exclusive Deals', '50+', 'New Deals Daily', 'Gem', 'https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=400&fit=crop', 'from-rose-500 to-pink-600', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM premium_experience_items WHERE title = 'Exclusive Deals')
UNION ALL
SELECT 'Priority Support', '24/7', 'Always Available', 'Award', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop', 'from-blue-500 to-cyan-600', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM premium_experience_items WHERE title = 'Priority Support');

-- 3. Insert product showcase items
INSERT INTO product_showcase_items (title, metric, description, icon_name, image, gradient, is_active, created_at, updated_at)
SELECT 'New Arrivals', '50+', 'Premium quality products', 'Gem', 'https://images.unsplash.com/photo-1512090977280-6a345bb3c658?w=400&h=400&fit=crop', 'from-rose-500 to-pink-600', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_showcase_items WHERE title = 'New Arrivals')
UNION ALL
SELECT 'Best Sellers', '98.7%', 'Customer satisfaction rate', 'Award', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', 'from-amber-500 to-orange-600', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_showcase_items WHERE title = 'Best Sellers');

-- Verify the data was inserted
SELECT 'Carousel Items' as entity, COUNT(*) as count FROM carousel_items
UNION ALL
SELECT 'Premium Experiences' as entity, COUNT(*) as count FROM premium_experience_items
UNION ALL
SELECT 'Product Showcase Items' as entity, COUNT(*) as count FROM product_showcase_items;
