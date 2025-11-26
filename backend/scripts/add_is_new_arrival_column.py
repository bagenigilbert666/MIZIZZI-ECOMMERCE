import os
import sys
from sqlalchemy import create_engine, text

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def add_is_new_arrival_column():
    """Add is_new_arrival column to products table if it doesn't exist."""
    
    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL', 'postgresql://mizizzi:junior2020@localhost:5432/mizizzi')
    
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return False
        
    print(f"Connecting to database...")
    
    try:
        engine = create_engine(database_url)
        with engine.connect() as connection:
            # Check if column exists
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='products' AND column_name='is_new_arrival'
            """)
            
            result = connection.execute(check_query)
            if result.fetchone():
                print("✅ Column 'is_new_arrival' already exists in 'products' table")
            else:
                print("⚠️ Column 'is_new_arrival' missing. Adding it now...")
                
                # Add the column
                alter_query = text("""
                    ALTER TABLE products 
                    ADD COLUMN is_new_arrival BOOLEAN DEFAULT FALSE
                """)
                
                connection.execute(alter_query)
                connection.commit()
                print("✅ Successfully added 'is_new_arrival' column to 'products' table")
                
            return True
            
    except Exception as e:
        print(f"❌ Error updating database: {str(e)}")
        return False

if __name__ == "__main__":
    success = add_is_new_arrival_column()
    if success:
        print("\n🎉 Database migration completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Database migration failed!")
        sys.exit(1)
