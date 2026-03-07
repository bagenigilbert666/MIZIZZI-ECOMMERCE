"""
Diagnostic script to identify carousel slowness root cause.
Tests database connection latency vs query execution time.
If COUNT takes 4+ seconds, the issue is connection pooling/network, not the query.
"""
import os
import sys
import time
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from app.configuration.extensions import db
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_connection():
    """Test raw database connection latency."""
    app = create_app()
    
    with app.app_context():
        # Import model inside app context to avoid circular import during app initialization
        from app.models.carousel_model import CarouselBanner
        # Test 1: Connection latency (raw SQL ping)
        print("\n" + "="*70)
        print("TEST 1: RAW DATABASE CONNECTION LATENCY")
        print("="*70)
        
        for i in range(3):
            start = time.perf_counter()
            result = db.session.execute(text("SELECT 1")).scalar()
            elapsed_ms = (time.perf_counter() - start) * 1000
            print(f"  Ping {i+1}: {elapsed_ms:.2f}ms")
        
        # Test 2: COUNT(*) on carousel_banners (7 rows)
        print("\n" + "="*70)
        print("TEST 2: COUNT(*) ON carousel_banners (7 rows)")
        print("="*70)
        
        for i in range(3):
            start = time.perf_counter()
            count = db.session.query(CarouselBanner).count()
            elapsed_ms = (time.perf_counter() - start) * 1000
            print(f"  Count {i+1}: {elapsed_ms:.2f}ms (rows: {count})")
        
        # Test 3: COUNT with WHERE filters (like homepage query)
        print("\n" + "="*70)
        print("TEST 3: COUNT WITH WHERE FILTERS (is_active=true, position='homepage')")
        print("="*70)
        
        for i in range(3):
            start = time.perf_counter()
            count = db.session.query(CarouselBanner).filter(
                CarouselBanner.is_active == True,
                CarouselBanner.position == 'homepage'
            ).count()
            elapsed_ms = (time.perf_counter() - start) * 1000
            print(f"  Count {i+1}: {elapsed_ms:.2f}ms (rows: {count})")
        
        # Test 4: Full carousel query (column-specific)
        print("\n" + "="*70)
        print("TEST 4: FULL CAROUSEL QUERY (OPTIMIZED)")
        print("="*70)
        
        for i in range(3):
            start = time.perf_counter()
            rows = db.session.query(
                CarouselBanner.id,
                CarouselBanner.title,
                CarouselBanner.description,
                CarouselBanner.image_url,
                CarouselBanner.button_text,
                CarouselBanner.link_url,
                CarouselBanner.sort_order,
            ).filter(
                CarouselBanner.is_active == True,
                CarouselBanner.position == 'homepage'
            ).order_by(CarouselBanner.sort_order.asc()).all()
            
            elapsed_ms = (time.perf_counter() - start) * 1000
            print(f"  Query {i+1}: {elapsed_ms:.2f}ms (rows: {len(rows)})")
        
        # Test 5: Full ORM query (for comparison)
        print("\n" + "="*70)
        print("TEST 5: FULL ORM QUERY (UNOPTIMIZED)")
        print("="*70)
        
        for i in range(3):
            start = time.perf_counter()
            items = db.session.query(CarouselBanner).filter(
                CarouselBanner.is_active == True,
                CarouselBanner.position == 'homepage'
            ).order_by(CarouselBanner.sort_order.asc()).all()
            
            elapsed_ms = (time.perf_counter() - start) * 1000
            print(f"  Query {i+1}: {elapsed_ms:.2f}ms (rows: {len(items)})")
        
        # Analysis
        print("\n" + "="*70)
        print("ANALYSIS & RECOMMENDATIONS")
        print("="*70)
        print("""
If all tests take 4+ seconds:
  → Issue: Database server or network connection latency
  → Fix: Check database server location, network path, connection pooling

If only COUNT/first-query takes 4+ seconds:
  → Issue: Connection pool initialization or warmup
  → Fix: Review SQLAlchemy connection pool settings in extensions.py

If optimized query is <100ms but unoptimized is >500ms:
  → Issue: ORM materialization overhead
  → Fix: Continue using column-specific queries (already done)

If first request is slow but subsequent are fast:
  → Issue: Connection pool cold start
  → Fix: Pre-warm connection pool on app startup
        """)

if __name__ == '__main__':
    test_database_connection()
