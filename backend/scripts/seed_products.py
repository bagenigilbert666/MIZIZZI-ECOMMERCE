import sys
import os
import logging
import json
import random
from datetime import datetime
from slugify import slugify

# Resolve and add the correct backend folder to Python path so `import app` works
script_dir = os.path.dirname(os.path.abspath(__file__))
candidates = [
    os.path.abspath(os.path.join(script_dir, '..')),            # backend
    os.path.abspath(os.path.join(script_dir, '..', '..')),      # project root (if script nested deeper)
    os.path.abspath(os.path.join(script_dir, '..', 'backend')), # backend/backend (legacy attempt kept)
]

added_path = None
for p in candidates:
    if os.path.isdir(os.path.join(p, 'app')):
        sys.path.insert(0, p)
        added_path = p
        break

if not added_path:
    # Fallback: add parent dir (backend). This may still be correct in most setups.
    fallback = os.path.abspath(os.path.join(script_dir, '..'))
    sys.path.insert(0, fallback)
    added_path = fallback

logging.getLogger(__name__).info(f"Added to PYTHONPATH for script: {added_path}")

from app import create_app
from app.configuration.extensions import db
from app.models.models import Product, Category, Brand, ProductVariant, ProductImage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_products():
    """Seed the database with a comprehensive set of products across all categories."""
    app = create_app()
    
    with app.app_context():
        logger.info("Starting comprehensive product seed...")

        # 1. Ensure Categories Exist
        categories_data = [
            {
                "name": "Electronics", 
                "slug": "electronics", 
                "description": "Gadgets and devices",
                "image_url": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80"
            },
            {
                "name": "Fashion", 
                "slug": "fashion", 
                "description": "Clothing and accessories",
                "image_url": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80"
            },
            {
                "name": "Home & Living", 
                "slug": "home-living", 
                "description": "Furniture and decor",
                "image_url": "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=800&q=80"
            },
            {
                "name": "Beauty", 
                "slug": "beauty", 
                "description": "Skincare and makeup",
                "image_url": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80"
            },
            {
                "name": "Sports", 
                "slug": "sports", 
                "description": "Athletic gear and equipment",
                "image_url": "https://images.unsplash.com/photo-1461896836934-bbe879a771e8?w=800&q=80"
            }
        ]

        category_map = {}  # name -> id

        for cat_data in categories_data:
            category = Category.query.filter_by(slug=cat_data['slug']).first()
            if not category:
                logger.info(f"Creating category: {cat_data['name']}")
                category = Category(
                    name=cat_data['name'],
                    slug=cat_data['slug'],
                    description=cat_data['description'],
                    image_url=cat_data.get('image_url'),
                    is_active=True
                )
                db.session.add(category)
                db.session.commit()
            category_map[cat_data['name']] = category.id

        # 2. Ensure Brands Exist
        brands_data = [
            {"name": "TechGiant", "slug": "techgiant", "description": "Leading tech innovation"},
            {"name": "StyleCo", "slug": "styleco", "description": "Modern fashion for everyone"},
            {"name": "HomeLux", "slug": "homelux", "description": "Luxury home furnishings"},
            {"name": "SportX", "slug": "sportx", "description": "Performance sports gear"},
            {"name": "GlowUp", "slug": "glowup", "description": "Premium beauty products"},
            {"name": "UrbanWear", "slug": "urbanwear", "description": "Street style fashion"},
            {"name": "FitPro", "slug": "fitpro", "description": "Professional fitness equipment"},
            {"name": "SoundMax", "slug": "soundmax", "description": "Audio excellence"},
            {"name": "CozyHome", "slug": "cozyhome", "description": "Comfort for your home"},
            {"name": "NaturalBeauty", "slug": "naturalbeauty", "description": "Organic beauty solutions"}
        ]
        
        brand_map = {}  # name -> id

        for brand_data in brands_data:
            brand = Brand.query.filter_by(slug=brand_data['slug']).first()
            if not brand:
                logger.info(f"Creating brand: {brand_data['name']}")
                brand = Brand(
                    name=brand_data['name'],
                    slug=brand_data['slug'],
                    description=brand_data.get('description', ''),
                    is_active=True
                )
                db.session.add(brand)
                db.session.commit()
            brand_map[brand_data['name']] = brand.id

        # 3. Comprehensive Products Data
        products_data = [
            # ==================== ELECTRONICS ====================
            {
                "name": "Wireless Noise-Canceling Headphones",
                "category": "Electronics",
                "brand": "SoundMax",
                "price": 299.99,
                "sale_price": 249.99,
                "is_trending": True,
                "is_top_pick": True,
                "is_sale": True,
                "discount_percentage": 17,
                "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
                "description": "Experience premium sound quality with active noise cancellation. Features 30-hour battery life, Bluetooth 5.0, and premium memory foam ear cushions.",
                "short_description": "Premium ANC headphones with 30hr battery",
                "variants": [
                    {"color": "Black", "size": "One Size", "stock": 50},
                    {"color": "White", "size": "One Size", "stock": 35},
                    {"color": "Rose Gold", "size": "One Size", "stock": 25}
                ]
            },
            {
                "name": "Smart Fitness Watch Pro",
                "category": "Electronics",
                "brand": "TechGiant",
                "price": 199.99,
                "is_trending": True,
                "is_new_arrival": True,
                "image_url": "https://images.unsplash.com/photo-1523275371510-ae2700b9179e?w=800&q=80",
                "description": "Track your workouts and health metrics with precision. Features heart rate monitoring, GPS, sleep tracking, and 7-day battery life.",
                "short_description": "Advanced fitness tracking smartwatch",
                "variants": [
                    {"color": "Black", "size": "42mm", "stock": 40},
                    {"color": "Silver", "size": "42mm", "stock": 30},
                    {"color": "Black", "size": "46mm", "stock": 35},
                    {"color": "Silver", "size": "46mm", "stock": 25}
                ]
            },
            {
                "name": "4K Ultra HD Smart TV 55\"",
                "category": "Electronics",
                "brand": "TechGiant",
                "price": 699.99,
                "sale_price": 599.99,
                "is_featured": True,
                "is_sale": True,
                "discount_percentage": 14,
                "image_url": "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80",
                "description": "Cinematic experience right in your living room. Features 4K HDR, Dolby Vision, built-in streaming apps, and voice control.",
                "short_description": "55 inch 4K Smart TV with HDR"
            },
            {
                "name": "Wireless Bluetooth Earbuds",
                "category": "Electronics",
                "brand": "SoundMax",
                "price": 149.99,
                "sale_price": 119.99,
                "is_trending": True,
                "is_daily_find": True,
                "is_sale": True,
                "discount_percentage": 20,
                "image_url": "https://images.unsplash.com/photo-1590658165737-15a047b7c0b0?w=800&q=80",
                "description": "True wireless earbuds with premium sound quality. Features active noise cancellation, 24-hour total battery life, and IPX4 water resistance.",
                "short_description": "True wireless ANC earbuds",
                "variants": [
                    {"color": "Black", "size": "One Size", "stock": 100},
                    {"color": "White", "size": "One Size", "stock": 80},
                    {"color": "Navy Blue", "size": "One Size", "stock": 40}
                ]
            },
            {
                "name": "Professional Laptop Stand",
                "category": "Electronics",
                "brand": "TechGiant",
                "price": 79.99,
                "is_daily_find": True,
                "image_url": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80",
                "description": "Ergonomic aluminum laptop stand for improved posture. Adjustable height, foldable design, compatible with all laptops up to 17 inches.",
                "short_description": "Ergonomic adjustable laptop stand"
            },
            {
                "name": "Mechanical Gaming Keyboard",
                "category": "Electronics",
                "brand": "TechGiant",
                "price": 129.99,
                "is_trending": True,
                "is_new_arrival": True,
                "image_url": "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800&q=80",
                "description": "RGB mechanical keyboard with Cherry MX switches. Features programmable keys, N-key rollover, and detachable wrist rest.",
                "short_description": "RGB mechanical gaming keyboard",
                "variants": [
                    {"color": "Black", "size": "Full Size", "stock": 45},
                    {"color": "White", "size": "Full Size", "stock": 30},
                    {"color": "Black", "size": "TKL", "stock": 35}
                ]
            },
            {
                "name": "Portable Power Bank 20000mAh",
                "category": "Electronics",
                "brand": "TechGiant",
                "price": 49.99,
                "sale_price": 39.99,
                "is_daily_find": True,
                "is_sale": True,
                "discount_percentage": 20,
                "image_url": "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&q=80",
                "description": "High-capacity portable charger with fast charging support. Features USB-C PD, dual USB-A ports, and LED battery indicator.",
                "short_description": "20000mAh fast charging power bank"
            },
            {
                "name": "Wireless Gaming Mouse",
                "category": "Electronics",
                "brand": "TechGiant",
                "price": 89.99,
                "is_trending": True,
                "image_url": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80",
                "description": "Ultra-lightweight wireless gaming mouse with 25K DPI sensor. Features 70-hour battery life, RGB lighting, and programmable buttons.",
                "short_description": "Wireless gaming mouse 25K DPI",
                "variants": [
                    {"color": "Black", "size": "One Size", "stock": 60},
                    {"color": "White", "size": "One Size", "stock": 40}
                ]
            },
            {
                "name": "Smart Home Speaker",
                "category": "Electronics",
                "brand": "SoundMax",
                "price": 99.99,
                "is_top_pick": True,
                "image_url": "https://images.unsplash.com/photo-1543512214-318c7553f230?w=800&q=80",
                "description": "Voice-controlled smart speaker with premium sound. Features multi-room audio, smart home control, and built-in voice assistant.",
                "short_description": "Voice-controlled smart speaker"
            },
            {
                "name": "USB-C Hub 7-in-1",
                "category": "Electronics",
                "brand": "TechGiant",
                "price": 59.99,
                "is_daily_find": True,
                "image_url": "https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=800&q=80",
                "description": "Expand your laptop connectivity with this premium USB-C hub. Features HDMI 4K, USB-A ports, SD card reader, and PD charging.",
                "short_description": "7-in-1 USB-C hub adapter"
            },
            
            # ==================== FASHION ====================
            {
                "name": "Designer Denim Jacket",
                "category": "Fashion",
                "brand": "StyleCo",
                "price": 89.99,
                "sale_price": 69.99,
                "is_trending": True,
                "is_sale": True,
                "discount_percentage": 22,
                "image_url": "https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?w=800&q=80",
                "description": "Classic denim jacket with a modern twist. Made from premium cotton denim with vintage wash finish.",
                "short_description": "Premium vintage wash denim jacket",
                "variants": [
                    {"color": "Blue", "size": "S", "stock": 20},
                    {"color": "Blue", "size": "M", "stock": 35},
                    {"color": "Blue", "size": "L", "stock": 30},
                    {"color": "Blue", "size": "XL", "stock": 15},
                    {"color": "Black", "size": "S", "stock": 15},
                    {"color": "Black", "size": "M", "stock": 25},
                    {"color": "Black", "size": "L", "stock": 20},
                    {"color": "Black", "size": "XL", "stock": 10}
                ]
            },
            {
                "name": "Premium Leather Handbag",
                "category": "Fashion",
                "brand": "StyleCo",
                "price": 159.99,
                "is_top_pick": True,
                "is_featured": True,
                "image_url": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80",
                "description": "Handcrafted genuine leather handbag perfect for daily use. Features multiple compartments and adjustable shoulder strap.",
                "short_description": "Genuine leather everyday handbag",
                "variants": [
                    {"color": "Brown", "size": "One Size", "stock": 25},
                    {"color": "Black", "size": "One Size", "stock": 30},
                    {"color": "Tan", "size": "One Size", "stock": 20}
                ]
            },
            {
                "name": "Classic White Sneakers",
                "category": "Fashion",
                "brand": "UrbanWear",
                "price": 79.99,
                "is_trending": True,
                "is_new_arrival": True,
                "image_url": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80",
                "description": "Minimalist white leather sneakers with cushioned insole. Perfect for everyday wear with any outfit.",
                "short_description": "Classic white leather sneakers",
                "variants": [
                    {"color": "White", "size": "7", "stock": 15},
                    {"color": "White", "size": "8", "stock": 25},
                    {"color": "White", "size": "9", "stock": 30},
                    {"color": "White", "size": "10", "stock": 25},
                    {"color": "White", "size": "11", "stock": 15},
                    {"color": "White", "size": "12", "stock": 10}
                ]
            },
            {
                "name": "Cashmere Sweater",
                "category": "Fashion",
                "brand": "StyleCo",
                "price": 149.99,
                "sale_price": 119.99,
                "is_top_pick": True,
                "is_sale": True,
                "discount_percentage": 20,
                "image_url": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80",
                "description": "Luxuriously soft 100% cashmere sweater. Features ribbed cuffs and hem, crew neck design.",
                "short_description": "100% cashmere crew neck sweater",
                "variants": [
                    {"color": "Cream", "size": "S", "stock": 15},
                    {"color": "Cream", "size": "M", "stock": 20},
                    {"color": "Cream", "size": "L", "stock": 15},
                    {"color": "Navy", "size": "S", "stock": 12},
                    {"color": "Navy", "size": "M", "stock": 18},
                    {"color": "Navy", "size": "L", "stock": 14},
                    {"color": "Burgundy", "size": "M", "stock": 10}
                ]
            },
            {
                "name": "Slim Fit Chino Pants",
                "category": "Fashion",
                "brand": "UrbanWear",
                "price": 59.99,
                "is_daily_find": True,
                "image_url": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80",
                "description": "Classic slim fit chinos made from stretch cotton. Comfortable for all-day wear with a modern silhouette.",
                "short_description": "Stretch cotton slim fit chinos",
                "variants": [
                    {"color": "Khaki", "size": "30", "stock": 20},
                    {"color": "Khaki", "size": "32", "stock": 30},
                    {"color": "Khaki", "size": "34", "stock": 25},
                    {"color": "Navy", "size": "30", "stock": 18},
                    {"color": "Navy", "size": "32", "stock": 28},
                    {"color": "Navy", "size": "34", "stock": 22},
                    {"color": "Olive", "size": "32", "stock": 15}
                ]
            },
            {
                "name": "Silk Scarf Collection",
                "category": "Fashion",
                "brand": "StyleCo",
                "price": 45.99,
                "is_new_arrival": True,
                "image_url": "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80",
                "description": "Luxurious 100% silk scarf with designer print. Versatile accessory for any season.",
                "short_description": "Designer print silk scarf",
                "variants": [
                    {"color": "Floral", "size": "One Size", "stock": 30},
                    {"color": "Geometric", "size": "One Size", "stock": 25},
                    {"color": "Abstract", "size": "One Size", "stock": 20}
                ]
            },
            {
                "name": "Oversized Sunglasses",
                "category": "Fashion",
                "brand": "StyleCo",
                "price": 129.99,
                "is_trending": True,
                "image_url": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80",
                "description": "Designer oversized sunglasses with UV400 protection. Features acetate frame and polarized lenses.",
                "short_description": "Designer oversized polarized sunglasses",
                "variants": [
                    {"color": "Black", "size": "One Size", "stock": 40},
                    {"color": "Tortoise", "size": "One Size", "stock": 35},
                    {"color": "Brown", "size": "One Size", "stock": 25}
                ]
            },
            {
                "name": "Leather Belt",
                "category": "Fashion",
                "brand": "UrbanWear",
                "price": 49.99,
                "is_daily_find": True,
                "image_url": "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80",
                "description": "Genuine leather belt with brushed metal buckle. Classic design suitable for casual and formal wear.",
                "short_description": "Genuine leather belt",
                "variants": [
                    {"color": "Brown", "size": "32", "stock": 20},
                    {"color": "Brown", "size": "34", "stock": 25},
                    {"color": "Brown", "size": "36", "stock": 20},
                    {"color": "Black", "size": "32", "stock": 18},
                    {"color": "Black", "size": "34", "stock": 22},
                    {"color": "Black", "size": "36", "stock": 18}
                ]
            },
            {
                "name": "Linen Button-Down Shirt",
                "category": "Fashion",
                "brand": "UrbanWear",
                "price": 69.99,
                "is_new_arrival": True,
                "image_url": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80",
                "description": "Breathable 100% linen shirt perfect for warm weather. Features relaxed fit and mother-of-pearl buttons.",
                "short_description": "100% linen relaxed fit shirt",
                "variants": [
                    {"color": "White", "size": "S", "stock": 15},
                    {"color": "White", "size": "M", "stock": 25},
                    {"color": "White", "size": "L", "stock": 20},
                    {"color": "Light Blue", "size": "S", "stock": 12},
                    {"color": "Light Blue", "size": "M", "stock": 20},
                    {"color": "Light Blue", "size": "L", "stock": 16}
                ]
            },
            {
                "name": "Canvas Tote Bag",
                "category": "Fashion",
                "brand": "UrbanWear",
                "price": 35.99,
                "is_daily_find": True,
                "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80",
                "description": "Durable canvas tote bag with leather handles. Spacious interior with internal pocket.",
                "short_description": "Canvas tote with leather handles",
                "variants": [
                    {"color": "Natural", "size": "One Size", "stock": 50},
                    {"color": "Navy", "size": "One Size", "stock": 40},
                    {"color": "Black", "size": "One Size", "stock": 35}
                ]
            },
            
            # ==================== HOME & LIVING ====================
            {
                "name": "Ergonomic Office Chair",
                "category": "Home & Living",
                "brand": "HomeLux",
                "price": 349.99,
                "sale_price": 299.99,
                "is_top_pick": True,
                "is_featured": True,
                "is_sale": True,
                "discount_percentage": 14,
                "image_url": "https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=800&q=80",
                "description": "Work in comfort with this fully adjustable ergonomic chair. Features lumbar support, adjustable armrests, and breathable mesh back.",
                "short_description": "Fully adjustable ergonomic mesh chair",
                "variants": [
                    {"color": "Black", "size": "One Size", "stock": 25},
                    {"color": "Grey", "size": "One Size", "stock": 20}
                ]
            },
            {
                "name": "Modern Floor Lamp",
                "category": "Home & Living",
                "brand": "HomeLux",
                "price": 129.99,
                "is_trending": True,
                "image_url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80",
                "description": "Minimalist modern floor lamp with adjustable height. Features dimmable LED light and matte metal finish.",
                "short_description": "Adjustable dimmable LED floor lamp",
                "variants": [
                    {"color": "Black", "size": "One Size", "stock": 30},
                    {"color": "Brass", "size": "One Size", "stock": 25},
                    {"color": "White", "size": "One Size", "stock": 20}
                ]
            },
            {
                "name": "Luxury Throw Blanket",
                "category": "Home & Living",
                "brand": "CozyHome",
                "price": 79.99,
                "is_daily_find": True,
                "image_url": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
                "description": "Ultra-soft faux fur throw blanket. Perfect for adding warmth and texture to any room.",
                "short_description": "Ultra-soft faux fur throw blanket",
                "variants": [
                    {"color": "Cream", "size": "50x60", "stock": 35},
                    {"color": "Grey", "size": "50x60", "stock": 30},
                    {"color": "Blush", "size": "50x60", "stock": 25}
                ]
            },
            {
                "name": "Ceramic Vase Set",
                "category": "Home & Living",
                "brand": "HomeLux",
                "price": 59.99,
                "is_new_arrival": True,
                "image_url": "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=800&q=80",
                "description": "Set of 3 handcrafted ceramic vases in varying heights. Modern minimalist design perfect for dried or fresh flowers.",
                "short_description": "Set of 3 minimalist ceramic vases"
            },
            {
                "name": "Memory Foam Pillow",
                "category": "Home & Living",
                "brand": "CozyHome",
                "price": 49.99,
                "sale_price": 39.99,
                "is_top_pick": True,
                "is_sale": True,
                "discount_percentage": 20,
                "image_url": "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80",
                "description": "Contoured memory foam pillow for optimal neck support. Hypoallergenic cover included.",
                "short_description": "Contoured memory foam neck pillow",
                "variants": [
                    {"color": "White", "size": "Standard", "stock": 60},
                    {"color": "White", "size": "King", "stock": 40}
                ]
            },
            {
                "name": "Bamboo Shelf Unit",
                "category": "Home & Living",
                "brand": "HomeLux",
                "price": 149.99,
                "is_trending": True,
                "image_url": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
                "description": "5-tier bamboo shelf unit for versatile storage. Eco-friendly and sturdy construction.",
                "short_description": "5-tier eco-friendly bamboo shelf"
            },
            {
                "name": "Aromatherapy Diffuser",
                "category": "Home & Living",
                "brand": "CozyHome",
                "price": 39.99,
                "is_daily_find": True,
                "image_url": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80",
                "description": "Ultrasonic essential oil diffuser with color-changing LED lights. Auto shut-off feature and whisper-quiet operation.",
                "short_description": "LED aromatherapy essential oil diffuser",
                "variants": [
                    {"color": "Wood Grain", "size": "One Size", "stock": 45},
                    {"color": "White", "size": "One Size", "stock": 40}
                ]
            },
            {
                "name": "Cotton Duvet Cover Set",
                "category": "Home & Living",
                "brand": "CozyHome",
                "price": 89.99,
                "is_featured": True,
                "image_url": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80",
                "description": "100% organic cotton duvet cover set including 2 pillowcases. OEKO-TEX certified, 300 thread count.",
                "short_description": "Organic cotton duvet cover set",
                "variants": [
                    {"color": "White", "size": "Queen", "stock": 25},
                    {"color": "White", "size": "King", "stock": 20},
                    {"color": "Grey", "size": "Queen", "stock": 22},
                    {"color": "Grey", "size": "King", "stock": 18}
                ]
            },
            {
                "name": "Decorative Wall Mirror",
                "category": "Home & Living",
                "brand": "HomeLux",
                "price": 119.99,
                "is_new_arrival": True,
                "image_url": "https://images.unsplash.com/photo-1618220179428-22790b461013?w=800&q=80",
                "description": "Round decorative wall mirror with gold metal frame. 24-inch diameter, perfect for entryways or living rooms.",
                "short_description": "Round gold frame decorative mirror"
            },
            {
                "name": "Scented Candle Collection",
                "category": "Home & Living",
                "brand": "CozyHome",
                "price": 34.99,
                "is_daily_find": True,
                "image_url": "https://images.unsplash.com/photo-1602607688529-08938a0a8e73?w=800&q=80",
                "description": "Set of 3 soy wax scented candles. Hand-poured with natural essential oils. 45-hour burn time each.",
                "short_description": "Set of 3 soy wax scented candles",
                "variants": [
                    {"color": "Lavender Set", "size": "One Size", "stock": 40},
                    {"color": "Vanilla Set", "size": "One Size", "stock": 35},
                    {"color": "Fresh Linen Set", "size": "One Size", "stock": 30}
                ]
            },
            
            # ==================== BEAUTY ====================
            {
                "name": "Organic Face Serum",
                "category": "Beauty",
                "brand": "NaturalBeauty",
                "price": 45.00,
                "is_trending": True,
                "is_top_pick": True,
                "image_url": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80",
                "description": "Rejuvenate your skin with our organic vitamin C serum. Contains hyaluronic acid and botanical extracts for radiant skin.",
                "short_description": "Organic vitamin C face serum"
            },
            {
                "name": "Hydrating Face Moisturizer",
                "category": "Beauty",
                "brand": "GlowUp",
                "price": 38.99,
                "is_daily_find": True,
                "image_url": "https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?w=800&q=80",
                "description": "Lightweight daily moisturizer with SPF 30. Non-greasy formula suitable for all skin types.",
                "short_description": "Daily moisturizer with SPF 30"
            },
            {
                "name": "Luxury Lipstick Set",
                "category": "Beauty",
                "brand": "GlowUp",
                "price": 59.99,
                "sale_price": 49.99,
                "is_trending": True,
                "is_sale": True,
                "discount_percentage": 17,
                "image_url": "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=80",
                "description": "Set of 5 creamy matte lipsticks in versatile shades. Long-wearing formula with nourishing ingredients.",
                "short_description": "5-piece matte lipstick collection"
            },
            {
                "name": "Professional Makeup Brush Set",
                "category": "Beauty",
                "brand": "GlowUp",
                "price": 79.99,
                "is_top_pick": True,
                "image_url": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80",
                "description": "12-piece professional makeup brush set with vegan bristles. Includes face and eye brushes with travel case.",
                "short_description": "12-piece vegan makeup brush set"
            },
            {
                "name": "Rose Gold Hair Dryer",
                "category": "Beauty",
                "brand": "GlowUp",
                "price": 149.99,
                "sale_price": 129.99,
                "is_new_arrival": True,
                "is_sale": True,
                "discount_percentage": 13,
                "image_url": "https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=800&q=80",
                "description": "Professional ionic hair dryer with tourmaline technology. 3 heat settings, cool shot button, and diffuser attachment.",
                "short_description": "Professional ionic hair dryer"
            },
            {
                "name": "Natural Body Lotion",
                "category": "Beauty",
                "brand": "NaturalBeauty",
                "price": 24.99,
                "is_daily_find": True,
                "image_url": "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&q=80",
                "description": "Nourishing body lotion with shea butter and coconut oil. Paraben-free and cruelty-free formula.",
                "short_description": "Shea butter nourishing body lotion",
                "variants": [
                    {"color": "Unscented", "size": "8oz", "stock": 50},
                    {"color": "Lavender", "size": "8oz", "stock": 40},
                    {"color": "Vanilla", "size": "8oz", "stock": 35}
                ]
            },
            {
                "name": "Anti-Aging Eye Cream",
                "category": "Beauty",
                "brand": "NaturalBeauty",
                "price": 52.00,
                "is_featured": True,
                "image_url": "https://images.unsplash.com/photo-1617897903246-719242758050?w=800&q=80",
                "description": "Peptide-rich eye cream to reduce fine lines and dark circles. Contains caffeine and vitamin E for refreshed eyes.",
                "short_description": "Peptide anti-aging eye cream"
            },
            {
                "name": "Exfoliating Face Scrub",
                "category": "Beauty",
                "brand": "NaturalBeauty",
                "price": 28.99,
                "is_new_arrival": True,
                "image_url": "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80",
                "description": "Gentle exfoliating scrub with natural walnut shell particles. Removes dead skin cells for smoother, brighter skin.",
                "short_description": "Natural walnut exfoliating scrub"
            },
            {
                "name": "Perfume Gift Set",
                "category": "Beauty",
                "brand": "GlowUp",
                "price": 89.99,
                "is_trending": True,
                "image_url": "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80",
                "description": "Luxurious perfume gift set with 4 signature scents. Travel-sized bottles perfect for discovering your favorite.",
                "short_description": "4-piece signature perfume set"
            },
            {
                "name": "Nail Polish Collection",
                "category": "Beauty",
                "brand": "GlowUp",
                "price": 32.99,
                "is_daily_find": True,
                "image_url": "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
                "description": "Set of 6 long-lasting nail polishes in trending colors. Chip-resistant formula with high-shine finish.",
                "short_description": "6-piece nail polish collection"
            },
            
            # ==================== SPORTS ====================
            {
                "name": "Premium Yoga Mat",
                "category": "Sports",
                "brand": "FitPro",
                "price": 49.99,
                "sale_price": 39.99,
                "is_trending": True,
                "is_daily_find": True,
                "is_sale": True,
                "discount_percentage": 20,
                "image_url": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80",
                "description": "Non-slip yoga mat with alignment guides. Extra thick for joint protection, eco-friendly TPE material.",
                "short_description": "Non-slip eco-friendly yoga mat",
                "variants": [
                    {"color": "Purple", "size": "One Size", "stock": 45},
                    {"color": "Blue", "size": "One Size", "stock": 40},
                    {"color": "Black", "size": "One Size", "stock": 35},
                    {"color": "Green", "size": "One Size", "stock": 30}
                ]
            },
            {
                "name": "Running Shoes Elite",
                "category": "Sports",
                "brand": "SportX",
                "price": 129.99,
                "is_trending": True,
                "is_top_pick": True,
                "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
                "description": "Lightweight running shoes for marathon runners. Features responsive cushioning and breathable mesh upper.",
                "short_description": "Lightweight marathon running shoes",
                "variants": [
                    {"color": "Black/White", "size": "8", "stock": 20},
                    {"color": "Black/White", "size": "9", "stock": 30},
                    {"color": "Black/White", "size": "10", "stock": 35},
                    {"color": "Black/White", "size": "11", "stock": 25},
                    {"color": "Red/Black", "size": "9", "stock": 15},
                    {"color": "Red/Black", "size": "10", "stock": 20}
                ]
            },
            {
                "name": "Adjustable Dumbbell Set",
                "category": "Sports",
                "brand": "FitPro",
                "price": 299.99,
                "sale_price": 249.99,
                "is_featured": True,
                "is_sale": True,
                "discount_percentage": 17,
                "image_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
                "description": "Adjustable dumbbell set from 5-52.5 lbs. Space-saving design replaces 15 sets of weights.",
                "short_description": "5-52.5 lb adjustable dumbbell set"
            },
            {
                "name": "Resistance Bands Set",
                "category": "Sports",
                "brand": "FitPro",
                "price": 29.99,
                "is_daily_find": True,
                "image_url": "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800&q=80",
                "description": "Set of 5 resistance bands with different strength levels. Includes door anchor, handles, and ankle straps.",
                "short_description": "5-piece resistance band set"
            },
            {
                "name": "Insulated Water Bottle",
                "category": "Sports",
                "brand": "SportX",
                "price": 34.99,
                "is_trending": True,
                "image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80",
                "description": "32oz double-wall insulated stainless steel water bottle. Keeps drinks cold for 24 hours or hot for 12 hours.",
                "short_description": "32oz insulated stainless steel bottle",
                "variants": [
                    {"color": "Black", "size": "32oz", "stock": 60},
                    {"color": "Navy", "size": "32oz", "stock": 45},
                    {"color": "White", "size": "32oz", "stock": 40},
                    {"color": "Rose Gold", "size": "32oz", "stock": 30}
                ]
            },
            {
                "name": "Fitness Tracker Band",
                "category": "Sports",
                "brand": "FitPro",
                "price": 79.99,
                "is_new_arrival": True,
                "image_url": "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&q=80",
                "description": "Slim fitness tracker with heart rate monitor, step counter, and sleep tracking. 7-day battery life.",
                "short_description": "Slim fitness tracker with HR monitor",
                "variants": [
                    {"color": "Black", "size": "S/M", "stock": 35},
                    {"color": "Black", "size": "L/XL", "stock": 30},
                    {"color": "Navy", "size": "S/M", "stock": 25},
                    {"color": "Navy", "size": "L/XL", "stock": 20}
                ]
            },
            {
                "name": "Gym Duffel Bag",
                "category": "Sports",
                "brand": "SportX",
                "price": 59.99,
                "is_top_pick": True,
                "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
                "description": "Spacious gym duffel bag with shoe compartment and wet pocket. Water-resistant material with padded straps.",
                "short_description": "Water-resistant gym duffel bag",
                "variants": [
                    {"color": "Black", "size": "One Size", "stock": 40},
                    {"color": "Grey", "size": "One Size", "stock": 35},
                    {"color": "Navy", "size": "One Size", "stock": 30}
                ]
            },
            {
                "name": "Compression Leggings",
                "category": "Sports",
                "brand": "FitPro",
                "price": 54.99,
                "is_trending": True,
                "image_url": "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&q=80",
                "description": "High-waisted compression leggings with pocket. Moisture-wicking fabric, squat-proof design.",
                "short_description": "High-waisted compression leggings",
                "variants": [
                    {"color": "Black", "size": "XS", "stock": 20},
                    {"color": "Black", "size": "S", "stock": 35},
                    {"color": "Black", "size": "M", "stock": 40},
                    {"color": "Black", "size": "L", "stock": 30},
                    {"color": "Navy", "size": "S", "stock": 25},
                    {"color": "Navy", "size": "M", "stock": 30}
                ]
            },
            {
                "name": "Jump Rope Speed Pro",
                "category": "Sports",
                "brand": "FitPro",
                "price": 19.99,
                "is_daily_find": True,
                "image_url": "https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=800&q=80",
                "description": "Weighted speed jump rope with ball bearings. Adjustable length, non-slip handles for cardio workouts.",
                "short_description": "Weighted speed jump rope"
            },
            {
                "name": "Foam Roller Set",
                "category": "Sports",
                "brand": "FitPro",
                "price": 39.99,
                "is_new_arrival": True,
                "image_url": "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
                "description": "Set includes foam roller, massage ball, and stretching strap. Perfect for muscle recovery and flexibility.",
                "short_description": "3-piece foam roller recovery set"
            }
        ]

        added_count = 0
        updated_count = 0
        variant_count = 0

        for p_data in products_data:
            slug = slugify(p_data['name'])
            product = Product.query.filter_by(slug=slug).first()
            
            # Prepare common fields
            image_urls = json.dumps([p_data['image_url']])
            
            if product:
                logger.info(f"Updating product: {p_data['name']}")
                product.description = p_data['description']
                product.short_description = p_data.get('short_description', p_data['description'][:100])
                product.is_trending = p_data.get('is_trending', False)
                product.is_top_pick = p_data.get('is_top_pick', False)
                product.is_daily_find = p_data.get('is_daily_find', False)
                product.is_new = p_data.get('is_new', False)
                product.is_new_arrival = p_data.get('is_new_arrival', False)
                product.is_featured = p_data.get('is_featured', False)
                product.is_sale = p_data.get('is_sale', False)
                product.price = p_data['price']
                product.sale_price = p_data.get('sale_price')
                product.discount_percentage = p_data.get('discount_percentage')
                product.image_urls = image_urls
                product.thumbnail_url = p_data['image_url']
                product.category_id = category_map.get(p_data['category'])
                product.brand_id = brand_map.get(p_data['brand'])
                updated_count += 1
            else:
                logger.info(f"Creating product: {p_data['name']}")
                sku = f"SKU-{slug[:10].upper()}-{random.randint(1000, 9999)}"
                product = Product(
                    name=p_data['name'],
                    slug=slug,
                    description=p_data['description'],
                    short_description=p_data.get('short_description', p_data['description'][:100]),
                    price=p_data['price'],
                    sale_price=p_data.get('sale_price'),
                    discount_percentage=p_data.get('discount_percentage'),
                    stock=100,
                    stock_quantity=100,
                    category_id=category_map.get(p_data['category']),
                    brand_id=brand_map.get(p_data['brand']),
                    image_urls=image_urls,
                    thumbnail_url=p_data['image_url'],
                    sku=sku,
                    is_active=True,
                    is_visible=True,
                    is_trending=p_data.get('is_trending', False),
                    is_top_pick=p_data.get('is_top_pick', False),
                    is_daily_find=p_data.get('is_daily_find', False),
                    is_new=p_data.get('is_new', False),
                    is_new_arrival=p_data.get('is_new_arrival', False),
                    is_featured=p_data.get('is_featured', False),
                    is_sale=p_data.get('is_sale', False)
                )
                db.session.add(product)
                db.session.flush()  # Get product ID for variants
                added_count += 1
            
            # Handle variants
            if 'variants' in p_data:
                # Remove existing variants for this product
                ProductVariant.query.filter_by(product_id=product.id).delete()
                
                total_stock = 0
                for var_data in p_data['variants']:
                    variant_sku = f"{product.sku}-{var_data.get('color', 'STD')[:3].upper()}-{var_data.get('size', 'OS')}"
                    variant = ProductVariant(
                        product_id=product.id,
                        color=var_data.get('color'),
                        size=var_data.get('size'),
                        price=p_data['price'],
                        sale_price=p_data.get('sale_price'),
                        stock=var_data.get('stock', 10),
                        sku=variant_sku,
                        image_url=p_data['image_url']
                    )
                    db.session.add(variant)
                    total_stock += var_data.get('stock', 10)
                    variant_count += 1
                
                # Update product stock to sum of variant stocks
                product.stock = total_stock
                product.stock_quantity = total_stock
        
        try:
            db.session.commit()
            logger.info(f"")
            logger.info(f"========================================")
            logger.info(f"SEED COMPLETE!")
            logger.info(f"========================================")
            logger.info(f"Products added: {added_count}")
            logger.info(f"Products updated: {updated_count}")
            logger.info(f"Variants created: {variant_count}")
            logger.info(f"Categories: {len(category_map)}")
            logger.info(f"Brands: {len(brand_map)}")
            logger.info(f"========================================")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error seeding products: {str(e)}")
            raise

if __name__ == "__main__":
    seed_products()
