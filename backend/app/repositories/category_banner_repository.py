"""
CategoryBanner Repository for database operations
Implements repository pattern for clean data access
"""

from app.models.models import Category
from app.models.category_banner_model import CategoryBanner
from app.configuration.extensions import db
from sqlalchemy import desc
from typing import List, Optional, Dict, Any


class CategoryBannerRepository:
    """Repository for managing category banners."""

    @staticmethod
    def get_all_banners(category_id: Optional[int] = None, active_only: bool = False) -> List[Dict[str, Any]]:
        """Get all banners, optionally filtered by category and active status."""
        query = CategoryBanner.query

        if category_id:
            query = query.filter_by(category_id=category_id)

        if active_only:
            query = query.filter_by(is_active=True)

        banners = query.order_by(CategoryBanner.display_order, desc(CategoryBanner.created_at)).all()
        return [banner.to_dict() for banner in banners]

    @staticmethod
    def get_banner_by_id(banner_id: int) -> Optional[Dict[str, Any]]:
        """Get a banner by ID."""
        banner = CategoryBanner.query.get(banner_id)
        return banner.to_dict() if banner else None

    @staticmethod
    def get_banners_by_category(category_id: int, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get all banners for a specific category."""
        query = CategoryBanner.query.filter_by(category_id=category_id)

        if active_only:
            query = query.filter_by(is_active=True)

        banners = query.order_by(CategoryBanner.display_order, desc(CategoryBanner.created_at)).all()
        return [banner.to_dict() for banner in banners]

    @staticmethod
    def create_banner(category_id: int, image_url: str, alt_text: Optional[str] = None,
                     title: Optional[str] = None, subtitle: Optional[str] = None,
                     display_order: int = 0, link_url: Optional[str] = None,
                     link_target: str = '_self', created_by: Optional[int] = None) -> Dict[str, Any]:
        """Create a new banner."""
        # Verify category exists
        category = Category.query.get(category_id)
        if not category:
            raise ValueError(f"Category with ID {category_id} not found")

        banner = CategoryBanner(
            category_id=category_id,
            image_url=image_url,
            alt_text=alt_text,
            title=title,
            subtitle=subtitle,
            display_order=display_order,
            link_url=link_url,
            link_target=link_target,
            created_by=created_by
        )

        db.session.add(banner)
        db.session.commit()
        return banner.to_dict()

    @staticmethod
    def update_banner(banner_id: int, **kwargs) -> Dict[str, Any]:
        """Update a banner with given fields."""
        banner = CategoryBanner.query.get(banner_id)
        if not banner:
            raise ValueError(f"Banner with ID {banner_id} not found")

        # Allowed fields to update
        allowed_fields = ['image_url', 'alt_text', 'title', 'subtitle', 'display_order', 'is_active', 'link_url', 'link_target', 'updated_by']

        for field, value in kwargs.items():
            if field in allowed_fields and value is not None:
                setattr(banner, field, value)

        db.session.commit()
        return banner.to_dict()

    @staticmethod
    def delete_banner(banner_id: int) -> bool:
        """Delete a banner."""
        banner = CategoryBanner.query.get(banner_id)
        if not banner:
            raise ValueError(f"Banner with ID {banner_id} not found")

        db.session.delete(banner)
        db.session.commit()
        return True

    @staticmethod
    def reorder_banners(category_id: int, banner_ids: List[int]) -> List[Dict[str, Any]]:
        """Reorder banners for a category."""
        banners = CategoryBanner.query.filter_by(category_id=category_id).all()
        banner_dict = {b.id: b for b in banners}

        for order, banner_id in enumerate(banner_ids):
            if banner_id in banner_dict:
                banner_dict[banner_id].display_order = order

        db.session.commit()
        return CategoryBannerRepository.get_banners_by_category(category_id, active_only=False)

    @staticmethod
    def activate_banners(banner_ids: List[int]) -> List[Dict[str, Any]]:
        """Activate multiple banners."""
        banners = CategoryBanner.query.filter(CategoryBanner.id.in_(banner_ids)).all()
        for banner in banners:
            banner.is_active = True
        db.session.commit()
        return [b.to_dict() for b in banners]

    @staticmethod
    def deactivate_banners(banner_ids: List[int]) -> List[Dict[str, Any]]:
        """Deactivate multiple banners."""
        banners = CategoryBanner.query.filter(CategoryBanner.id.in_(banner_ids)).all()
        for banner in banners:
            banner.is_active = False
        db.session.commit()
        return [b.to_dict() for b in banners]
