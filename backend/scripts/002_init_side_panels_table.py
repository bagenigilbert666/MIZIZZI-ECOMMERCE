"""
Initialize side_panels database table and create default side panel items.
Run this script to set up the side panel system for carousel management.

Usage:
    python backend/scripts/002_init_side_panels_table.py
"""
import sys
import os
from datetime import datetime, timezone

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.configuration.extensions import db
from sqlalchemy import inspect

def init_side_panels_table():
    """Initialize side_panels table and create default panel items"""
    app = create_app('development')
    
    with app.app_context():
        print("🛏️ Initializing Side Panels Database...")
        
        # Import model after app context
        from app.models.side_panel_model import SidePanel
        
        # Check if table exists
        inspector = inspect(db.engine)
        table_exists = 'side_panels' in inspector.get_table_names()
        
        if table_exists:
            print("ℹ️ side_panels table already exists")
            existing_count = SidePanel.query.count()
            print(f"📊 Current panel count: {existing_count}")
        else:
            print("📋 Creating side_panels table...")
            db.create_all()
            print("✅ side_panels table created successfully")
        
        # Check if default panels exist
        existing_panels = SidePanel.query.all()
        
        if existing_panels:
            print(f"ℹ️ Found {len(existing_panels)} existing side panels")
            print("Existing panels:")
            for panel in existing_panels:
                print(f"  - {panel.panel_type}: {panel.title}")
            
            response = input("\n⚠️ Do you want to add default panels anyway? (yes/no): ")
            if response.lower() != 'yes':
                print("❌ Skipping default panel creation")
                return
        
        print("🎨 Creating default side panel items...")
        
        # Default side panel items
        default_panels = [
            {
                'panel_type': 'product_showcase',
                'position': 'left',
                'title': 'New Arrivals',
                'metric': '50+ Products',
                'description': 'Check out our latest collection of premium products',
                'icon_name': 'Sparkles',
                'image_url': '/images/new-arrivals.jpg',
                'gradient': 'from-blue-500 to-indigo-600',
                'features': [
                    'Latest fashion trends',
                    'Premium quality',
                    'Limited edition items',
                    'Free shipping available'
                ],
                'is_active': True,
                'sort_order': 1
            },
            {
                'panel_type': 'product_showcase',
                'position': 'right',
                'title': 'Best Sellers',
                'metric': 'Top 10',
                'description': 'Discover our most popular items loved by customers',
                'icon_name': 'TrendingUp',
                'image_url': '/images/best-sellers.jpg',
                'gradient': 'from-emerald-500 to-teal-600',
                'features': [
                    'Customer favorites',
                    'Highly rated',
                    'Fast delivery',
                    'Quality guaranteed'
                ],
                'is_active': True,
                'sort_order': 2
            },
            {
                'panel_type': 'product_showcase',
                'position': 'left',
                'title': 'Flash Sale',
                'metric': '40% OFF',
                'description': 'Limited time offers on selected items',
                'icon_name': 'Zap',
                'image_url': '/images/flash-sale.jpg',
                'gradient': 'from-orange-500 to-red-600',
                'features': [
                    'Up to 40% discount',
                    'Limited stock',
                    'Deal expires soon',
                    'Hot deals'
                ],
                'is_active': True,
                'sort_order': 3
            },
            {
                'panel_type': 'premium_experience',
                'position': 'right',
                'title': 'Premium Membership',
                'metric': '98.7% Satisfaction',
                'description': 'Join our exclusive VIP club for special benefits',
                'icon_name': 'Crown',
                'image_url': '/images/premium-membership.jpg',
                'gradient': 'from-purple-500 to-pink-600',
                'features': [
                    'Exclusive discounts',
                    'Early access to sales',
                    'Free express shipping',
                    'Priority support',
                    'Birthday rewards'
                ],
                'is_active': True,
                'sort_order': 4
            },
            {
                'panel_type': 'premium_experience',
                'position': 'left',
                'title': 'VIP Club',
                'metric': '1,200+ Members',
                'description': 'Elite shopping experience with personalized service',
                'icon_name': 'Star',
                'image_url': '/images/vip-club.jpg',
                'gradient': 'from-yellow-500 to-orange-600',
                'features': [
                    'Personal stylist',
                    'Exclusive products',
                    'Member-only events',
                    'Concierge service',
                    'Loyalty rewards'
                ],
                'is_active': True,
                'sort_order': 5
            }
        ]
        
        # Create default panels
        created_count = 0
        for panel_data in default_panels:
            try:
                panel = SidePanel(**panel_data)
                db.session.add(panel)
                created_count += 1
                print(f"✅ Created: {panel_data['title']} ({panel_data['panel_type']})")
            except Exception as e:
                print(f"❌ Error creating {panel_data['title']}: {str(e)}")
        
        # Commit all changes
        try:
            db.session.commit()
            print(f"\n✅ Successfully created {created_count} default side panels")
            print("\n📊 Side Panel Summary:")
            print(f"   Total panels: {SidePanel.query.count()}")
            print(f"   Product Showcase: {SidePanel.query.filter_by(panel_type='product_showcase').count()}")
            print(f"   Premium Experience: {SidePanel.query.filter_by(panel_type='premium_experience').count()}")
            print(f"   Active panels: {SidePanel.query.filter_by(is_active=True).count()}")
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error committing changes: {str(e)}")
            raise
        
        print("\n🎉 Side panel database initialization complete!")
        print("✨ You can now manage side panels through the admin interface at /admin/side-panels")

if __name__ == '__main__':
    try:
        init_side_panels_table()
    except KeyboardInterrupt:
        print("\n⚠️ Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error during initialization: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
