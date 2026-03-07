"""
Carousel Model for Mizizzi E-Commerce
Stores carousel/banner items for homepage display
"""

from app.configuration.extensions import db
from datetime import datetime, timezone


class CarouselBanner(db.Model):
    """Model for carousel banner images displayed on homepage and other pages."""
    __tablename__ = 'carousel_banners'

    id = db.Column(db.Integer, primary_key=True)
    
    # Banner content
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=False)
    
    # Button/link settings
    button_text = db.Column(db.String(100), nullable=True)
    link_url = db.Column(db.String(500), nullable=True)
    
    # Display settings
    position = db.Column(db.String(50), default='homepage')  # 'homepage', 'landing', etc.
    sort_order = db.Column(db.Integer, default=0, index=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_carousels')
    updater = db.relationship('User', foreign_keys=[updated_by], backref='updated_carousels')

    def __repr__(self):
        return f"<CarouselBanner {self.id} - {self.title}>"

    def to_dict(self):
        """Convert carousel banner to dictionary for API responses."""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'image_url': self.image_url,
            'button_text': self.button_text,
            'button_url': self.link_url,
            'position': self.position,
            'sort_order': self.sort_order,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
