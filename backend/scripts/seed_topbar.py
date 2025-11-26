import sys
import os
import logging
from pathlib import Path

# Add the backend directory to the Python path
# { changed code }
# Previously this appended '../backend' (which resolves to backend/backend when the script is in backend/scripts).
# Insert the parent directory (the backend package root) so "app" can be imported.
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

from app import create_app
from app.configuration.extensions import db
from app.models.topbar_model import TopBarSlide

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_topbar():
    """Seed the topbar with initial content."""
    app = create_app()
    
    with app.app_context():
        # Check if slides already exist
        if TopBarSlide.query.count() > 0:
            logger.info("Topbar slides already exist. Skipping seed.")
            return

        logger.info("Seeding topbar slides...")

        slides = [
            # Slide 1: Phone Number (The main contact slide)
            TopBarSlide(
                campaign="CALL TO ORDER",
                subtext="WE ARE AVAILABLE 24/7",
                bg_color="#000000",  # Black
                product_image_url="/placeholder.svg?height=100&width=100&text=Phone",
                product_alt="Contact Us",
                center_content_type="phone",
                center_content_data={"phoneNumber": "0711 011 011"},
                button_text="Call Now",
                button_link="tel:0711011011",
                sort_order=0,
                is_active=True
            ),
            # Slide 2: Brands (Showcasing available brands)
            TopBarSlide(
                campaign="TOP BRANDS",
                subtext="OFFICIAL RETAILER",
                bg_color="#1a1a1a",  # Dark Gray
                product_image_url="/placeholder.svg?height=100&width=100&text=Brands",
                product_alt="Top Brands",
                center_content_type="brands",
                center_content_data={"brands": ["NIKE", "ADIDAS", "PUMA", "VANS"]},
                button_text="Shop Brands",
                button_link="/brands",
                sort_order=1,
                is_active=True
            ),
            # Slide 3: Sale/Offer (The "hardcore" sale content)
            TopBarSlide(
                campaign="BLACK FRIDAY",
                subtext="UP TO 80% OFF",
                bg_color="#dc2626",  # Red
                product_image_url="/placeholder.svg?height=100&width=100&text=Sale",
                product_alt="Black Friday Sale",
                center_content_type="text",
                center_content_data={"text": "FREE SHIPPING ON ORDERS OVER KSH 5000"},
                button_text="Shop Sale",
                button_link="/sale",
                sort_order=2,
                is_active=True
            )
        ]

        try:
            for slide in slides:
                db.session.add(slide)
            
            db.session.commit()
            logger.info(f"Successfully added {len(slides)} topbar slides!")
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error seeding topbar: {str(e)}")

if __name__ == "__main__":
    try:
        seed_topbar()
    except ModuleNotFoundError as e:
        # Provide a helpful debug hint if import still fails
        logger.error("Module import failed: %s", e)
        logger.error("Current sys.path: %s", sys.path)
        raise
