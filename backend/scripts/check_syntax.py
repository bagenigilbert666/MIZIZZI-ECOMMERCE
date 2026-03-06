#!/usr/bin/env python3
"""
Quick syntax checker for products routes modules
"""
import sys
import py_compile
import traceback

files_to_check = [
    '/vercel/share/v0-project/backend/app/routes/products/products_routes.py',
    '/vercel/share/v0-project/backend/app/routes/products/featured_routes.py',
    '/vercel/share/v0-project/backend/app/routes/products/admin_products_routes.py',
    '/vercel/share/v0-project/backend/app/routes/products/serializers.py',
    '/vercel/share/v0-project/backend/app/routes/products/cache_keys.py',
    '/vercel/share/v0-project/backend/app/routes/products/cache_invalidation.py',
    '/vercel/share/v0-project/backend/app/routes/products/cache_utils.py',
]

print("=" * 70)
print("CHECKING SYNTAX OF PRODUCTS ROUTES MODULES")
print("=" * 70)

all_good = True
for filepath in files_to_check:
    try:
        py_compile.compile(filepath, doraise=True)
        print(f"✅ {filepath.split('/')[-1]:<35} PASS")
    except py_compile.PyCompileError as e:
        print(f"❌ {filepath.split('/')[-1]:<35} FAIL")
        print(f"   Error: {str(e)}")
        all_good = False
    except FileNotFoundError:
        print(f"⚠️  {filepath.split('/')[-1]:<35} NOT FOUND")
    except Exception as e:
        print(f"❌ {filepath.split('/')[-1]:<35} ERROR")
        print(f"   {str(e)}")
        all_good = False

print("=" * 70)
if all_good:
    print("✅ ALL FILES HAVE VALID SYNTAX")
else:
    print("❌ SOME FILES HAVE SYNTAX ERRORS")
print("=" * 70)

sys.exit(0 if all_good else 1)
