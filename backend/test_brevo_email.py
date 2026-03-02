"""
Brevo Email Testing Utility
Run this to test if Brevo email sending works in your Render environment
"""

import os
import sys
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

def test_brevo_email_configuration():
    """Test Brevo email configuration."""
    
    logger.info("=" * 70)
    logger.info("BREVO EMAIL CONFIGURATION TEST")
    logger.info("=" * 70)
    
    # Check environment variables
    brevo_api_key = os.environ.get('BREVO_API_KEY')
    brevo_sender_email = os.environ.get('BREVO_SENDER_EMAIL')
    brevo_sender_name = os.environ.get('BREVO_SENDER_NAME')
    
    logger.info("\n📋 ENVIRONMENT VARIABLES:")
    logger.info(f"  BREVO_API_KEY: {'✅ SET' if brevo_api_key else '❌ NOT SET'}")
    if brevo_api_key:
        logger.info(f"    └─ Length: {len(brevo_api_key)} characters")
        logger.info(f"    └─ First 10 chars: {brevo_api_key[:10]}...")
    
    logger.info(f"  BREVO_SENDER_EMAIL: {brevo_sender_email or '❌ NOT SET'}")
    logger.info(f"  BREVO_SENDER_NAME: {brevo_sender_name or 'MIZIZZI (default)'}")
    
    # Validate API key format
    if brevo_api_key:
        if brevo_api_key.startswith('xkeysib-'):
            logger.info("  ✅ API key format looks correct (starts with 'xkeysib-')")
        else:
            logger.warning("  ⚠️ API key doesn't start with 'xkeysib-', this might be wrong")
    
    # Check sender email
    if brevo_sender_email and '@' in brevo_sender_email:
        logger.info("  ✅ Sender email format looks correct")
    elif brevo_sender_email:
        logger.warning(f"  ⚠️ Sender email '{brevo_sender_email}' might be invalid (no @)")
    
    # Test network connectivity
    logger.info("\n🌐 NETWORK CONNECTIVITY TEST:")
    try:
        import requests
        response = requests.get("https://api.brevo.com/v3/account", timeout=10)
        logger.info(f"  ✅ Can reach Brevo API (status: {response.status_code})")
    except requests.exceptions.Timeout:
        logger.error("  ❌ Timeout connecting to Brevo API - network might be blocked")
    except requests.exceptions.ConnectionError:
        logger.error("  ❌ Connection error to Brevo API - check internet/firewall")
    except Exception as e:
        logger.error(f"  ❌ Network test error: {str(e)}")
    
    # Test with mock email send
    if brevo_api_key and brevo_sender_email:
        logger.info("\n📧 MOCK EMAIL SEND TEST:")
        try:
            import requests
            
            test_payload = {
                "sender": {
                    "name": brevo_sender_name or "MIZIZZI",
                    "email": brevo_sender_email
                },
                "to": [
                    {
                        "email": "test@example.com"  # Test recipient
                    }
                ],
                "subject": "[TEST] Brevo Email Configuration",
                "htmlContent": "<p>This is a test email to verify Brevo configuration.</p>"
            }
            
            headers = {
                "accept": "application/json",
                "content-type": "application/json",
                "api-key": brevo_api_key
            }
            
            logger.info("  📤 Sending test email to Brevo API...")
            response = requests.post(
                "https://api.brevo.com/v3/smtp/email",
                json=test_payload,
                headers=headers,
                timeout=30
            )
            
            logger.info(f"  📨 Response status: {response.status_code}")
            
            if response.status_code in [200, 201]:
                logger.info("  ✅ TEST PASSED! Email configuration is working!")
                try:
                    data = response.json()
                    if 'messageId' in data:
                        logger.info(f"    └─ Message ID: {data['messageId']}")
                except:
                    pass
            elif response.status_code == 401:
                logger.error("  ❌ AUTHENTICATION FAILED - Invalid API key")
                logger.error(f"     Response: {response.text}")
            elif response.status_code == 400:
                logger.error("  ❌ BAD REQUEST - Check email format or payload")
                logger.error(f"     Response: {response.text}")
            else:
                logger.error(f"  ❌ Unexpected status code {response.status_code}")
                logger.error(f"     Response: {response.text}")
                
        except Exception as e:
            logger.error(f"  ❌ Mock send error: {str(e)}")
    else:
        logger.warning("  ⚠️ Skipping mock send - missing API key or sender email")
    
    logger.info("\n" + "=" * 70)
    logger.info("TEST COMPLETE")
    logger.info("=" * 70)

if __name__ == "__main__":
    test_brevo_email_configuration()
