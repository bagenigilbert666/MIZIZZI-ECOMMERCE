#!/usr/bin/env python3
"""
Diagnostic script for carousel slowness.
Identifies whether slowness is in SQL execution, ORM materialization, or database I/O.
"""
import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app
from app.configuration.extensions import db
from app.models.carousel_model import CarouselBanner

app = create_app('default')

with app.app_context():
    print("\n" + "="*70)
    print("CAROUSEL SLOWNESS DIAGNOSTIC")
    print("="*70)
    
    # Test 1: Raw SQL count
    print("\n[1] Checking carousel table row count...")
    start = time.perf_counter()
    count = db.session.query(CarouselBanner).count()
    elapsed = time.perf_counter() - start
    print(f"    Row count: {count} | Time: {elapsed*1000:.2f}ms")
    
    # Test 2: Query with WHERE clause
    print("\n[2] Query: is_active=True AND position='homepage'...")
    start = time.perf_counter()
    rows = db.session.query(CarouselBanner)\
        .filter(CarouselBanner.is_active.is_(True))\
        .filter(CarouselBanner.position == 'homepage')\
        .all()
    elapsed = time.perf_counter() - start
    print(f"    Rows returned: {len(rows)} | Time: {elapsed*1000:.2f}ms")
    
    # Test 3: Column-specific query (what we're using now)
    print("\n[3] Column-specific query (8 columns)...")
    start = time.perf_counter()
    rows = db.session.query(
        CarouselBanner.id,
        CarouselBanner.title,
        CarouselBanner.description,
        CarouselBanner.image_url,
        CarouselBanner.button_text,
        CarouselBanner.link_url,
        CarouselBanner.position,
        CarouselBanner.sort_order,
    ).filter(CarouselBanner.is_active.is_(True))\
     .filter(CarouselBanner.position == 'homepage')\
     .order_by(CarouselBanner.sort_order.asc())\
     .all()
    elapsed = time.perf_counter() - start
    print(f"    Rows returned: {len(rows)} | Time: {elapsed*1000:.2f}ms")
    
    # Test 4: Serialization only
    print("\n[4] Serialization timing (from column query)...")
    start = time.perf_counter()
    result = [
        {
            "id": row[0],
            "title": row[1] or "",
            "description": row[2] or "",
            "image_url": row[3] or "",
            "button_text": row[4] or "",
            "button_url": row[5] or "",
            "position": row[6] or "",
            "sort_order": row[7] or 0,
        }
        for row in rows
    ]
    elapsed = time.perf_counter() - start
    print(f"    Items serialized: {len(result)} | Time: {elapsed*1000:.2f}ms")
    
    # Test 5: All columns query (old approach)
    print("\n[5] Full ORM object query (old approach)...")
    start = time.perf_counter()
    products = db.session.query(CarouselBanner)\
        .filter(CarouselBanner.is_active.is_(True))\
        .filter(CarouselBanner.position == 'homepage')\
        .order_by(CarouselBanner.sort_order.asc())\
        .all()
    elapsed = time.perf_counter() - start
    print(f"    ORM objects loaded: {len(products)} | Time: {elapsed*1000:.2f}ms")
    
    # Test 6: Database info
    print("\n[6] Database diagnostics...")
    inspector = db.inspect(db.engine)
    carousel_indices = inspector.get_indexes('carousel_banners')
    print(f"    Carousel indices: {len(carousel_indices)}")
    for idx in carousel_indices:
        print(f"      - {idx['name']}: {idx['column_names']}")
    
    print("\n" + "="*70)
    print("RECOMMENDATION:")
    print("="*70)
    print("If Test 3 is still slow (>50ms), the issue is likely:")
    print("  - Database server is slow or overloaded")
    print("  - Large row count with inefficient table scan")
    print("  - Missing or unused index on (is_active, position)")
    print("\nIf Test 3 is fast (<10ms), slowness is in:")
    print("  - ORM materialization (Test 5)")
    print("  - Network/connection pooling overhead")
    print("\n" + "="*70 + "\n")
