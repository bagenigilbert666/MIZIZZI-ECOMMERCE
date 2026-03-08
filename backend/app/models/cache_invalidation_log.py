"""
Cache Invalidation Log Model
Tracks all cache invalidation operations for audit trail
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Index
from sqlalchemy.orm import declarative_base
import uuid

Base = declarative_base()


class CacheInvalidationLog(Base):
    """
    Model for tracking cache invalidation operations
    """
    __tablename__ = "cache_invalidation_logs"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Admin user information
    admin_id = Column(Integer, nullable=True, index=True)
    admin_name = Column(String(255), nullable=True)
    
    # Action information
    action = Column(String(50), nullable=False, index=True)  # invalidate_single, invalidate_group, rebuild, invalidate_all
    cache_groups = Column(JSON, nullable=True)  # Array of affected cache group names
    redis_patterns = Column(JSON, nullable=True)  # Array of Redis patterns invalidated
    
    # Result information
    keys_deleted = Column(Integer, default=0)
    status = Column(String(20), nullable=False, default="success")  # success, failed, partial
    error_message = Column(Text, nullable=True)
    
    # Metadata
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Indexes for common queries
    __table_args__ = (
        Index('idx_admin_id_timestamp', 'admin_id', 'created_at'),
        Index('idx_action_timestamp', 'action', 'created_at'),
        Index('idx_status', 'status'),
    )

    def __repr__(self):
        return f"<CacheInvalidationLog(id={self.id}, action={self.action}, status={self.status}, created_at={self.created_at})>"

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "admin_id": self.admin_id,
            "admin_name": self.admin_name,
            "action": self.action,
            "cache_groups": self.cache_groups or [],
            "redis_patterns": self.redis_patterns or [],
            "keys_deleted": self.keys_deleted,
            "status": self.status,
            "error_message": self.error_message,
            "ip_address": self.ip_address,
            "timestamp": self.created_at.isoformat(),
        }
