-- Schema-aware index creation script.
-- Edit p_schema below if your tables live in a different schema (e.g. a Neon branch schema).

DO
$$
DECLARE
    p_schema text := 'public';  -- <-- change this if your tables are in another schema
    products_exists boolean;
    product_images_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = p_schema AND table_name = 'products'
    ) INTO products_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = p_schema AND table_name = 'product_images'
    ) INTO product_images_exists;

    IF NOT products_exists THEN
        RAISE NOTICE 'Table % does not exist in schema % - no indexes created for products.', 'products', p_schema;
    ELSE
        RAISE NOTICE 'Creating indexes on %.% ...', p_schema, 'products';

        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_category_id ON %I.%I (category_id)', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_brand_id ON %I.%I (brand_id)', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_price ON %I.%I (price)', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_discount ON %I.%I (discount_percentage DESC NULLS LAST)', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_created_at ON %I.%I (created_at DESC)', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_is_active ON %I.%I (is_active)', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_is_visible ON %I.%I (is_visible)', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_slug ON %I.%I (slug)', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_sort_order ON %I.%I (sort_order)', p_schema, 'products');

        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_is_featured ON %I.%I (id) WHERE is_featured = true', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_is_new ON %I.%I (id) WHERE is_new = true', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_is_sale ON %I.%I (id) WHERE is_sale = true', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_is_flash_sale ON %I.%I (id) WHERE is_flash_sale = true', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_is_luxury_deal ON %I.%I (id) WHERE is_luxury_deal = true', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_is_trending ON %I.%I (id) WHERE is_trending = true', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_is_top_pick ON %I.%I (id) WHERE is_top_pick = true', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_is_daily_find ON %I.%I (id) WHERE is_daily_find = true', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_is_new_arrival ON %I.%I (id) WHERE is_new_arrival = true', p_schema, 'products');

        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_active_visible ON %I.%I (is_active, is_visible)', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_flash_sale_discount ON %I.%I (is_flash_sale, discount_percentage DESC NULLS LAST) WHERE is_active = true AND is_visible = true', p_schema, 'products');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_luxury_created ON %I.%I (is_luxury_deal, created_at DESC) WHERE is_active = true AND is_visible = true', p_schema, 'products');

        -- Update statistics for the products table
        EXECUTE format('ANALYZE %I.%I', p_schema, 'products');
        RAISE NOTICE 'Indexes created and ANALYZE run on %.%', p_schema, 'products';
    END IF;

    IF NOT product_images_exists THEN
        RAISE NOTICE 'Table % does not exist in schema % - skipping product_images indexes.', 'product_images', p_schema;
    ELSE
        RAISE NOTICE 'Creating indexes on %.% ...', p_schema, 'product_images';
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON %I.%I (product_id)', p_schema, 'product_images');
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON %I.%I (product_id, is_primary DESC)', p_schema, 'product_images');
        RAISE NOTICE 'Indexes created on %.%', p_schema, 'product_images';
    END IF;
END
$$;
