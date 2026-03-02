"""
Debug endpoint for testing Brevo email functionality.
Add this route to your Flask app for testing.
"""

from flask import Blueprint, jsonify, request, current_app
import logging
import requests

logger = logging.getLogger(__name__)

debug_routes = Blueprint('debug_routes', __name__, url_prefix='/api/debug')

@debug_routes.route('/test-brevo-email', methods=['POST'])
def test_brevo_email():
    """Test Brevo email sending - for debugging only."""
    
    try:
        data = request.get_json() or {}
        to_email = data.get('to_email') or 'test@example.com'
        
        logger.info(f"[v0] 🧪 Testing Brevo email send to: {to_email}")
        
        # Get configuration
        api_key = current_app.config.get('BREVO_API_KEY')
        sender_email = current_app.config.get('BREVO_SENDER_EMAIL', 'info.contactgilbertdev@gmail.com')
        sender_name = current_app.config.get('BREVO_SENDER_NAME', 'MIZIZZI')
        
        # Validate
        if not api_key:
            return jsonify({
                'success': False,
                'error': 'BREVO_API_KEY not configured',
                'debug': {
                    'BREVO_API_KEY': 'NOT SET',
                    'BREVO_SENDER_EMAIL': sender_email,
                    'BREVO_SENDER_NAME': sender_name
                }
            }), 500
        
        logger.info(f"[v0] ✅ API key found (length: {len(api_key)})")
        logger.info(f"[v0] 📤 Sender: {sender_name} <{sender_email}>")
        
        # Prepare payload
        payload = {
            "sender": {
                "name": sender_name,
                "email": sender_email
            },
            "to": [{"email": to_email}],
            "subject": "[TEST] Brevo Email Configuration",
            "htmlContent": f"""
            <html>
                <body style="font-family: Arial, sans-serif;">
                    <h1>Brevo Email Test</h1>
                    <p>This is a test email from MIZIZZI sent at {__import__('datetime').datetime.now().isoformat()}</p>
                    <p>If you received this, Brevo email is working correctly!</p>
                </body>
            </html>
            """
        }
        
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": api_key
        }
        
        logger.info("[v0] 🚀 Sending test email via Brevo API...")
        
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers=headers,
            timeout=30
        )
        
        logger.info(f"[v0] 📨 Response status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            logger.info(f"[v0] ✅ Email sent successfully!")
            try:
                response_data = response.json()
                return jsonify({
                    'success': True,
                    'message': f'Test email sent to {to_email}',
                    'brevo_message_id': response_data.get('messageId'),
                    'debug': {
                        'status_code': response.status_code,
                        'api_endpoint': 'https://api.brevo.com/v3/smtp/email',
                        'sender_email': sender_email,
                        'recipient_email': to_email
                    }
                }), 200
            except:
                return jsonify({
                    'success': True,
                    'message': f'Test email sent to {to_email}',
                    'debug': {
                        'status_code': response.status_code
                    }
                }), 200
        else:
            logger.error(f"[v0] ❌ Failed with status {response.status_code}")
            logger.error(f"[v0] Response: {response.text}")
            
            error_detail = response.text
            try:
                error_detail = response.json()
            except:
                pass
            
            return jsonify({
                'success': False,
                'error': f'Brevo API returned status {response.status_code}',
                'debug': {
                    'status_code': response.status_code,
                    'error_detail': error_detail,
                    'sender_email': sender_email,
                    'recipient_email': to_email,
                    'api_key_set': bool(api_key),
                    'api_key_length': len(api_key) if api_key else 0
                }
            }), response.status_code
            
    except requests.exceptions.Timeout:
        logger.error("[v0] ⏱️ Timeout connecting to Brevo API")
        return jsonify({
            'success': False,
            'error': 'Timeout connecting to Brevo API (30s)',
            'debug': {'type': 'timeout'}
        }), 504
        
    except requests.exceptions.ConnectionError as e:
        logger.error(f"[v0] 🔌 Connection error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Connection error to Brevo API',
            'debug': {'type': 'connection_error', 'message': str(e)}
        }), 503
        
    except Exception as e:
        logger.error(f"[v0] ❌ Exception: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f'Exception: {str(e)}',
            'debug': {'type': 'exception'}
        }), 500


@debug_routes.route('/brevo-config', methods=['GET'])
def get_brevo_config():
    """Get current Brevo configuration (for debugging)."""
    
    api_key = current_app.config.get('BREVO_API_KEY')
    sender_email = current_app.config.get('BREVO_SENDER_EMAIL')
    sender_name = current_app.config.get('BREVO_SENDER_NAME')
    
    return jsonify({
        'BREVO_API_KEY_SET': bool(api_key),
        'BREVO_API_KEY_LENGTH': len(api_key) if api_key else 0,
        'BREVO_SENDER_EMAIL': sender_email,
        'BREVO_SENDER_NAME': sender_name,
        'environment': {
            'FLASK_ENV': current_app.config.get('ENV', 'unknown'),
            'DEBUG': current_app.debug
        }
    }), 200
