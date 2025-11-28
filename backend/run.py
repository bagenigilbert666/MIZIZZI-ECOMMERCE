#!/usr/bin/env python3
"""
Main entry point for running the Mizizzi E-commerce Flask application.
Cleaned and simplified: minimal logging, dotenv support, import create_app from common locations,
and start either app.socketio.run(...) or app.run(...).
"""
import os
import sys
import logging
from pathlib import Path

# Optional dotenv loader (no-op fallback)
try:
    from dotenv import load_dotenv
except Exception:
    def load_dotenv(*args, **kwargs):
        return None

def import_create_app():
    """Try common locations for create_app and return the function or None."""
    backend_dir = Path(__file__).parent
    sys.path.insert(0, str(backend_dir))
    try:
        from app import create_app
        return create_app
    except Exception:
        try:
            from backend.app import create_app
            return create_app
        except Exception:
            return None

def main():
    load_dotenv()
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
    logger = logging.getLogger("run")

    create_app = import_create_app()
    if not create_app:
        logger.error("Could not find create_app in app or backend.app. Aborting.")
        sys.exit(1)

    try:
        app = create_app(config_name=os.environ.get('FLASK_CONFIG', 'development'), enable_socketio=True)
    except Exception as e:
        logger.exception("Error while creating Flask application: %s", e)
        sys.exit(1)

    if app is None:
        logger.error("create_app returned None. Aborting.")
        sys.exit(1)

    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'

    try:
        if hasattr(app, 'socketio') and getattr(app, 'socketio') is not None:
            logger.info("Starting app with SocketIO on %s:%s (debug=%s)", host, port, debug)
            app.socketio.run(app, host=host, port=port, debug=debug, use_reloader=debug, allow_unsafe_werkzeug=True)
        else:
            logger.info("Starting Flask app on %s:%s (debug=%s)", host, port, debug)
            app.run(host=host, port=port, debug=debug, use_reloader=debug)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
        sys.exit(0)
    except Exception as e:
        logger.exception("Unhandled error while running server: %s", e)
        sys.exit(1)

if __name__ == '__main__':
    main()
