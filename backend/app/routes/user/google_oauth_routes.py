"""
Google OAuth Authentication Routes
This module handles Google OAuth2 authentication for the MIZIZZI platform.
"""

import os
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from flask_jwt_extended import create_access_token, create_refresh_token, set_access_cookies, set_refresh_cookies
from flask_jwt_extended import get_csrf_token
from app.models.models import User
from app.configuration.extensions import db

# Create blueprint
google_oauth_routes = Blueprint('google_oauth', __name__, url_prefix='/api')

# Logger setup
logger = logging.getLogger(__name__)


@google_oauth_routes.route('/google-login', methods=['POST'])
def google_login():
    """
    Authenticate user with Google OAuth token.
    
    Expected JSON body:
    {
        "token": "google_id_token_from_frontend"
    }
    
    Returns:
    - 200: Success with user data and tokens
    - 400: Missing token or invalid email verification
    - 500: Server error
    """
    try:
        data = request.get_json()
        if not data:
            logger.error("Request body is empty")
            return jsonify({'msg': 'Request body is required'}), 400
        
        token = data.get('token')
        if not token:
            logger.error("Google token is missing from request")
            return jsonify({'msg': 'Google token is required'}), 400

        # Verify the token
        try:
            client_id = current_app.config.get('GOOGLE_CLIENT_ID')
            
            if not client_id:
                logger.error("GOOGLE_CLIENT_ID not configured in environment")
                return jsonify({
                    'msg': 'Server configuration error: Google Client ID not set. '
                           'Please set GOOGLE_CLIENT_ID environment variable.'
                }), 500

            logger.info(f"Verifying Google token with client ID: {client_id[:20]}...")

            # Verify the token with Google's servers
            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                client_id
            )

            # Extract user info from the verified token
            google_id = idinfo.get('sub')
            email = idinfo.get('email')
            name = idinfo.get('name', '')
            picture = idinfo.get('picture', '')
            email_verified = idinfo.get('email_verified', False)

            logger.info(f"Google token verified for email: {email}")

            # Check if email is verified by Google
            if not email_verified:
                logger.warning(f"Google email not verified for: {email}")
                return jsonify({
                    'msg': 'Your Google email is not verified. Please verify your email with Google.'
                }), 400

        except ValueError as e:
            logger.error(f"Invalid Google token: {str(e)}")
            return jsonify({'msg': 'Invalid Google token. Please try signing in again.'}), 400
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            return jsonify({'msg': 'Failed to verify Google token.'}), 500

        user = User.query.filter_by(email=email).first()

        if user:
            # User exists, update Google information
            logger.info(f"Existing user found for email: {email}, updating Google info")
            user.is_google_user = True
            user.email_verified = True
            user.last_login = datetime.utcnow()
            # Update name and picture if not already set
            if not user.name or user.name == '':
                user.name = name
            db.session.commit()
        else:
            # Create new user
            logger.info(f"Creating new user from Google OAuth for email: {email}")
            user = User(
                name=name,
                email=email,
                is_google_user=True,
                email_verified=True,
                is_active=True,
                created_at=datetime.utcnow(),
                last_login=datetime.utcnow()
            )

            # Set a random password (not used for Google users)
            import random
            import string
            random_password = ''.join(
                random.choices(string.ascii_letters + string.digits + '!@#$%^&*', k=16)
            )
            user.set_password(random_password)

            db.session.add(user)
            db.session.commit()
            logger.info(f"New user created from Google OAuth: {user.id}")

        additional_claims = {"role": user.role.value if user.role else "user"}
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims=additional_claims
        )
        refresh_token = create_refresh_token(
            identity=str(user.id),
            additional_claims=additional_claims
        )

        # Generate CSRF token
        csrf_token = get_csrf_token()

        logger.info(f"Tokens created successfully for user: {user.id}")

        # Create response with tokens
        resp = jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'csrf_token': csrf_token,
            'user': user.to_dict()
        })

        # Set cookies for tokens
        try:
            set_access_cookies(resp, access_token)
            set_refresh_cookies(resp, refresh_token)
            
            # Set CSRF token cookie (adjust secure flag based on environment)
            is_production = current_app.config.get('ENV') == 'production'
            resp.set_cookie(
                "csrf_access_token",
                csrf_token,
                httponly=False,  # Allow JavaScript access for CSRF token
                secure=is_production,  # Only over HTTPS in production
                samesite="Lax"
            )
            logger.info("All cookies set successfully")
        except Exception as e:
            logger.warning(f"Could not set all cookies: {str(e)}")
            # Continue even if cookie setting fails

        logger.info(f"User {user.id} successfully authenticated via Google OAuth")
        return resp, 200

    except Exception as e:
        logger.error(f"Google login error: {str(e)}", exc_info=True)
        return jsonify({'msg': 'An error occurred during Google login. Please try again.'}), 500


@google_oauth_routes.route('/auth/google-verify', methods=['POST'])
def verify_google_token():
    """
    Verify a Google token without creating a session.
    Useful for token validation and testing.
    
    Expected JSON body:
    {
        "token": "google_id_token"
    }
    
    Returns:
    - 200: Token is valid with user info
    - 400: Invalid token
    - 500: Server error
    """
    try:
        data = request.get_json()
        token = data.get('token') if data else None

        if not token:
            return jsonify({'msg': 'Token is required'}), 400

        try:
            client_id = current_app.config.get('GOOGLE_CLIENT_ID')
            if not client_id:
                return jsonify({'msg': 'Google Client ID not configured'}), 500

            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                client_id
            )

            return jsonify({
                'valid': True,
                'email': idinfo.get('email'),
                'name': idinfo.get('name'),
                'picture': idinfo.get('picture'),
                'email_verified': idinfo.get('email_verified')
            }), 200

        except ValueError:
            return jsonify({'msg': 'Invalid token'}), 400

    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return jsonify({'msg': 'Verification failed'}), 500
