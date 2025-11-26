"""
Initialize and seed carousel database for Mizizzi E-commerce platform.
This script creates the carousel_banners table and seeds it with sample data.
"""

import sys
import os
# Make sure the backend directory (which contains `app/`) is on sys.path so
# we can `import app` when executing this script from the `backend/` folder.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.configuration.extensions import db
from app.models.carousel_model import CarouselBanner
from datetime import datetime, timezone

def init_carousel_database():
    """Initialize carousel database and seed with sample data"""
    app = create_app()
    
    with app.app_context():
        try:
            # Create tables
            db.create_all()
            print("[v0] ✅ Carousel tables created successfully!")
            
            # Check if we already have data
            existing_count = CarouselBanner.query.count()
            if existing_count > 0:
                print(f"[v0] ℹ️  Database already has {existing_count} carousel banners")
                return
            
            # Seed with sample data for different positions
            sample_banners = [
                # Homepage Carousels
                {
                    'name': 'Innovation Tech Banner',
                    'position': 'homepage',
                    'image_url': 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&w=2070&auto=format&fit=crop',
                    'title': 'Innovate Your Life',
                    'description': 'Cutting-edge electronics and gadgets for the modern home.',
                    'badge_text': '% INNOVATION',
                    'discount': '15% OFF',
                    'button_text': 'TECH DEALS',
                    'link_url': '/products?category=electronics',
                    'is_active': True,
                    'sort_order': 1
                },
                {
                    'name': 'Fashion Forward',
                    'position': 'homepage',
                    'image_url': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop',
                    'title': 'Style That Speaks',
                    'description': 'Discover the latest fashion trends and timeless classics.',
                    'badge_text': 'NEW SEASON',
                    'discount': '30% OFF',
                    'button_text': 'SHOP FASHION',
                    'link_url': '/products?category=fashion',
                    'is_active': True,
                    'sort_order': 2
                },
                {
                    'name': 'Beauty Essentials',
                    'position': 'homepage',
                    'image_url': 'https://images.unsplash.com/photo-1596462502278-27ddab8a248d?q=80&w=2070&auto=format&fit=crop',
                    'title': 'Glow Naturally',
                    'description': 'Premium beauty products for radiant skin and confidence.',
                    'badge_text': 'BESTSELLERS',
                    'discount': '25% OFF',
                    'button_text': 'EXPLORE BEAUTY',
                    'link_url': '/products?category=beauty',
                    'is_active': True,
                    'sort_order': 3
                },
                
                # Flash Sales Carousels
                {
                    'name': 'Flash Sale Electronics',
                    'position': 'flash_sales',
                    'image_url': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2070&auto=format&fit=crop',
                    'title': 'Limited Time Tech Deals',
                    'description': 'Grab amazing discounts on top electronics before they are gone!',
                    'badge_text': 'FLASH SALE',
                    'discount': '50% OFF',
                    'button_text': 'SHOP NOW',
                    'link_url': '/flash-sales',
                    'is_active': True,
                    'sort_order': 1
                },
                
                # Luxury Deals Carousels
                {
                    'name': 'Luxury Fashion',
                    'position': 'luxury_deals',
                    'image_url': 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop',
                    'title': 'Premium Luxury Collection',
                    'description': 'Exclusive designer pieces for the discerning shopper.',
                    'badge_text': 'LUXURY',
                    'discount': '40% OFF',
                    'button_text': 'VIEW LUXURY',
                    'link_url': '/luxury',
                    'is_active': True,
                    'sort_order': 1
                },
                
                # Category Page Carousels
                {
                    'name': 'Category Electronics',
                    'position': 'category_page',
                    'image_url': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=2070&auto=format&fit=crop',
                    'title': 'Smart Home Revolution',
                    'description': 'Transform your living space with intelligent technology.',
                    'badge_text': 'SMART HOME',
                    'discount': '20% OFF',
                    'button_text': 'DISCOVER MORE',
                    'link_url': '/products?category=electronics',
                    'is_active': True,
                    'sort_order': 1
                },
            ]
            
            # Add banners to database
            for banner_data in sample_banners:
                banner = CarouselBanner(**banner_data)
                db.session.add(banner)
            
            db.session.commit()
            
            print(f"[v0] ✅ Successfully seeded {len(sample_banners)} carousel banners!")
            print("[v0] 📊 Breakdown by position:")
            
            # Show breakdown
            for position in ['homepage', 'flash_sales', 'luxury_deals', 'category_page']:
                count = CarouselBanner.query.filter_by(position=position).count()
                print(f"[v0]   - {position}: {count} banners")
            
            print("\n[v0] 🎉 Carousel database initialization complete!")
            print("[v0] 💡 You can now manage carousels from the admin panel at /admin/carousel")
            
        except Exception as e:
            print(f"[v0] ❌ Error initializing carousel database: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    init_carousel_database()
