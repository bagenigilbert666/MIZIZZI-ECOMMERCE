"""
Initialize default theme for Mizizzi E-commerce
Creates a default 'Cherry Red' theme if none exists
Run this after database migration to set up the theme system
"""
import sys
import os

# Add parent directory to path for imports (kept for direct execution from backend/)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Use absolute imports so the script can be executed directly (python scripts/init_default_theme.py)
from app.configuration.extensions import db
# Correct import for the application factory
from app import create_app
from app.models.theme_settings import ThemeSettings
from datetime import datetime, timezone

def init_default_theme():
    """Initialize default theme"""
    app = create_app()
    
    with app.app_context():
        try:
            # Check if any theme already exists
            existing_theme = ThemeSettings.query.first()
            if existing_theme:
                print("Themes already exist in the database. Skipping initialization.")
                return
            
            # Create default Cherry Red theme
            default_theme = ThemeSettings(
                name='Cherry Red (Default)',
                is_active=True,
                created_by=None,
                updated_by=None,
                # Primary Brand Colors
                primary_color='#7C2D12',      # cherry-900
                primary_light='#991B1B',      # cherry-700
                primary_dark='#450A0A',       # cherry-950
                # Secondary/Accent Colors
                secondary_color='#DC2626',    # red-600
                accent_color='#EF4444',       # red-500
                # Background Colors
                background_color='#FFFFFF',   # white
                card_background='#FFFFFF',    # white
                surface_color='#F5F5F5',      # gray-100
                # Text Colors
                text_primary='#1F2937',       # gray-800
                text_secondary='#6B7280',     # gray-500
                text_on_primary='#FFFFFF',    # white
                # Border & Divider Colors
                border_color='#E5E7EB',       # gray-200
                divider_color='#D1D5DB',      # gray-300
                # Button Colors
                button_primary_bg='#7C2D12',  # cherry-900
                button_primary_text='#FFFFFF',
                button_primary_hover='#991B1B',  # cherry-700
                button_secondary_bg='#F3F4F6',   # gray-100
                button_secondary_text='#1F2937', # gray-800
                # Status Colors
                success_color='#10B981',      # emerald-500
                warning_color='#F59E0B',      # amber-500
                error_color='#EF4444',        # red-500
                info_color='#3B82F6',         # blue-500
                # Header & Footer
                header_background='#FFFFFF',
                header_text='#1F2937',
                footer_background='#1F2937',
                footer_text='#FFFFFF',
                # Link Colors
                link_color='#7C2D12',
                link_hover_color='#991B1B',
                # Badge/Tag Colors
                badge_color='#DC2626',
                badge_text='#FFFFFF',
                # Navigation
                nav_background='#FFFFFF',
                nav_text='#1F2937',
                nav_active='#7C2D12',
                # Carousel
                carousel_background='#7C2D12',
                carousel_overlay_dark='rgba(0, 0, 0, 0.7)',
                carousel_overlay_light='rgba(0, 0, 0, 0.4)',
                carousel_badge_bg='#DC2626',
                carousel_badge_text='#FFFFFF',
            )
            
            db.session.add(default_theme)
            db.session.commit()
            
            print("✓ Default theme 'Cherry Red' created successfully!")
            print(f"  Theme ID: {default_theme.id}")
            print(f"  Status: Active")
            print(f"  Created at: {default_theme.created_at}")
            
        except Exception as e:
            db.session.rollback()
            print(f"✗ Error creating default theme: {str(e)}")
            sys.exit(1)

if __name__ == '__main__':
    init_default_theme()
