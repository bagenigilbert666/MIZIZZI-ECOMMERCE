"""
Script to update existing categories with image URLs.
Run this to add images to categories that were created without them.
"""
import sys
import os
import logging
from pathlib import Path

# Compute the backend directory as the parent of the scripts folder and add it to sys.path
script_dir = Path(__file__).resolve().parent
backend_dir = script_dir.parent  # should be the backend directory
sys.path.insert(0, str(backend_dir))

try:
    from app import create_app
    from app.configuration.extensions import db
    from app.models.models import Category
except Exception as e:
    print("Failed to import 'app' or its submodules. Current sys.path:")
    for p in sys.path:
        print("  ", p)
    raise

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Category images mapping - slug to image URL
CATEGORY_IMAGES = {
    "electronics": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80",
    "fashion": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80",
    "home-living": "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=800&q=80",
    "beauty": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80",
    "sports": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80",
}

def update_category_images():
    """Update existing categories with image URLs."""
    app = create_app()
    
    with app.app_context():
        logger.info("Starting category image update...")
        
        updated_count = 0
        
        # Get all categories
        categories = Category.query.all()
        
        for category in categories:
            # Check if category needs an image
            if not category.image_url and not category.image_data:
                # Try to find image URL from our mapping
                image_url = CATEGORY_IMAGES.get(category.slug)
                
                if image_url:
                    logger.info(f"Updating image for category: {category.name}")
                    category.image_url = image_url
                    updated_count += 1
                else:
                    # Assign a default image based on category name keywords
                    default_image = get_default_image(category.name)
                    if default_image:
                        logger.info(f"Assigning default image for category: {category.name}")
                        category.image_url = default_image
                        updated_count += 1
        
        try:
            db.session.commit()
            logger.info(f"Update complete! Updated {updated_count} categories with images.")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating categories: {str(e)}")


def get_default_image(category_name: str) -> str:
    """Get a default image URL based on category name keywords."""
    name_lower = category_name.lower()
    
    # Mapping of keywords to Unsplash images
    keyword_images = {
        "electronic": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80",
        "tech": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
        "fashion": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80",
        "cloth": "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80",
        "home": "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=800&q=80",
        "furniture": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
        "beauty": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80",
        "cosmetic": "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&q=80",
        "makeup": "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80",
        "sport": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80",
        "fitness": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80",
        "athletic": "https://images.unsplash.com/photo-1461896836934-fffcef2b844d?w=800&q=80",
        "food": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
        "grocery": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
        "book": "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80",
        "toy": "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=800&q=80",
        "kid": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80",
        "pet": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80",
        "garden": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80",
        "outdoor": "https://images.unsplash.com/photo-1445307806294-bff7f67ff225?w=800&q=80",
        "jewelry": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80",
        "watch": "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80",
        "shoe": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
        "bag": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
    }
    
    for keyword, image_url in keyword_images.items():
        if keyword in name_lower:
            return image_url
    
    # Return a generic shopping/category image as fallback
    return "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80"


if __name__ == "__main__":
    update_category_images()
