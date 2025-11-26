"""Repositories package for the app.

This file makes the `app.repositories` package importable for IDEs and
static analysis tools. It can also re-export common repository classes for
convenience.
"""

from .category_banner_repository import CategoryBannerRepository

__all__ = ["CategoryBannerRepository"]
