"""
Side Panel Management Routes
Handles side panel CRUD operations for carousel panels
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
import logging
import sys
from pathlib import Path

logger = logging.getLogger(__name__)

side_panel_routes = Blueprint('side_panel_routes', __name__)

try:
    from app.models.side_panel_model import SidePanel
    from app.configuration.extensions import db
    logger.info("✅ Imported SidePanel from app.models")
except ImportError:
    try:
        current_dir = Path(__file__).parent
        backend_dir = current_dir.parent.parent.parent
        sys.path.insert(0, str(backend_dir))
        
        from app.models.side_panel_model import SidePanel
        from app.configuration.extensions import db
        logger.info("✅ Imported SidePanel (path adjusted)")
    except ImportError as e:
        logger.error(f"❌ Failed to import SidePanel: {str(e)}")
        db = None
        SidePanel = None


# ============================================================================
# PUBLIC ROUTES - Get side panel items for display
# ============================================================================

@side_panel_routes.route('/items', methods=['GET'])
def get_side_panel_items():
    """
    Get active side panel items for a specific type and position.
    Query params: panel_type, position (left, right)
    """
    try:
        panel_type = request.args.get('panel_type', 'product_showcase')
        position = request.args.get('position', 'left')
        
        if SidePanel is None:
            return jsonify({
                "success": False,
                "error": "Side panel system not available",
                "items": []
            }), 503
        
        items = SidePanel.query.filter_by(
            panel_type=panel_type,
            position=position,
            is_active=True
        ).order_by(SidePanel.sort_order).all()
        
        panel_data = [item.to_dict() for item in items]
        
        return jsonify({
            "success": True,
            "panel_type": panel_type,
            "position": position,
            "items": panel_data,
            "count": len(panel_data)
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching side panel items: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "items": []
        }), 500


@side_panel_routes.route('/item/<int:item_id>', methods=['GET'])
def get_side_panel_item(item_id):
    """Get a specific side panel item by ID."""
    try:
        if SidePanel is None:
            return jsonify({
                "success": False,
                "error": "Side panel system not available"
            }), 503
        
        item = SidePanel.query.get(item_id)
        if not item:
            return jsonify({
                "success": False,
                "error": "Side panel item not found"
            }), 404
        
        return jsonify({
            "success": True,
            "item": item.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching side panel item: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================================
# ADMIN ROUTES - Manage side panel items
# ============================================================================

@side_panel_routes.route('/admin/all', methods=['GET'])
@jwt_required()
def get_all_side_panel_items():
    """Get all side panel items (admin)."""
    try:
        panel_type = request.args.get('panel_type')
        position = request.args.get('position')
        
        if SidePanel is None:
            return jsonify({
                "success": False,
                "error": "Side panel system not available",
                "items": []
            }), 503
        
        query = SidePanel.query
        
        if panel_type:
            query = query.filter_by(panel_type=panel_type)
        if position:
            query = query.filter_by(position=position)
        
        items = query.order_by(SidePanel.sort_order).all()
        panel_data = [item.to_dict() for item in items]
        
        return jsonify({
            "success": True,
            "items": panel_data,
            "count": len(panel_data)
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching side panel items: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "items": []
        }), 500


@side_panel_routes.route('/admin', methods=['POST'])
@jwt_required()
def create_side_panel_item():
    """Create a new side panel item."""
    try:
        if SidePanel is None:
            return jsonify({
                "success": False,
                "error": "Side panel system not available"
            }), 503
        
        data = request.get_json()
        
        required_fields = ['panel_type', 'position', 'title', 'metric', 'image_url', 'icon_name']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    "success": False,
                    "error": f"Missing required field: {field}"
                }), 400
        
        max_sort = db.session.query(db.func.max(SidePanel.sort_order)).filter_by(
            panel_type=data['panel_type'],
            position=data['position']
        ).scalar() or 0
        
        new_item = SidePanel(
            panel_type=data['panel_type'],
            position=data['position'],
            title=data['title'],
            metric=data['metric'],
            description=data.get('description', ''),
            icon_name=data['icon_name'],
            image_url=data['image_url'],
            gradient=data.get('gradient', 'from-pink-500 to-rose-600'),
            features=data.get('features', []),
            is_active=data.get('is_active', True),
            sort_order=max_sort + 1
        )
        
        db.session.add(new_item)
        db.session.commit()
        
        logger.info(f"Created side panel item: {new_item.id}")
        
        return jsonify({
            "success": True,
            "message": "Side panel item created successfully",
            "item": new_item.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating side panel item: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@side_panel_routes.route('/admin/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_side_panel_item(item_id):
    """Update a side panel item."""
    try:
        if SidePanel is None:
            return jsonify({
                "success": False,
                "error": "Side panel system not available"
            }), 503
        
        item = SidePanel.query.get(item_id)
        if not item:
            return jsonify({
                "success": False,
                "error": "Side panel item not found"
            }), 404
        
        data = request.get_json()
        
        updateable_fields = ['title', 'metric', 'description', 'icon_name', 'image_url', 
                           'gradient', 'features', 'is_active', 'sort_order', 'panel_type', 'position']
        
        for field in updateable_fields:
            if field in data:
                setattr(item, field, data[field])
        
        item.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        
        logger.info(f"Updated side panel item: {item_id}")
        
        return jsonify({
            "success": True,
            "message": "Side panel item updated successfully",
            "item": item.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating side panel item: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@side_panel_routes.route('/admin/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_side_panel_item(item_id):
    """Delete a side panel item."""
    try:
        if SidePanel is None:
            return jsonify({
                "success": False,
                "error": "Side panel system not available"
            }), 503
        
        item = SidePanel.query.get(item_id)
        if not item:
            return jsonify({
                "success": False,
                "error": "Side panel item not found"
            }), 404
        
        db.session.delete(item)
        db.session.commit()
        
        logger.info(f"Deleted side panel item: {item_id}")
        
        return jsonify({
            "success": True,
            "message": "Side panel item deleted successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting side panel item: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@side_panel_routes.route('/admin/stats', methods=['GET'])
@jwt_required()
def get_side_panel_stats():
    """Get side panel statistics."""
    try:
        if SidePanel is None:
            return jsonify({
                "success": False,
                "error": "Side panel system not available",
                "stats": {}
            }), 503
        
        total_items = SidePanel.query.count()
        active_items = SidePanel.query.filter_by(is_active=True).count()
        
        by_type = {}
        for panel_type in ['product_showcase', 'premium_experience']:
            by_type[panel_type] = SidePanel.query.filter_by(panel_type=panel_type).count()
        
        return jsonify({
            "success": True,
            "stats": {
                "total_items": total_items,
                "active_items": active_items,
                "inactive_items": total_items - active_items,
                "by_type": by_type
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching side panel stats: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "stats": {}
        }), 500


@side_panel_routes.route('/admin/reorder', methods=['POST'])
@jwt_required()
def reorder_side_panel_items():
    """Reorder side panel items."""
    try:
        if SidePanel is None:
            return jsonify({
                "success": False,
                "error": "Side panel system not available"
            }), 503
        
        data = request.get_json()
        items_order = data.get('items', [])
        
        for item_data in items_order:
            item = SidePanel.query.get(item_data['id'])
            if item:
                item.sort_order = item_data.get('sort_order', 0)
        
        db.session.commit()
        
        logger.info(f"Reordered {len(items_order)} side panel items")
        
        return jsonify({
            "success": True,
            "message": "Side panel items reordered successfully",
            "updated_count": len(items_order)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error reordering side panel items: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@side_panel_routes.route('/admin/bulk-update', methods=['POST'])
@jwt_required()
def bulk_update_side_panel_items():
    """Bulk update multiple side panel items."""
    try:
        if SidePanel is None:
            return jsonify({
                "success": False,
                "error": "Side panel system not available"
            }), 503
        
        data = request.get_json()
        item_ids = data.get('item_ids', [])
        updates = data.get('updates', {})
        
        updated_count = 0
        for item_id in item_ids:
            item = SidePanel.query.get(item_id)
            if item:
                for key, value in updates.items():
                    if hasattr(item, key):
                        setattr(item, key, value)
                updated_count += 1
        
        db.session.commit()
        
        logger.info(f"Bulk updated {updated_count} side panel items")
        
        return jsonify({
            "success": True,
            "message": f"Updated {updated_count} side panel items successfully",
            "updated_count": updated_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error bulk updating side panel items: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@side_panel_routes.route('/health', methods=['GET'])
def side_panel_health():
    """Health check for side panel system."""
    return jsonify({
        "status": "ok",
        "service": "side-panel",
        "database_available": SidePanel is not None,
        "endpoints": [
            "GET /api/panels/items",
            "GET /api/panels/item/<id>",
            "GET /api/panels/admin/all",
            "POST /api/panels/admin",
            "PUT /api/panels/admin/<id>",
            "DELETE /api/panels/admin/<id>",
            "GET /api/panels/admin/stats",
            "POST /api/panels/admin/reorder",
            "POST /api/panels/admin/bulk-update"
        ]
    }), 200
