"""
Script to check existing themes and fix any serialization issues
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.configuration.extensions import db
from app.models.theme_settings import ThemeSettings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_themes():
    """Check existing themes and their state"""
    print("\n" + "="*60)
    print("CHECKING EXISTING THEMES")
    print("="*60)
    
    try:
        themes = ThemeSettings.query.all()
        
        if not themes:
            print("❌ No themes found in database")
            return False
        
        print(f"\n✓ Found {len(themes)} theme(s)")
        
        for theme in themes:
            print(f"\n  Theme ID: {theme.id}")
            print(f"  Name: {theme.name}")
            print(f"  Active: {theme.is_active}")
            print(f"  Primary Color: {theme.primary_color}")
            print(f"  Background Color: {theme.background_color}")
            
            # Try to serialize to dict
            try:
                theme_dict = theme.to_dict()
                print(f"  ✓ Serialization: OK")
                print(f"  Colors keys: {list(theme_dict.get('colors', {}).keys())}")
            except Exception as e:
                print(f"  ❌ Serialization Error: {str(e)}")
                return False
        
        # Check for active theme
        active_theme = ThemeSettings.get_active_theme()
        if active_theme:
            print(f"\n✓ Active theme: {active_theme.name} (ID: {active_theme.id})")
        else:
            print("\n⚠️ No active theme found. Activating first theme...")
            if themes:
                themes[0].activate()
                print(f"✓ Activated: {themes[0].name}")
        
        return True
    
    except Exception as e:
        print(f"❌ Error checking themes: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    from app import create_app
    app = create_app()
    with app.app_context():
        success = check_themes()
        print("\n" + "="*60)
        if success:
            print("✓ Theme check completed successfully")
        else:
            print("❌ Theme check failed")
        print("="*60 + "\n")
        sys.exit(0 if success else 1)
