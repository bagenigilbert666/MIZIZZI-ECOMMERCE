"""
Contact CTA Routes Package
Exports the contact_cta_routes Blueprint for use in the main app.
"""

import logging

logger = logging.getLogger('app')

try:
	# Try to import the real blueprint from the module
	from .contact_cta_routes import contact_cta_routes  # type: ignore
	CONTACT_CTA_LOADED = True
except Exception as exc:
	# Log a clear warning with details so you can diagnose why the real module failed to load
	logger.warning(
		"⚠️ Using fallback for contact_cta_routes. Check that 'contact_cta_routes' is defined as a Blueprint in the contact CTA routes module. Error: %s",
		str(exc)
	)
	# Include full traceback at debug level
	try:
		import traceback
		logger.debug(traceback.format_exc())
	except Exception:
		pass

	# Create a minimal Blueprint fallback to keep app registration stable
	try:
		from flask import Blueprint
		contact_cta_routes = Blueprint('contact_cta_routes_fallback', __name__, url_prefix='/api/contact-cta')
	except Exception:
		contact_cta_routes = None

	CONTACT_CTA_LOADED = False

__all__ = ['contact_cta_routes', 'CONTACT_CTA_LOADED']
