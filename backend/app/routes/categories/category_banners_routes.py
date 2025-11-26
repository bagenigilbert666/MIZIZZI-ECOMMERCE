"""
Admin Category Banners Routes for Mizizzi E-commerce platform.
Handles category banner management operations for administrators.
Allows editing and changing category grid banner images and content.
"""

# Standard Libraries
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

# Flask Core
from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin
from flask_jwt_extended import jwt_required, get_jwt_identity

# Database & ORM
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

# Extensions
from ...configuration.extensions import db

# Models
from ...models.models import Category, User, UserRole
from ...models.category_banner_model import CategoryBanner

# Repository
from ...repositories.category_banner_repository import CategoryBannerRepository

# Validations & Decorators
from ...validations.validation import admin_required

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint
admin_category_banners_routes = Blueprint('admin_category_banners_routes', __name__)

# ----------------------
# Helper Functions
# ----------------------

def validate_banner_data(data: Dict[str, Any]) -> tuple[bool, str]:
    """Validate banner input data."""
    if not data.get('image_url'):
        return False, "image_url is required"
    
    if not isinstance(data.get('image_url'), str) or len(data['image_url']) < 5:
        return False, "image_url must be a valid URL string"
    
    if data.get('display_order') is not None and not isinstance(data.get('display_order'), int):
        return False, "display_order must be an integer"
    
    if data.get('title') and len(data['title']) > 100:
        return False, "title must not exceed 100 characters"
    
    if data.get('subtitle') and len(data['subtitle']) > 255:
        return False, "subtitle must not exceed 255 characters"
    
    if data.get('alt_text') and len(data['alt_text']) > 255:
        return False, "alt_text must not exceed 255 characters"
    
    if data.get('link_url') and len(data['link_url']) > 500:
        return False, "link_url must not exceed 500 characters"
    
    if data.get('link_target') and data['link_target'] not in ['_self', '_blank']:
        return False, "link_target must be '_self' or '_blank'"
    
    return True, ""

