"""
CategoryBanner Model for Mizizzi E-Commerce
Stores banner images and content for category grid display
"""

from app.configuration.extensions import db
from datetime import datetime, timezone
from sqlalchemy.sql import func


class CategoryBanner(db.Model):
    """Model for category banner images displayed in the grid."""
    __tablename__ = 'category_banners'

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False, index=True)
    
    # Banner content
    image_url = db.Column(db.String(500), nullable=False)
    alt_text = db.Column(db.String(255), nullable=True)
    title = db.Column(db.String(100), nullable=True)
    subtitle = db.Column(db.String(255), nullable=True)
    
    # Display settings
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    # Link settings
    link_url = db.Column(db.String(500), nullable=True)
    link_target = db.Column(db.String(50), default='_self')  # '_self' or '_blank'
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Relationships
    category = db.relationship('Category', backref=db.backref('banners', lazy=True, cascade="all, delete-orphan"))
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_banners')
    updater = db.relationship('User', foreign_keys=[updated_by], backref='updated_banners')

    def __repr__(self):
        return f"<CategoryBanner {self.id} for Category {self.category_id}>"

    def to_dict(self):
        """Convert banner to dictionary for API responses."""
        return {
            'id': self.id,
            'category_id': self.category_id,
            'image_url': self.image_url,
            'alt_text': self.alt_text,
            'title': self.title,
            'subtitle': self.subtitle,
            'display_order': self.display_order,
            'is_active': self.is_active,
            'link_url': self.link_url,
            'link_target': self.link_target,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'updated_by': self.updated_by
        }
