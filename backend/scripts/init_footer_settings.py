"""
Initialize and seed footer settings for Mizizzi E-commerce platform.
This script creates the footer_settings table and seeds it with default data.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.configuration.extensions import db
from app.models.footer_settings import FooterSettings

def init_footer_settings():
    """Initialize footer settings database and seed with default data"""
    app = create_app()
    
    with app.app_context():
        try:
            # Create tables
            db.create_all()
            print("[v0] ✅ Footer settings tables created successfully!")
            
            # Check if we already have data
            existing_settings = FooterSettings.query.first()
            if existing_settings:
                print("[v0] ℹ️  Footer settings already exist. Updating with new structure...")
                # Update existing settings with new structure if needed
                existing_settings.categories = [
                    {"name": "New Arrivals", "url": "/products/new"},
                    {"name": "Best Sellers", "url": "/products/featured"},
                    {"name": "Sale", "url": "/products/sale"},
                    {"name": "Men", "url": "/products?category=men"},
                    {"name": "Women", "url": "/products?category=women"},
                    {"name": "Kids", "url": "/products?category=kids"}
                ]
                existing_settings.resources_links = [
                    {"name": "Size Guide", "url": "/size-guide"},
                    {"name": "Shipping Info", "url": "/shipping"},
                    {"name": "Gift Cards", "url": "/gift-cards"},
                    {"name": "FAQ", "url": "/faq"},
                    {"name": "Store Locator", "url": "/stores"}
                ]
                db.session.commit()
                print("[v0] ✅ Updated existing footer settings with new categories and resources!")
                return
            
            # Seed with default data
            default_settings = FooterSettings(
                company_name="Mizizzi Shop",
                company_description="Your one-stop shop for premium products. Quality, style, and innovation delivered to your doorstep.",
                contact_email="support@mizizzi.com",
                contact_phone="+254 700 000000",
                contact_address="Nairobi, Kenya",
                facebook_url="https://facebook.com",
                twitter_url="https://twitter.com",
                instagram_url="https://instagram.com",
                linkedin_url="https://linkedin.com",
                copyright_text="© 2025 Mizizzi Shop. All rights reserved.",
                categories=[
                    {"name": "New Arrivals", "url": "/products/new"},
                    {"name": "Best Sellers", "url": "/products/featured"},
                    {"name": "Sale", "url": "/products/sale"},
                    {"name": "Men", "url": "/products?category=men"},
                    {"name": "Women", "url": "/products?category=women"},
                    {"name": "Kids", "url": "/products?category=kids"}
                ],
                resources_links=[
                    {"name": "Size Guide", "url": "/size-guide"},
                    {"name": "Shipping Info", "url": "/shipping"},
                    {"name": "Gift Cards", "url": "/gift-cards"},
                    {"name": "FAQ", "url": "/faq"},
                    {"name": "Store Locator", "url": "/stores"}
                ],
                is_active=True
            )
            
            db.session.add(default_settings)
            db.session.commit()
            
            print("[v0] ✅ Successfully initialized footer settings!")
            print("[v0] 💡 You can now manage footer settings from the admin panel at /admin/footer")
            
        except Exception as e:
            print(f"[v0] ❌ Error initializing footer settings: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    init_footer_settings()