def sanitize_banner_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize banner input data."""
    sanitized = {}
    
    if 'image_url' in data:
        sanitized['image_url'] = data['image_url'].strip()
    
    if 'title' in data:
        sanitized['title'] = data['title'].strip() if data['title'] else None
    
    if 'subtitle' in data:
        sanitized['subtitle'] = data['subtitle'].strip() if data['subtitle'] else None
    
    if 'alt_text' in data:
        sanitized['alt_text'] = data['alt_text'].strip() if data['alt_text'] else None
    
    if 'link_url' in data:
        sanitized['link_url'] = data['link_url'].strip() if data['link_url'] else None
    
    if 'display_order' in data:
        sanitized['display_order'] = int(data['display_order'])
    
    if 'is_active' in data:
        sanitized['is_active'] = bool(data['is_active'])
    
    if 'link_target' in data:
        sanitized['link_target'] = data['link_target']
    
    return sanitized

# ----------------------
# Admin Category Banners Routes
# ----------------------

@admin_category_banners_routes.route('/categories/<int:category_id>/banners', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def get_category_banners(category_id):
    """Get all banners for a specific category."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 200

    try:
        # Verify category exists
        category = Category.query.get(category_id)
        if not category:
            return jsonify({"error": f"Category with ID {category_id} not found"}), 404
        
        # Get all banners (including inactive)
        active_only = request.args.get('active_only', 'false').lower() == 'true'
        banners = CategoryBannerRepository.get_banners_by_category(category_id, active_only=active_only)
        
        logger.info(f"✅ Retrieved {len(banners)} banners for category {category_id}")
        
        return jsonify({
            "category_id": category_id,
            "category_name": category.name,
            "banners": banners,
            "total": len(banners)
        }), 200

    except Exception as e:
        logger.error(f"Error fetching banners for category {category_id}: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve category banners",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500


@admin_category_banners_routes.route('/categories/<int:category_id>/banners', methods=['POST'])
@cross_origin()
@jwt_required()
@admin_required
def create_category_banner(category_id):
    """Create a new banner for a category."""
    try:
        # Verify category exists
        category = Category.query.get(category_id)
        if not category:
            return jsonify({"error": f"Category with ID {category_id} not found"}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        # Validate input
        is_valid, error_msg = validate_banner_data(data)
        if not is_valid:
            return jsonify({"error": error_msg}), 400
        
        # Sanitize input
        sanitized_data = sanitize_banner_data(data)
        
        # Get current user ID
        user_id = get_jwt_identity()
        
        # Create banner
        try:
            banner = CategoryBannerRepository.create_banner(
                category_id=category_id,
                image_url=sanitized_data['image_url'],
                alt_text=sanitized_data.get('alt_text'),
                title=sanitized_data.get('title'),
                subtitle=sanitized_data.get('subtitle'),
                display_order=sanitized_data.get('display_order', 0),
                link_url=sanitized_data.get('link_url'),
                link_target=sanitized_data.get('link_target', '_self'),
                created_by=user_id
            )
            
            logger.info(f"✅ Created new banner {banner['id']} for category {category_id}")
            
            return jsonify({
                "message": "Banner created successfully",
                "banner": banner
            }), 201

        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    except Exception as e:
        logger.error(f"Error creating banner for category {category_id}: {str(e)}")
        return jsonify({
            "error": "Failed to create category banner",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500


@admin_category_banners_routes.route('/banners/<int:banner_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def get_banner(banner_id):
    """Get a specific banner by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 200

    try:
        banner = CategoryBannerRepository.get_banner_by_id(banner_id)
        if not banner:
            return jsonify({"error": f"Banner with ID {banner_id} not found"}), 404
        
        return jsonify(banner), 200

    except Exception as e:
        logger.error(f"Error fetching banner {banner_id}: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve banner",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500


@admin_category_banners_routes.route('/banners/<int:banner_id>', methods=['PUT'])
@cross_origin()
@jwt_required()
@admin_required
def update_banner(banner_id):
    """Update a banner."""
    try:
        # Check banner exists
        banner = CategoryBanner.query.get(banner_id)
        if not banner:
            return jsonify({"error": f"Banner with ID {banner_id} not found"}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        # Validate input (only validate fields that are being updated)
        if 'image_url' in data or 'title' in data or 'subtitle' in data or 'alt_text' in data or 'link_url' in data:
            is_valid, error_msg = validate_banner_data(data)
            if not is_valid:
                return jsonify({"error": error_msg}), 400
        
        # Sanitize input
        sanitized_data = sanitize_banner_data(data)
        
        # Add updated_by
        sanitized_data['updated_by'] = get_jwt_identity()
        
        try:
            updated_banner = CategoryBannerRepository.update_banner(banner_id, **sanitized_data)
            
            logger.info(f"✅ Updated banner {banner_id}")
            
            return jsonify({
                "message": "Banner updated successfully",
                "banner": updated_banner
            }), 200

        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    except Exception as e:
        logger.error(f"Error updating banner {banner_id}: {str(e)}")
        return jsonify({
            "error": "Failed to update banner",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500


@admin_category_banners_routes.route('/banners/<int:banner_id>', methods=['DELETE'])
@cross_origin()
@jwt_required()
@admin_required
def delete_banner(banner_id):
    """Delete a banner."""
    try:
        try:
            CategoryBannerRepository.delete_banner(banner_id)
            
            logger.info(f"✅ Deleted banner {banner_id}")
            
            return jsonify({"message": "Banner deleted successfully"}), 200

        except ValueError as e:
            return jsonify({"error": str(e)}), 404

    except Exception as e:
        logger.error(f"Error deleting banner {banner_id}: {str(e)}")
        return jsonify({
            "error": "Failed to delete banner",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500


@admin_category_banners_routes.route('/categories/<int:category_id>/banners/reorder', methods=['POST'])
@cross_origin()
@jwt_required()
@admin_required
def reorder_banners(category_id):
    """Reorder banners for a category."""
    try:
        # Verify category exists
        category = Category.query.get(category_id)
        if not category:
            return jsonify({"error": f"Category with ID {category_id} not found"}), 404
        
        data = request.get_json()
        if not data or 'banner_ids' not in data:
            return jsonify({"error": "banner_ids array is required"}), 400
        
        banner_ids = data['banner_ids']
        if not isinstance(banner_ids, list):
            return jsonify({"error": "banner_ids must be an array"}), 400
        
        try:
            banners = CategoryBannerRepository.reorder_banners(category_id, banner_ids)
            
            logger.info(f"✅ Reordered banners for category {category_id}")
            
            return jsonify({
                "message": "Banners reordered successfully",
                "banners": banners
            }), 200

        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    except Exception as e:
        logger.error(f"Error reordering banners for category {category_id}: {str(e)}")
        return jsonify({
            "error": "Failed to reorder banners",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500


@admin_category_banners_routes.route('/banners/activate', methods=['POST'])
@cross_origin()
@jwt_required()
@admin_required
def activate_banners():
    """Activate multiple banners."""
    try:
        data = request.get_json()
        if not data or 'banner_ids' not in data:
            return jsonify({"error": "banner_ids array is required"}), 400
        
        banner_ids = data['banner_ids']
        if not isinstance(banner_ids, list):
            return jsonify({"error": "banner_ids must be an array"}), 400
        
        banners = CategoryBannerRepository.activate_banners(banner_ids)
        
        logger.info(f"✅ Activated {len(banners)} banners")
        
        return jsonify({
            "message": f"Activated {len(banners)} banners",
            "banners": banners
        }), 200

    except Exception as e:
        logger.error(f"Error activating banners: {str(e)}")
        return jsonify({
            "error": "Failed to activate banners",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500


@admin_category_banners_routes.route('/banners/deactivate', methods=['POST'])
@cross_origin()
@jwt_required()
@admin_required
def deactivate_banners():
    """Deactivate multiple banners."""
    try:
        data = request.get_json()
        if not data or 'banner_ids' not in data:
            return jsonify({"error": "banner_ids array is required"}), 400
        
        banner_ids = data['banner_ids']
        if not isinstance(banner_ids, list):
            return jsonify({"error": "banner_ids must be an array"}), 400
        
        banners = CategoryBannerRepository.deactivate_banners(banner_ids)
        
        logger.info(f"✅ Deactivated {len(banners)} banners")
        
        return jsonify({
            "message": f"Deactivated {len(banners)} banners",
            "banners": banners
        }), 200

    except Exception as e:
        logger.error(f"Error deactivating banners: {str(e)}")
        return jsonify({
            "error": "Failed to deactivate banners",
            "details": str(e) if current_app.debug else "Internal server error"
        }), 500


# ----------------------
# Error Handlers
# ----------------------

@admin_category_banners_routes.errorhandler(404)
def banner_not_found(error):
    """Handle banner not found errors."""
    return jsonify({"error": "Banner not found"}), 404


@admin_category_banners_routes.errorhandler(400)
def bad_request(error):
    """Handle bad request errors."""
    return jsonify({"error": "Bad request", "details": str(error)}), 400


@admin_category_banners_routes.errorhandler(500)
def internal_error(error):
    """Handle internal server errors."""
    db.session.rollback()
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({"error": "Internal server error"}), 500


# ----------------------
# Health Check
# ----------------------

@admin_category_banners_routes.route('/health', methods=['GET'])
@cross_origin()
def health_check():
    """Health check endpoint."""
    try:
        from sqlalchemy import text
        db.session.execute(text('SELECT 1'))
        return jsonify({
            "status": "healthy",
            "service": "admin_category_banners",
            "timestamp": datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "service": "admin_category_banners",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 503


# Backwards-compatible alias: some parts of the app expect the blueprint to be
# named `category_banners_routes`. Export that name to avoid fallback imports.
category_banners_routes = admin_category_banners_routes
