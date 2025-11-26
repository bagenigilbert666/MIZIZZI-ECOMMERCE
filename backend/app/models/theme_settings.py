"""
Theme Settings Model for Dynamic Color Management
Allows admins to customize website colors like Jumia
"""
from ..configuration.extensions import db
from sqlalchemy.sql import func
from datetime import datetime, timezone
import json

class ThemeSettings(db.Model):
    """Model to store dynamic theme/color settings"""
    __tablename__ = 'theme_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, default='Default Theme')
    is_active = db.Column(db.Boolean, default=True)
    
    # Primary Brand Colors
    primary_color = db.Column(db.String(7), nullable=False, default='#7C2D12')  # Default cherry-900
    primary_light = db.Column(db.String(7), nullable=False, default='#991B1B')
    primary_dark = db.Column(db.String(7), nullable=False, default='#450A0A')
    
    # Secondary/Accent Colors
    secondary_color = db.Column(db.String(7), nullable=False, default='#DC2626')
    accent_color = db.Column(db.String(7), nullable=False, default='#EF4444')
    
    # Background Colors
    # Allow longer values (gradients, rgba, css functions) by increasing column length
    background_color = db.Column(db.String(255), nullable=False, default='#450A0A')  # Main background
    card_background = db.Column(db.String(255), nullable=False, default='#FFFFFF')
    surface_color = db.Column(db.String(255), nullable=False, default='#F5F5F5')
    
    # Text Colors
    text_primary = db.Column(db.String(7), nullable=False, default='#1F2937')
    text_secondary = db.Column(db.String(7), nullable=False, default='#6B7280')
    text_on_primary = db.Column(db.String(7), nullable=False, default='#FFFFFF')
    
    # Border & Divider Colors
    border_color = db.Column(db.String(7), nullable=False, default='#E5E7EB')
    divider_color = db.Column(db.String(7), nullable=False, default='#D1D5DB')
    
    # Button Colors
    button_primary_bg = db.Column(db.String(7), nullable=False, default='#7C2D12')
    button_primary_text = db.Column(db.String(7), nullable=False, default='#FFFFFF')
    button_primary_hover = db.Column(db.String(7), nullable=False, default='#991B1B')
    button_secondary_bg = db.Column(db.String(7), nullable=False, default='#F3F4F6')
    button_secondary_text = db.Column(db.String(7), nullable=False, default='#1F2937')
    
    # Status Colors
    success_color = db.Column(db.String(7), nullable=False, default='#10B981')
    warning_color = db.Column(db.String(7), nullable=False, default='#F59E0B')
    error_color = db.Column(db.String(7), nullable=False, default='#EF4444')
    info_color = db.Column(db.String(7), nullable=False, default='#3B82F6')
    
    # Additional customization
    # Header/footer backgrounds may contain gradients or other css; increase length
    header_background = db.Column(db.String(255), nullable=False, default='#FFFFFF')
    header_text = db.Column(db.String(7), nullable=False, default='#1F2937')
    footer_background = db.Column(db.String(255), nullable=False, default='#1F2937')
    footer_text = db.Column(db.String(7), nullable=False, default='#FFFFFF')
    
    # Link Colors
    link_color = db.Column(db.String(7), nullable=False, default='#7C2D12')
    link_hover_color = db.Column(db.String(7), nullable=False, default='#991B1B')
    
    # Badge/Tag Colors
    badge_color = db.Column(db.String(7), nullable=False, default='#DC2626')
    badge_text = db.Column(db.String(7), nullable=False, default='#FFFFFF')
    
    # Navigation
    nav_background = db.Column(db.String(255), nullable=False, default='#FFFFFF')
    nav_text = db.Column(db.String(7), nullable=False, default='#1F2937')
    nav_active = db.Column(db.String(7), nullable=False, default='#7C2D12')
    
    # Carousel-specific color fields
    # Carousel background may be an image gradient or css; allow longer values
    carousel_background = db.Column(db.String(255), nullable=False, default='#7C2D12')
    carousel_overlay_dark = db.Column(db.String(19), nullable=False, default='rgba(0, 0, 0, 0.7)')
    carousel_overlay_light = db.Column(db.String(19), nullable=False, default='rgba(0, 0, 0, 0.4)')
    carousel_badge_bg = db.Column(db.String(7), nullable=False, default='#DC2626')
    carousel_badge_text = db.Column(db.String(7), nullable=False, default='#FFFFFF')
    
    # Metadata
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by])
    updater = db.relationship('User', foreign_keys=[updated_by])
    
    def __repr__(self):
        return f'<ThemeSettings {self.name} - {"Active" if self.is_active else "Inactive"}>'
    
    def to_dict(self):
        """Convert theme settings to dictionary for API responses"""
        return {
            'id': self.id,
            'name': self.name,
            'is_active': self.is_active,
            'colors': {
                'primary': {
                    'main': self.primary_color,
                    'light': self.primary_light,
                    'dark': self.primary_dark,
                },
                'secondary': {
                    'main': self.secondary_color,
                    'accent': self.accent_color,
                },
                'background': {
                    'main': self.background_color,
                    'card': self.card_background,
                    'surface': self.surface_color,
                },
                'text': {
                    'primary': self.text_primary,
                    'secondary': self.text_secondary,
                    'onPrimary': self.text_on_primary,
                },
                'border': {
                    'main': self.border_color,
                    'divider': self.divider_color,
                },
                'button': {
                    'primary': {
                        'background': self.button_primary_bg,
                        'text': self.button_primary_text,
                        'hover': self.button_primary_hover,
                    },
                    'secondary': {
                        'background': self.button_secondary_bg,
                        'text': self.button_secondary_text,
                    }
                },
                'status': {
                    'success': self.success_color,
                    'warning': self.warning_color,
                    'error': self.error_color,
                    'info': self.info_color,
                },
                'header': {
                    'background': self.header_background,
                    'text': self.header_text,
                },
                'footer': {
                    'background': self.footer_background,
                    'text': self.footer_text,
                },
                'link': {
                    'main': self.link_color,
                    'hover': self.link_hover_color,
                },
                'badge': {
                    'background': self.badge_color,
                    'text': self.badge_text,
                },
                'navigation': {
                    'background': self.nav_background,
                    'text': self.nav_text,
                    'active': self.nav_active,
                },
                'carousel': {
                    'background': self.carousel_background,
                    'overlayDark': self.carousel_overlay_dark,
                    'overlayLight': self.carousel_overlay_light,
                    'badgeBg': self.carousel_badge_bg,
                    'badgeText': self.carousel_badge_text,
                }
            },
            'metadata': {
                'created_by': self.created_by,
                'updated_by': self.updated_by,
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            }
        }
    
    def to_css_variables(self):
        """Generate CSS variables for the theme"""
        return f"""
        :root {{
            --color-primary: {self.primary_color};
            --color-primary-light: {self.primary_light};
            --color-primary-dark: {self.primary_dark};
            --color-secondary: {self.secondary_color};
            --color-accent: {self.accent_color};
            
            --color-background: {self.background_color};
            --color-card-bg: {self.card_background};
            --color-surface: {self.surface_color};
            
            --color-text-primary: {self.text_primary};
            --color-text-secondary: {self.text_secondary};
            --color-text-on-primary: {self.text_on_primary};
            
            --color-border: {self.border_color};
            --color-divider: {self.divider_color};
            
            --color-button-primary-bg: {self.button_primary_bg};
            --color-button-primary-text: {self.button_primary_text};
            --color-button-primary-hover: {self.button_primary_hover};
            --color-button-secondary-bg: {self.button_secondary_bg};
            --color-button-secondary-text: {self.button_secondary_text};
            
            --color-success: {self.success_color};
            --color-warning: {self.warning_color};
            --color-error: {self.error_color};
            --color-info: {self.info_color};
            
            --color-header-bg: {self.header_background};
            --color-header-text: {self.header_text};
            --color-footer-bg: {self.footer_background};
            --color-footer-text: {self.footer_text};
            
            --color-link: {self.link_color};
            --color-link-hover: {self.link_hover_color};
            
            --color-badge-bg: {self.badge_color};
            --color-badge-text: {self.badge_text};
            
            --color-nav-bg: {self.nav_background};
            --color-nav-text: {self.nav_text};
            --color-nav-active: {self.nav_active};
            
            --color-carousel-bg: {self.carousel_background};
            --color-carousel-overlay-dark: {self.carousel_overlay_dark};
            --color-carousel-overlay-light: {self.carousel_overlay_light};
            --color-carousel-badge-bg: {self.carousel_badge_bg};
            --color-carousel-badge-text: {self.carousel_badge_text};
        }}
        """
    
    @staticmethod
    def get_active_theme():
        """Get the currently active theme"""
        return ThemeSettings.query.filter_by(is_active=True).first()
    
    @staticmethod
    def deactivate_all():
        """Deactivate all themes"""
        ThemeSettings.query.update({ThemeSettings.is_active: False})
        db.session.commit()
    
    def activate(self):
        """Activate this theme and deactivate others"""
        ThemeSettings.deactivate_all()
        self.is_active = True
        db.session.commit()

class ThemePreset(db.Model):
    """Pre-defined theme presets for quick switching"""
    __tablename__ = 'theme_presets'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    thumbnail_url = db.Column(db.String(255))
    theme_data = db.Column(db.JSON, nullable=False)  # Stores all color values
    is_default = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    def __repr__(self):
        return f'<ThemePreset {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'thumbnail_url': self.thumbnail_url,
            'theme_data': self.theme_data,
            'is_default': self.is_default,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
    
    def apply_to_theme(self, theme_settings):
        """Apply this preset to a ThemeSettings instance"""
        for key, value in self.theme_data.items():
            if hasattr(theme_settings, key):
                setattr(theme_settings, key, value)
        return theme_settings
