import sys
import os
from typing import Optional

# Make sure the backend package is importable when running this script from
# the backend/ folder.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Carousel items to seed - matches the original beautiful design
CAROUSEL_ITEMS = [
    {
        "title": "Discover Our Latest Collection",
        "description": "Explore the newest trends and exclusive designs for a limited time.",
        "image_url": "https://images.unsplash.com/photo-1556740738-b676540e7c8c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "button_text": "SHOP NEW ARRIVALS",
        "link_url": "/products",
        "badge_text": "NEW ARRIVALS",
        "discount": "30% OFF",
        "position": "homepage",
        "is_active": True,
        "order": 1,
    },
    {
        "title": "Unleash Your Style",
        "description": "Find unique pieces that reflect your personality and elevate your wardrobe.",
        "image_url": "https://images.unsplash.com/photo-1585487000160-6be74267207d?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "button_text": "EXPLORE FASHION",
        "link_url": "/products",
        "badge_text": "TRENDING",
        "discount": "40% OFF",
        "position": "homepage",
        "is_active": True,
        "order": 2,
    },
    {
        "title": "Timeless Elegance in Every Detail",
        "description": "Experience craftsmanship and quality that lasts a lifetime.",
        "image_url": "https://images.unsplash.com/photo-1523275371510-ae2700b9179e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "button_text": "VIEW COLLECTION",
        "link_url": "/products",
        "badge_text": "EXCLUSIVE",
        "discount": "25% OFF",
        "position": "homepage",
        "is_active": True,
        "order": 3,
    },
    {
        "title": "Step Up Your Game",
        "description": "Discover our range of high-performance athletic wear and footwear.",
        "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "button_text": "SHOP SPORTSWEAR",
        "link_url": "/products",
        "badge_text": "ATHLETIC",
        "discount": "35% OFF",
        "position": "homepage",
        "is_active": True,
        "order": 4,
    },
    {
        "title": "Indulge in Pure Luxury",
        "description": "Premium skincare and beauty products for a radiant you.",
        "image_url": "https://images.unsplash.com/photo-1596462502278-27ddab8a248d?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "button_text": "BEAUTY ESSENTIALS",
        "link_url": "/products",
        "badge_text": "LUXURY",
        "discount": "20% OFF",
        "position": "homepage",
        "is_active": True,
        "order": 5,
    },
    {
        "title": "Sophistication Redefined",
        "description": "Curated menswear collection for the modern gentleman.",
        "image_url": "https://images.unsplash.com/photo-1520006403209-5191927050b0?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "button_text": "MEN'S COLLECTION",
        "link_url": "/products",
        "badge_text": "GENTLEMAN",
        "discount": "30% OFF",
        "position": "homepage",
        "is_active": True,
        "order": 6,
    },
    {
        "title": "Empower Your Wardrobe",
        "description": "Chic and elegant designs for every woman.",
        "image_url": "https://images.unsplash.com/photo-1515886657613-9f3515b0c436?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "button_text": "WOMEN'S FASHION",
        "link_url": "/products",
        "badge_text": "ELEGANCE",
        "discount": "45% OFF",
        "position": "homepage",
        "is_active": True,
        "order": 7,
    },
    {
        "title": "Walk in Style",
        "description": "Premium footwear for comfort and fashion.",
        "image_url": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "button_text": "SHOP FOOTWEAR",
        "link_url": "/products",
        "badge_text": "FOOTWEAR",
        "discount": "20% OFF",
        "position": "homepage",
        "is_active": True,
        "order": 8,
    },
    {
        "title": "Innovate Your Life",
        "description": "Cutting-edge electronics and gadgets for the modern home.",
        "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "button_text": "TECH DEALS",
        "link_url": "/products",
        "badge_text": "INNOVATION",
        "discount": "15% OFF",
        "position": "homepage",
        "is_active": True,
        "order": 9,
    },
    {
        "title": "Transform Your Space",
        "description": "Stylish home decor and essentials for every room.",
        "image_url": "https://images.unsplash.com/photo-1556912167-f556f1f39f75?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "button_text": "HOME & LIVING",
        "link_url": "/products",
        "badge_text": "HOME",
        "discount": "25% OFF",
        "position": "homepage",
        "is_active": True,
        "order": 10,
    },
]
def seed_carousel_items():
    """Seed carousel items directly into the application's database.

    This avoids depending on an HTTP API endpoint that may not exist in this
    codebase. It mirrors what `init_carousel_database.py` does but uses the
    predefined `CAROUSEL_ITEMS` list.
    """
    from app import create_app
    from app.configuration.extensions import db
    from app.models.carousel_model import CarouselBanner

    app = create_app()

    print("[v0] Seeding carousel items into database via app context")

    success_count = 0
    skipped_count = 0
    with app.app_context():
        for idx, item in enumerate(CAROUSEL_ITEMS, 1):
            # Map fields from the script's payload to the model's fields
            banner_data = {
                'name': item.get('title') or item.get('badge_text') or f'banner-{idx}',
                'position': item.get('position', 'homepage'),
                'image_url': item.get('image_url'),
                'title': item.get('title'),
                'description': item.get('description'),
                'badge_text': item.get('badge_text'),
                'discount': item.get('discount'),
                'button_text': item.get('button_text'),
                'link_url': item.get('link_url'),
                'is_active': item.get('is_active', True),
                'sort_order': item.get('order', idx)
            }

            # Avoid duplicate by title + position
            exists = CarouselBanner.query.filter_by(title=banner_data['title'], position=banner_data['position']).first()
            if exists:
                print(f"[v0] → Skipping existing banner: {banner_data['title']} ({banner_data['position']})")
                skipped_count += 1
                continue

            try:
                banner = CarouselBanner(**banner_data)
                db.session.add(banner)
                db.session.commit()
                print(f"[v0] ✓ Seeded item {idx}/{len(CAROUSEL_ITEMS)}: {banner.title}")
                success_count += 1
            except Exception as e:
                db.session.rollback()
                print(f"[v0] ✗ Error seeding item {idx}: {banner_data['title']} - {e}")

    print(f"\n[v0] Seeding complete: {success_count} inserted, {skipped_count} skipped")
    return success_count, skipped_count


if __name__ == "__main__":
    seed_carousel_items()
