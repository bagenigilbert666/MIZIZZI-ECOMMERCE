#!/usr/bin/env python3
"""
Seed script to create a default theme in the database
Run this after ensuring the database is initialized
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../backend'))

def seed_theme():
    """Create default theme if it doesn't exist"""
    from app import create_app
    from app.configuration.extensions import db
    from app.models.theme_settings import ThemeSettings
    
    # Create app context
    app = create_app()
    
    with app.app_context():
        # Check if default theme already exists
        existing = ThemeSettings.query.filter_by(name='Default Theme').first()
        
        if existing:
            print(f"✓ Default theme already exists (ID: {existing.id})")
            return
        
        # Create default theme with cherry red colors
        default_theme = ThemeSettings(
            name='Default Theme',
            is_active=True,
            # Primary brand colors (cherry red)
            primary_color='#7C2D12',  # cherry-900
            primary_light='#991B1B',  # cherry-800
            primary_dark='#450A0A',   # cherry-950
            # Secondary/Accent
            secondary_color='#DC2626',  # cherry-600
            accent_color='#EF4444',     # cherry-500
            # Background
            background_color='#FFFFFF',  # white
            card_background='#FFFFFF',   # white
            surface_color='#F5F5F5',     # light gray
            # Text
            text_primary='#1F2937',      # gray-800
            text_secondary='#6B7280',    # gray-500
            text_on_primary='#FFFFFF',   # white
            # Border
            border_color='#E5E7EB',      # gray-200
            divider_color='#D1D5DB',     # gray-300
            # Buttons
            button_primary_bg='#7C2D12', # cherry-900
            button_primary_text='#FFFFFF',
            button_primary_hover='#991B1B', # cherry-800
            button_secondary_bg='#F3F4F6',  # gray-100
            button_secondary_text='#1F2937', # gray-800
            # Status colors
            success_color='#10B981',     # emerald-500
            warning_color='#F59E0B',     # amber-500
            error_color='#EF4444',       # cherry-500
            info_color='#3B82F6',        # blue-500
            # Header/Footer
            header_background='#FFFFFF',
            header_text='#1F2937',
            footer_background='#1F2937',
            footer_text='#FFFFFF',
            # Links
            link_color='#7C2D12',        # cherry-900
            link_hover_color='#991B1B',  # cherry-800
            # Badge
            badge_color='#DC2626',       # cherry-600
            badge_text='#FFFFFF',
            # Navigation
            nav_background='#FFFFFF',
            nav_text='#1F2937',
            nav_active='#7C2D12',        # cherry-900
            # Carousel
            carousel_background='#7C2D12', # cherry-900
            carousel_overlay_dark='rgba(0, 0, 0, 0.7)',
            carousel_overlay_light='rgba(0, 0, 0, 0.4)',
            carousel_badge_bg='#DC2626',   # cherry-600
            carousel_badge_text='#FFFFFF',
        )
        
        db.session.add(default_theme)
        db.session.commit()
        
        print(f"✓ Default theme created successfully (ID: {default_theme.id})")

if __name__ == '__main__':
    try:
        seed_theme()
        print("\n✓ Theme seeding completed!")
    except Exception as e:
        print(f"✗ Error seeding theme: {str(e)}")
        sys.exit(1)
