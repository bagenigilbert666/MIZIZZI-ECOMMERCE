"""
Upload Routes Module - Image upload and serving endpoints
"""

import os
import uuid
import werkzeug.utils
from datetime import datetime
from flask import Blueprint, jsonify, request, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity

uploads_bp = Blueprint('uploads', __name__, url_prefix='/api')


def register_upload_routes(app, uploads_dir, product_images_dir, categories_images_dir):
    """
    Register upload-related routes to the Flask app.
    
    Args:
        app: Flask application instance
        uploads_dir: Base uploads directory path
        product_images_dir: Product images directory path
        categories_images_dir: Categories images directory path
    """
    
    @app.route('/api/admin/upload/image', methods=['POST'])
    @jwt_required()
    def upload_image():
        """Upload an image file to the server."""
        try:
            if 'file' not in request.files:
                return jsonify({"error": "No file part in the request"}), 400
            
            file = request.files['file']
            if file.filename == '':
                return jsonify({"error": "No selected file"}), 400
            
            # Check file size (max 5MB)
            if len(file.read()) > 5 * 1024 * 1024:
                return jsonify({"error": "File too large (max 5MB)"}), 400
            file.seek(0)
            
            # Validate file extension
            allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
            if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
                return jsonify({"error": "File type not allowed. Only images are permitted."}), 400
            
            # Generate unique filename
            original_filename = werkzeug.utils.secure_filename(file.filename)
            file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
            unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
            
            # Save file
            file_path = os.path.join(product_images_dir, unique_filename)
            file.save(file_path)
            
            # Log upload
            current_user_id = get_jwt_identity()
            app.logger.info(f"User {current_user_id} uploaded image: {unique_filename}")
            
            # Generate image URL
            site_url = os.environ.get('SITE_URL', request.host_url.rstrip('/'))
            image_url = f"{site_url}/api/uploads/product_images/{unique_filename}"
            
            return jsonify({
                "success": True,
                "filename": unique_filename,
                "originalName": original_filename,
                "url": image_url,
                "size": os.path.getsize(file_path),
                "uploadedBy": current_user_id,
                "uploadedAt": datetime.now().isoformat()
            }), 201
            
        except Exception as e:
            app.logger.error(f"Error uploading image: {str(e)}")
            return jsonify({"error": f"Failed to upload image: {str(e)}"}), 500
    
    @app.route('/api/uploads/product_images/<filename>', methods=['GET'])
    def serve_product_image(filename):
        """Serve product image file."""
        secure_name = werkzeug.utils.secure_filename(filename)
        return send_from_directory(product_images_dir, secure_name)
    
    @app.route('/api/uploads/categories/<filename>', methods=['GET'])
    def serve_category_image(filename):
        """Serve category image file."""
        secure_name = werkzeug.utils.secure_filename(filename)
        app.logger.debug(f"Serving category image: {secure_name} from {categories_images_dir}")
        return send_from_directory(categories_images_dir, secure_name)
