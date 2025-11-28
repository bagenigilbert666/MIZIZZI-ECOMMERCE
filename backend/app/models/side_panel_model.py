"""
Side Panel Model for managing left and right carousel side panels
Used for Product Showcase and Premium Customer Experience panels
"""

from datetime import datetime, timezone
from ..configuration.extensions import db

class SidePanel(db.Model):
    """Side panel model for managing carousel side panels."""
    
    __tablename__ = 'side_panels'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    panel_type = db.Column(
        db.String(50),
        nullable=False,
        index=True
    )  # 'product_showcase' or 'premium_experience'
    position = db.Column(
        db.String(20),
        nullable=False,
        default='left',
        index=True
    )  # 'left' or 'right'
    title = db.Column(db.String(255), nullable=False)
    metric = db.Column(db.String(100), nullable=False)  # e.g., "1,200+", "98.7%"
    description = db.Column(db.Text)
    icon_name = db.Column(db.String(100))  # lucide-react icon name
    image_url = db.Column(db.Text, nullable=False)
    gradient = db.Column(db.String(100), default='from-pink-500 to-rose-600')  # Tailwind gradient class
    features = db.Column(db.JSON)  # Array of feature strings
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
        return f'<SidePanel {self.id}: {self.panel_type}>'
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'id': self.id,
            'panel_type': self.panel_type,
            'position': self.position,
            'title': self.title,
            'metric': self.metric,
            'description': self.description,
            'icon_name': self.icon_name,
            'image_url': self.image_url,
            'gradient': self.gradient,
            'features': self.features or [],
            'is_active': self.is_active,
            'sort_order': self.sort_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
