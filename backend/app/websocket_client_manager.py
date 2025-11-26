"""
WebSocket implementation for Mizizzi E-commerce Platform
Provides real-time communication capabilities for the application.
"""
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
import logging
from flask import request
from flask_jwt_extended import decode_token, get_jwt_identity
import json
from datetime import datetime
import threading
from collections import defaultdict

# Set up logger
logger = logging.getLogger(__name__)

# Keeping ClientManager class as utility if needed, but disabling SocketIO initialization
logger.warning("⚠️ websocket_client_manager.py is deprecated - use backend/websocket.py instead")

# Thread-safe client management
class ClientManager:
    def __init__(self):
        self._clients = {}
        self._rooms = defaultdict(set)
        self._lock = threading.Lock()

    def add_client(self, sid, user_id=None, user_type='guest'):
        with self._lock:
            self._clients[sid] = {
                'user_id': user_id,
                'user_type': user_type,
                'connected_at': datetime.utcnow(),
                'rooms': set()
            }
            logger.info(f"Client {sid} connected as {user_type} (user_id: {user_id})")

    def remove_client(self, sid):
        with self._lock:
            if sid in self._clients:
                client_info = self._clients[sid]
                # Remove from all rooms
                for room in client_info['rooms']:
                    self._rooms[room].discard(sid)
                del self._clients[sid]
                logger.info(f"Client {sid} disconnected")

    def join_room(self, sid, room):
        with self._lock:
            if sid in self._clients:
                self._clients[sid]['rooms'].add(room)
                self._rooms[room].add(sid)
                logger.info(f"Client {sid} joined room {room}")

    def leave_room(self, sid, room):
        with self._lock:
            if sid in self._clients:
                self._clients[sid]['rooms'].discard(room)
                self._rooms[room].discard(sid)
                logger.info(f"Client {sid} left room {room}")

    def get_client_info(self, sid):
        with self._lock:
            return self._clients.get(sid)

    def get_room_clients(self, room):
        with self._lock:
            return list(self._rooms[room])

    def get_stats(self):
        with self._lock:
            return {
                'total_clients': len(self._clients),
                'total_rooms': len(self._rooms),
                'clients_by_type': {
                    'admin': len([c for c in self._clients.values() if c['user_type'] == 'admin']),
                    'user': len([c for c in self._clients.values() if c['user_type'] == 'user']),
                    'guest': len([c for c in self._clients.values() if c['user_type'] == 'guest'])
                }
            }

# Global client manager instance
client_manager = ClientManager()

# Authentication helper
def authenticate_socket_user(token):
    """Authenticate user from JWT token"""
    try:
        if not token:
            return None, 'guest'

        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]

        # Decode JWT token
        decoded_token = decode_token(token)
        user_id = decoded_token.get('sub')
        user_type = decoded_token.get('user_type', 'user')

        return user_id, user_type
    except Exception as e:
        logger.warning(f"Socket authentication failed: {str(e)}")
        return None, 'guest'

# Utility functions for external use
def emit_to_user(user_id, event, data):
    """Emit event to specific user"""
    try:
        # Placeholder for SocketIO emit call
        pass
    except Exception as e:
        logger.error(f"Error emitting to user {user_id}: {str(e)}")

def emit_to_admin(event, data):
    """Emit event to all admin users"""
    try:
        # Placeholder for SocketIO emit call
        pass
    except Exception as e:
        logger.error(f"Error emitting to admin: {str(e)}")

def emit_to_room(room, event, data):
    """Emit event to specific room"""
    try:
        # Placeholder for SocketIO emit call
        pass
    except Exception as e:
        logger.error(f"Error emitting to room {room}: {str(e)}")

def get_connection_stats():
    """Get current connection statistics"""
    return client_manager.get_stats()

logger.info("WebSocket handlers initialized successfully")
