"""
Meilisearch integration package for Mizizzi E-commerce platform.
Provides search indexing and querying functionality using Meilisearch.
"""

from .meilisearch_routes import meilisearch_routes, admin_meilisearch_routes
from .meilisearch_client import MeilisearchClient, get_meilisearch_client, reset_meilisearch_client

__all__ = [
    'meilisearch_routes',
    'admin_meilisearch_routes', 
    'MeilisearchClient',
    'get_meilisearch_client',
    'reset_meilisearch_client'
]
