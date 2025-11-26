"""
TopBar Model for managing topbar slides/content
"""

from datetime import datetime, timezone
from ..configuration.extensions import db

class TopBarSlide(db.Model):
    """Model for managing topbar carousel slides."""
    
    __tablename__ = 'topbar_slides'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    campaign = db.Column(db.String(255), nullable=False)  # "BLACK FRIDAY", "MEGA DEALS"
    subtext = db.Column(db.String(255))  # "UP TO 80% OFF"
    bg_color = db.Column(db.String(7), default='#000000')  # Background color
    product_image_url = db.Column(db.Text, nullable=False)  # Product image
    product_alt = db.Column(db.String(255), default='Product')  # Image alt text
    
    # Center content can be stored as JSON for flexibility
    # Supports different types: phone, brand-list, or custom text
    center_content_type = db.Column(db.String(50), default='text')  # 'phone', 'brands', 'text'
    center_content_data = db.Column(db.JSON)  # Stores phone number, brand list, or text
    
    button_text = db.Column(db.String(100), default='Shop Now')
    button_link = db.Column(db.String(255), default='/products')
    
    is_active = db.Column(db.Boolean, default=True, index=True)
    sort_order = db.Column(db.Integer, default=0, index=True)
    
    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    
    def __repr__(self):
        return f'<TopBarSlide {self.id}: {self.campaign}>'
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'id': self.id,
            'campaign': self.campaign,
            'subtext': self.subtext,
            'bgColor': self.bg_color,
            'productImageUrl': self.product_image_url,
            'productAlt': self.product_alt,
            'centerContentType': self.center_content_type,
            'centerContentData': self.center_content_data,
            'buttonText': self.button_text,
            'buttonLink': self.button_link,
            'isActive': self.is_active,
            'sortOrder': self.sort_order,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
