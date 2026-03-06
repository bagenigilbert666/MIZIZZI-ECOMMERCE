"""
Guest Cart Session Management
Handles guest user cart persistence and conversion to logged-in user carts.
"""
import json
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
import uuid

from app.cache.cart_cache import get_cart_cache_manager

logger = logging.getLogger(__name__)
cart_cache = get_cart_cache_manager()


class GuestCartSessionManager:
    """Manages guest user cart sessions."""
    
    @staticmethod
    def create_guest_session() -> str:
        """
        Create a new guest session ID.
        
        Returns:
            Unique guest session identifier (UUID)
        """
        return str(uuid.uuid4())
    
    @staticmethod
    def save_guest_session(guest_id: str, cart_items: List[Dict[str, Any]]) -> bool:
        """
        Save guest cart session to Redis.
        
        Args:
            guest_id: Guest session ID
            cart_items: List of items in cart
            
        Returns:
            True if successful, False otherwise
        """
        try:
            cart_data = {
                'guest_id': guest_id,
                'items': cart_items,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'coupon_code': None,
                'totals': GuestCartSessionManager.calculate_session_totals(cart_items)
            }
            
            return cart_cache.save_guest_cart(guest_id, cart_data)
        
        except Exception as e:
            logger.error(f"Error saving guest session {guest_id}: {e}")
            return False
    
    @staticmethod
    def retrieve_guest_session(guest_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve guest cart session from Redis.
        
        Args:
            guest_id: Guest session ID
            
        Returns:
            Cart data or None if expired
        """
        try:
            return cart_cache.get_guest_cart(guest_id)
        except Exception as e:
            logger.error(f"Error retrieving guest session {guest_id}: {e}")
            return None
    
    @staticmethod
    def update_guest_session(guest_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update guest cart session.
        
        Args:
            guest_id: Guest session ID
            updates: Dictionary with updates (items, coupon_code, etc.)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Retrieve existing session
            cart_data = cart_cache.get_guest_cart(guest_id)
            if not cart_data:
                logger.warning(f"Guest session {guest_id} not found for update")
                return False
            
            # Apply updates
            if 'items' in updates:
                cart_data['items'] = updates['items']
                cart_data['totals'] = GuestCartSessionManager.calculate_session_totals(updates['items'])
            
            if 'coupon_code' in updates:
                cart_data['coupon_code'] = updates['coupon_code']
            
            cart_data['updated_at'] = datetime.now().isoformat()
            
            # Save updated data
            return cart_cache.save_guest_cart(guest_id, cart_data)
        
        except Exception as e:
            logger.error(f"Error updating guest session {guest_id}: {e}")
            return False
    
    @staticmethod
    def add_item_to_guest_cart(guest_id: str, product_id: int, quantity: int, price: float) -> bool:
        """
        Add item to guest cart.
        
        Args:
            guest_id: Guest session ID
            product_id: Product ID
            quantity: Quantity to add
            price: Product price
            
        Returns:
            True if successful, False otherwise
        """
        try:
            cart_data = cart_cache.get_guest_cart(guest_id)
            if not cart_data:
                # Create new cart if doesn't exist
                cart_data = {
                    'guest_id': guest_id,
                    'items': [],
                    'created_at': datetime.now().isoformat(),
                    'coupon_code': None
                }
            
            # Check if item already in cart
            existing_item = None
            for item in cart_data['items']:
                if item['product_id'] == product_id:
                    existing_item = item
                    break
            
            if existing_item:
                # Update quantity
                existing_item['quantity'] += quantity
            else:
                # Add new item
                cart_data['items'].append({
                    'product_id': product_id,
                    'quantity': quantity,
                    'price': price,
                    'added_at': datetime.now().isoformat()
                })
            
            # Recalculate totals
            cart_data['totals'] = GuestCartSessionManager.calculate_session_totals(cart_data['items'])
            cart_data['updated_at'] = datetime.now().isoformat()
            
            # Save updated cart
            return cart_cache.save_guest_cart(guest_id, cart_data)
        
        except Exception as e:
            logger.error(f"Error adding item to guest cart {guest_id}: {e}")
            return False
    
    @staticmethod
    def remove_item_from_guest_cart(guest_id: str, product_id: int) -> bool:
        """
        Remove item from guest cart.
        
        Args:
            guest_id: Guest session ID
            product_id: Product ID to remove
            
        Returns:
            True if successful, False otherwise
        """
        try:
            cart_data = cart_cache.get_guest_cart(guest_id)
            if not cart_data:
                return False
            
            # Remove item
            cart_data['items'] = [
                item for item in cart_data['items']
                if item['product_id'] != product_id
            ]
            
            # Recalculate totals
            cart_data['totals'] = GuestCartSessionManager.calculate_session_totals(cart_data['items'])
            cart_data['updated_at'] = datetime.now().isoformat()
            
            # Save updated cart
            return cart_cache.save_guest_cart(guest_id, cart_data)
        
        except Exception as e:
            logger.error(f"Error removing item from guest cart {guest_id}: {e}")
            return False
    
    @staticmethod
    def clear_guest_cart(guest_id: str) -> bool:
        """
        Clear all items from guest cart.
        
        Args:
            guest_id: Guest session ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            cart_data = cart_cache.get_guest_cart(guest_id)
            if not cart_data:
                return False
            
            cart_data['items'] = []
            cart_data['totals'] = GuestCartSessionManager.calculate_session_totals([])
            cart_data['updated_at'] = datetime.now().isoformat()
            
            return cart_cache.save_guest_cart(guest_id, cart_data)
        
        except Exception as e:
            logger.error(f"Error clearing guest cart {guest_id}: {e}")
            return False
    
    @staticmethod
    def delete_guest_session(guest_id: str) -> bool:
        """
        Delete guest cart session (e.g., after checkout).
        
        Args:
            guest_id: Guest session ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            return cart_cache.delete_guest_cart(guest_id)
        except Exception as e:
            logger.error(f"Error deleting guest session {guest_id}: {e}")
            return False
    
    @staticmethod
    def convert_guest_to_user_cart(guest_id: str, user_id: int) -> bool:
        """
        Convert guest cart to logged-in user cart in database.
        
        Args:
            guest_id: Guest session ID
            user_id: User ID to convert to
            
        Returns:
            True if successful, False otherwise
        """
        try:
            from ...models.models import Cart, CartItem, db, Product
            
            # Retrieve guest cart data
            guest_cart = cart_cache.get_guest_cart(guest_id)
            if not guest_cart:
                logger.warning(f"Guest cart {guest_id} not found for conversion")
                return False
            
            # Create or get user cart
            user_cart = Cart.query.filter_by(
                user_id=user_id,
                is_active=True
            ).first()
            
            if not user_cart:
                user_cart = Cart(user_id=user_id, is_active=True)
                db.session.add(user_cart)
                db.session.flush()
            
            # Convert guest items to user cart items
            for item in guest_cart.get('items', []):
                # Check if item already in user cart
                existing_item = CartItem.query.filter_by(
                    cart_id=user_cart.id,
                    product_id=item['product_id']
                ).first()
                
                if existing_item:
                    # Update quantity
                    existing_item.quantity += item['quantity']
                else:
                    # Create new cart item
                    cart_item = CartItem(
                        cart_id=user_cart.id,
                        user_id=user_id,
                        product_id=item['product_id'],
                        quantity=item['quantity'],
                        price=item.get('price', 0)
                    )
                    db.session.add(cart_item)
            
            # Apply coupon if any
            if guest_cart.get('coupon_code'):
                user_cart.coupon_code = guest_cart['coupon_code']
            
            # Update totals
            user_cart.update_totals()
            
            # Commit transaction
            db.session.commit()
            
            # Delete guest cart session from Redis
            cart_cache.delete_guest_cart(guest_id)
            
            logger.info(f"Successfully converted guest cart {guest_id} to user {user_id}")
            return True
        
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error converting guest cart {guest_id} to user {user_id}: {e}")
            return False
    
    @staticmethod
    def calculate_session_totals(items: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Calculate totals for guest cart session.
        
        Args:
            items: List of cart items
            
        Returns:
            Dictionary with calculated totals
        """
        subtotal = sum(item.get('price', 0) * item.get('quantity', 1) for item in items)
        tax = 0  # Configure tax rate as needed
        shipping = 200 if items else 0  # Default shipping cost
        discount = 0  # Set discount based on coupons
        
        total = subtotal + tax + shipping - discount
        
        return {
            'subtotal': subtotal,
            'tax': tax,
            'shipping': shipping,
            'discount': discount,
            'total': max(0, total),  # Ensure total is not negative
            'item_count': len(items),
            'quantity_count': sum(item.get('quantity', 1) for item in items)
        }
    
    @staticmethod
    def get_session_info(guest_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed guest session information.
        
        Args:
            guest_id: Guest session ID
            
        Returns:
            Session information or None
        """
        try:
            session = cart_cache.get_guest_cart(guest_id)
            if session:
                return {
                    'guest_id': guest_id,
                    'item_count': len(session.get('items', [])),
                    'total': session.get('totals', {}).get('total', 0),
                    'created_at': session.get('created_at'),
                    'updated_at': session.get('updated_at'),
                    'expires_at': session.get('expires_at'),
                    'has_coupon': bool(session.get('coupon_code'))
                }
            return None
        except Exception as e:
            logger.error(f"Error getting session info for {guest_id}: {e}")
            return None
