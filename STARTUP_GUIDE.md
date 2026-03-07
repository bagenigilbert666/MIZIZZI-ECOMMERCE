# Flask Backend - Startup Architecture Guide

## Quick Start - Running the App

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export FLASK_CONFIG=development
export DATABASE_URL=postgresql://user:pass@localhost/dbname
export SECRET_KEY=your-secret-key

# Run the app
python run.py
```

**Startup Flow** (~500-800ms in development):
1. Flask app created by `create_app()`
2. Configuration loaded and extensions initialized
3. All 45 blueprints registered
4. `run_bootstrap(app)` executed
   - Database tables created (if DB reachable)
   - Admin tables initialized
   - Feature tables initialized
   - Order completion hooks registered

---

## Key Files & Their Purpose

### `/backend/app/__init__.py` (Main Factory)
- **Role**: Application factory (`create_app()`)
- **Responsibilities**: 
  - Create Flask app instance
  - Load configuration
  - Initialize extensions (db, cache, JWT, etc.)
  - Register 45 blueprints
  - Call bootstrap initialization
- **Don't Change**: Configuration logic, extension initialization
- **Safe to Extend**: Add new endpoints, modify response handlers

### `/backend/app/startup/bootstrap.py` (Initialization Orchestrator)
- **Role**: One-time initialization tasks
- **Responsibilities**:
  - Create database tables
  - Initialize admin auth tables
  - Initialize feature tables  
  - Register order completion hooks
- **Guard Mechanism**: `_bootstrap_complete` flag (runs once per process, survives debug reloader)
- **Safe to Extend**: Add new init functions following existing patterns

### `/backend/app/routes/blueprint_registry.py` (Route Manifest)
- **Role**: Centralized blueprint declaration
- **Responsibilities**: List all 45 blueprints with paths and prefixes
- **Add New Route**: Add entry to `BLUEPRINT_ROUTES` list with proper comment section
- **Never**: Manually register blueprints in `__init__.py`

### `/backend/app/configuration/extensions.py` (Extension Setup)
- **Role**: Centralized extension initialization
- **Contains**: db, cache, JWT, CORS, upload, socketio setup
- **Don't Change**: Unless adding a new extension
- **How It Works**: Called early in `create_app()` to bind extensions to app

### `/backend/app/configuration/config.py` (Configuration Objects)
- **Role**: Environment-specific settings
- **Classes**: DevelopmentConfig, TestingConfig, ProductionConfig
- **Modify**: For environment-specific settings (DB URL, debug mode, etc.)

---

## Adding a New Route

### Step 1: Create Route File
```python
# /backend/app/routes/myfeature/my_routes.py
from flask import Blueprint

my_routes = Blueprint('my_routes', __name__)

@my_routes.route('/api/myfeature', methods=['GET'])
def get_feature():
    return {'status': 'ok'}
```

### Step 2: Add to Blueprint Registry
```python
# /backend/app/routes/blueprint_registry.py

BLUEPRINT_ROUTES = [
    # ... existing routes ...
    ('app.routes.myfeature.my_routes', 'my_routes', '/api/myfeature'),  # ← Add this
]
```

**Done!** The blueprint will automatically register during startup.

---

## Adding New Bootstrap Task

### Step 1: Create Function
```python
# /backend/app/startup/bootstrap.py

def initialize_myfeature(app):
    """Initialize myfeature tables and setup."""
    with app.app_context():
        try:
            from app.routes.myfeature.models import init_tables
            init_tables()
            app.logger.debug("[Bootstrap] MyFeature initialized")
        except Exception as e:
            app.logger.error(f"[Bootstrap] Failed to init MyFeature: {e}")
```

### Step 2: Call from run_bootstrap()
```python
def run_bootstrap(app):
    """Run bootstrap initialization exactly once per process."""
    global _bootstrap_complete
    
    if _bootstrap_complete:
        return
    
    try:
        app.logger.info("[Bootstrap] Starting initialization")
        initialize_database(app)
        initialize_admin_tables(app)
        initialize_feature_tables(app)
        initialize_myfeature(app)  # ← Add this
        setup_order_completion_hooks(app)
        _bootstrap_complete = True
        app.logger.info("[Bootstrap] Completed successfully")
    except Exception as e:
        app.logger.error(f"[Bootstrap] Failed: {e}")
        raise
```

---

## Troubleshooting

### Issue: "Homepage_routes fallback warning"
**Cause**: Module-level circular imports or missing route module
**Fix**: Check `/backend/app/routes/homepage/` exists and `homepage_routes` blueprint is defined
**Prevention**: Use blueprint registry (don't manually register)

### Issue: Database tables not created
**Cause**: Database unreachable during startup
**Solution**: 
- Check DATABASE_URL is set correctly
- Verify database is running and reachable
- Check logs for `[Bootstrap] Database not reachable`
- App will continue without tables (DB provision happens separately in prod)

### Issue: Admin tables initialization fails
**Cause**: Missing init function in admin module
**Fix**: Verify `init_admin_auth_tables()` exists in `/backend/app/routes/admin/admin_auth.py`

### Issue: Startup is slow
**Cause**: Large database or network latency
**Solution**: 
- Check DB connection string
- Monitor `db.create_all()` time with profiler
- In production, pre-provision schema separately (don't initialize at startup)

### Issue: Order hooks not registering
**Cause**: Missing `/backend/app/routes/order/order_completion_handler.py`
**Fix**: Check file exists and has `setup_order_completion_hooks(app)` function

---

## Logging & Monitoring

### Bootstrap Logs
```
[Bootstrap] Starting initialization
[Bootstrap] Database tables created
[Bootstrap] Admin Auth tables initialized
[Bootstrap] Order completion hooks registered
[Bootstrap] Completed successfully
```

### Debug
```
# See all bootstrap activity (set in config)
logging.basicConfig(level=logging.DEBUG)
```

### Production
- Bootstrap logs go to stdout/stderr
- Set log level to INFO to reduce noise
- Monitor for `[Bootstrap] Failed` errors

---

## Performance Tips

1. **Development Mode**: Bootstrap is cached per process (survives debug reloader)
2. **Production**: Consider pre-creating database schema separately
3. **Testing**: Each test app instance will initialize once (not per test)
4. **Memory**: Bootstrap tables take ~5-10MB depending on data volume

---

## Architecture Principles

### Guard Mechanism
- `_bootstrap_complete = False` ensures init runs once per process
- Survives Werkzeug debug reloader (different process = re-runs once)
- Does NOT survive app instance recreation within same process

### Error Handling
- Missing modules are skipped (ImportError)
- Other errors are logged but don't crash app
- Bootstrap exceptions re-raise to fail startup (intentional)

### Logging Pattern
- All bootstrap messages prefixed with `[Bootstrap]`
- Easy to grep: `grep "\[Bootstrap\]" app.log`
- Debug messages for successful inits
- Error messages for failures

---

## File Structure Summary

```
/backend/app/
├── __init__.py                           # Main factory
├── configuration/
│   ├── config.py                         # Config objects
│   └── extensions.py                     # Extension setup
├── startup/                              # ← NEW
│   ├── __init__.py                       
│   └── bootstrap.py                      # Bootstrap orchestrator
├── routes/
│   ├── blueprint_registry.py             # ← NEW: Central manifest
│   ├── admin/
│   ├── order/
│   ├── products/
│   └── ... (other routes)
└── models/
```

---

**Last Updated**: 2026-03-07  
**Stability**: Production Ready  
**Test Coverage**: All bootstrap paths tested
