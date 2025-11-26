"""
Seed script to create admin and moderator users for Mizizzi E-commerce platform.
This script adds initial admin and moderator accounts with secure passwords.
Run this script once during initial setup.
"""

import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.configuration.extensions import db
from app.models.models import User, UserRole
from app import create_app
from datetime import datetime

def seed_admin_users():
    """Seed admin and moderator users to the database."""
    
    print("="*60)
    print("MIZIZZI E-COMMERCE - ADMIN USER SEEDING")
    print("="*60)
    
    # Create Flask app context
    app = create_app()
    
    with app.app_context():
        try:
            # Admin users to create
            admin_users = [
                {
                    'name': 'Super Admin',
                    'email': 'info.contactgilbertdev@gmail.com',
                    'phone': '+254712345678',
                    'password': 'junior2020',
                    'role': UserRole.ADMIN,
                    'avatar_url': None
                },
                {
                    'name': 'Admin User',
                    'email': 'info.contactgilbertdev@gmail.com',
                    'phone': '+254723456789',
                    'password': 'junior2020',
                    'role': UserRole.ADMIN,
                    'avatar_url': None
                },
                {
                    'name': 'Content Moderator',
                    'email': 'info.contactgilbertdev@gmail.com',
                    'phone': '+254734567890',
                    'password': 'junior2020',
                    'role': UserRole.MODERATOR,
                    'avatar_url': None
                }
            ]
            
            created_count = 0
            skipped_count = 0
            
            for user_data in admin_users:
                # Check if user already exists
                existing_user = User.query.filter(
                    (User.email == user_data['email']) | 
                    (User.phone == user_data['phone'])
                ).first()
                
                if existing_user:
                    print(f"⚠️  SKIPPED: User with email {user_data['email']} or phone {user_data['phone']} already exists")
                    skipped_count += 1
                    continue
                
                # Create new user
                new_user = User(
                    name=user_data['name'],
                    email=user_data['email'],
                    phone=user_data['phone'],
                    role=user_data['role'],
                    is_active=True,
                    email_verified=True,
                    phone_verified=True,
                    avatar_url=user_data['avatar_url'],
                    created_at=datetime.utcnow(),
                    is_google_user=False
                )
                
                # Set password using the User model's method
                new_user.set_password(user_data['password'])
                
                # Add to database
                db.session.add(new_user)
                
                print(f"✓ CREATED: {user_data['role'].value.upper()} - {user_data['name']} ({user_data['email']})")
                created_count += 1
            
            # Commit all changes
            db.session.commit()
            
            print("\n" + "="*60)
            print("SEEDING SUMMARY")
            print("="*60)
            print(f"✓ Users Created: {created_count}")
            print(f"⚠️  Users Skipped: {skipped_count}")
            print(f"Total Processed: {created_count + skipped_count}")
            print("="*60)
            
            if created_count > 0:
                print("\n📋 LOGIN CREDENTIALS:")
                print("-" * 60)
                for user_data in admin_users:
                    existing = User.query.filter_by(email=user_data['email']).first()
                    if existing and existing.created_at and (datetime.utcnow() - existing.created_at).seconds < 60:
                        print(f"\n{user_data['role'].value.upper()}: {user_data['name']}")
                        print(f"  Email: {user_data['email']}")
                        print(f"  Phone: {user_data['phone']}")
                        print(f"  Password: {user_data['password']}")
                        print(f"  Role: {user_data['role'].value}")
                print("-" * 60)
                print("\n⚠️  IMPORTANT SECURITY NOTES:")
                print("1. Change these passwords immediately after first login")
                print("2. Use strong passwords with at least 12 characters")
                print("3. Enable MFA for all admin accounts")
                print("4. Never share admin credentials")
                print("5. Review admin activity logs regularly")
            
            print("\n✅ Seeding completed successfully!")
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ ERROR: Failed to seed admin users")
            print(f"Details: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    seed_admin_users()
