#!/usr/bin/env python3
"""
Initialize enhanced product indexes in the database
Reads and executes the enhanced_product_indexes.sql file
"""

import os
import sys
from pathlib import Path
import sqlite3
from sqlalchemy import text, create_engine
from sqlalchemy.orm import Session

def get_database_url():
    """Get database URL from environment or use default"""
    return os.getenv('DATABASE_URL', 'sqlite:///instance/database.db')

def read_sql_script(script_path):
    """Read SQL script file"""
    with open(script_path, 'r') as f:
        return f.read()

def execute_sql_script(sql_content):
    """Execute SQL script using SQLAlchemy"""
    try:
        db_url = get_database_url()
        engine = create_engine(db_url)
        
        # Split SQL into individual statements
        statements = [s.strip() for s in sql_content.split(';') if s.strip()]
        
        with engine.connect() as connection:
            print(f"[INFO] Executing {len(statements)} SQL statements...")
            
            successful = 0
            failed = 0
            skipped = 0
            
            for i, statement in enumerate(statements, 1):
                # Skip comments and empty lines
                if statement.startswith('--') or not statement.strip():
                    skipped += 1
                    continue
                
                try:
                    # Execute statement
                    connection.execute(text(statement + ';'))
                    successful += 1
                    
                    # Extract index name from statement if CREATE INDEX
                    if 'CREATE INDEX' in statement.upper():
                        # Extract index name
                        parts = statement.split()
                        if 'IF NOT EXISTS' in statement.upper():
                            idx = parts.index('IF') + 3
                        else:
                            idx = parts.index('INDEX') + 1
                        
                        if idx < len(parts):
                            index_name = parts[idx]
                            print(f"  ✓ [{i}/{len(statements)}] Index created: {index_name}")
                    
                except Exception as e:
                    # If index already exists, it's not an error
                    if 'already exists' in str(e) or 'UNIQUE constraint failed' in str(e):
                        successful += 1
                        print(f"  → [{i}/{len(statements)}] Index already exists (skipped)")
                    else:
                        failed += 1
                        print(f"  ✗ [{i}/{len(statements)}] Error: {str(e)[:100]}")
            
            # Commit all changes
            connection.commit()
            
            print(f"\n[✓] Index creation completed:")
            print(f"  - Successful: {successful}")
            print(f"  - Failed: {failed}")
            print(f"  - Skipped: {skipped}")
            
            return failed == 0
            
    except Exception as e:
        print(f"[ERROR] Failed to execute SQL script: {e}")
        return False

def analyze_database():
    """Run ANALYZE to update query statistics"""
    try:
        db_url = get_database_url()
        engine = create_engine(db_url)
        
        with engine.connect() as connection:
            print("\n[INFO] Running ANALYZE to update statistics...")
            connection.execute(text("ANALYZE"))
            connection.commit()
            print("[✓] Database statistics updated")
            
        return True
    except Exception as e:
        print(f"[ERROR] Failed to analyze database: {e}")
        return False

def get_index_count():
    """Get count of indexes on products table"""
    try:
        db_url = get_database_url()
        
        # For SQLite
        if 'sqlite' in db_url:
            db_path = db_url.replace('sqlite:///', '')
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) FROM sqlite_master 
                WHERE type='index' AND tbl_name='products'
            """)
            count = cursor.fetchone()[0]
            conn.close()
            return count
        
        return None
    except Exception as e:
        print(f"[ERROR] Failed to get index count: {e}")
        return None

def print_summary():
    """Print summary of indexes"""
    try:
        db_url = get_database_url()
        
        if 'sqlite' in db_url:
            db_path = db_url.replace('sqlite:///', '')
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT name, sql FROM sqlite_master 
                WHERE type='index' AND tbl_name='products'
                ORDER BY name
            """)
            
            indexes = cursor.fetchall()
            
            print("\n[INFO] Index Summary:")
            print(f"Total indexes on 'products' table: {len(indexes)}")
            
            # Group by type
            composite = []
            single = []
            conditional = []
            
            for name, sql in indexes:
                if ' WHERE ' in sql:
                    conditional.append(name)
                elif sql.count(',') > 0:  # Rough check for composite
                    composite.append(name)
                else:
                    single.append(name)
            
            print(f"  - Single column: {len(single)}")
            print(f"  - Composite: {len(composite)}")
            print(f"  - Conditional: {len(conditional)}")
            
            conn.close()
            
    except Exception as e:
        print(f"[WARNING] Could not print summary: {e}")

def main():
    """Main execution function"""
    print("="*80)
    print("DATABASE INDEX INITIALIZATION")
    print("="*80)
    
    # Get script path
    script_dir = Path(__file__).parent
    sql_script = script_dir / 'enhanced_product_indexes.sql'
    
    if not sql_script.exists():
        print(f"[ERROR] SQL script not found: {sql_script}")
        return False
    
    print(f"\n[INFO] Reading SQL script: {sql_script}")
    sql_content = read_sql_script(sql_script)
    
    # Count statements
    statements = [s for s in sql_content.split(';') if s.strip() and not s.strip().startswith('--')]
    print(f"[INFO] Found {len(statements)} SQL statements to execute")
    
    # Get initial index count
    initial_count = get_index_count()
    if initial_count is not None:
        print(f"[INFO] Current indexes on 'products': {initial_count}")
    
    # Execute SQL
    print("\n[STEP 1] Creating indexes...")
    if not execute_sql_script(sql_content):
        print("[ERROR] Failed to create indexes")
        return False
    
    # Analyze database
    print("\n[STEP 2] Updating database statistics...")
    if not analyze_database():
        print("[ERROR] Failed to analyze database")
        return False
    
    # Print summary
    print("\n[STEP 3] Index summary:")
    print_summary()
    
    print("\n" + "="*80)
    print("[✓] INDEX INITIALIZATION COMPLETED SUCCESSFULLY")
    print("="*80)
    print("\nNext steps:")
    print("1. Run your application to generate query metrics")
    print("2. Monitor index performance over time")
    print("3. Use monitor_indexes.py to check index health")
    print("4. The indexes will automatically speed up:")
    print("   - Category/brand filtering")
    print("   - Price range queries")
    print("   - Featured/sale/trending product queries")
    print("   - Pagination and sorting")
    print("   - Combined multi-column filters")
    print("\n")

if __name__ == '__main__':
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n[INFO] Initialization cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        sys.exit(1)
