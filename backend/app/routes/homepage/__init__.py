"""Homepage Batch API Route - Single endpoint for all homepage data."""
import asyncio
import logging

from flask import Blueprint, jsonify, request
from flask_cors import cross_origin

from app.services.homepage.aggregator import get_homepage_data

logger = logging.getLogger(__name__)

homepage_routes = Blueprint("homepage_routes", __name__)


@homepage_routes.route("/api/homepage", methods=["GET"])
@cross_origin()
def get_homepage():
    """
    Unified homepage batch endpoint.

    Fetches all homepage sections in parallel:
    - Categories
    - Carousel items
    - Flash sale products
    - Featured products (luxury, new arrivals, top picks, trending, daily finds)
    - All products (paginated)
    - Contact CTA slides
    - Topbar slides
    - Product showcase panels
    - Premium experience panels

    Query Parameters:
        categories_limit    int  default 20   (5–100)
        flash_sale_limit    int  default 20   (5–100)
        luxury_limit        int  default 12   (5–100)
        all_products_limit  int  default 12   (5–100)
        all_products_page   int  default 1

    Returns:
        JSON with all homepage sections plus cache and timing headers.

    Performance:
        Cached responses : <50 ms  (Redis hit)
        First requests   : ~50–150 ms  (parallel DB queries)
    """
    try:
        # --- Parse & clamp query parameters ---
        categories_limit = min(max(request.args.get("categories_limit", 20, type=int), 5), 100)
        flash_sale_limit = min(max(request.args.get("flash_sale_limit", 20, type=int), 5), 100)
        luxury_limit = min(max(request.args.get("luxury_limit", 12, type=int), 5), 100)
        all_products_limit = min(max(request.args.get("all_products_limit", 12, type=int), 5), 100)
        all_products_page = max(request.args.get("all_products_page", 1, type=int), 1)

        logger.debug(
            "[Homepage Route] Request params — "
            f"categories={categories_limit}, flash_sale={flash_sale_limit}, "
            f"luxury={luxury_limit}, all_products={all_products_limit}, "
            f"page={all_products_page}"
        )

        # --- Run async aggregator (Flask-safe, no manual loop management) ---
        homepage_data, meta = asyncio.run(
            get_homepage_data(
                categories_limit=categories_limit,
                flash_sale_limit=flash_sale_limit,
                luxury_limit=luxury_limit,
                all_products_limit=all_products_limit,
                all_products_page=all_products_page,
            )
        )

        # --- Build standardised response ---
        response_body = {
            "status": "success",
            "data": homepage_data,
            "meta": {
                "cache_hit": meta["cache_hit"],
                "cache_key": meta["cache_key"],
                "timestamp": meta["timestamp"],
                "errors": meta["partial_failures"],
            },
        }

        response = jsonify(response_body)

        # Accurate X-Cache header derived from aggregator metadata
        response.headers["X-Cache"] = "HIT" if meta["cache_hit"] else "MISS"
        response.headers["X-Cache-Key"] = meta["cache_key"]
        response.headers["Cache-Control"] = "public, max-age=60"
        response.headers["X-Content-Type-Options"] = "nosniff"

        logger.debug(
            f"[Homepage Route] Response ready — "
            f"X-Cache: {'HIT' if meta['cache_hit'] else 'MISS'}, "
            f"failures: {meta['partial_failures'] or 'none'}"
        )
        return response, 200

    except Exception as e:
        logger.error(f"[Homepage Route] Unhandled error: {e}")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Failed to load homepage data",
                    "data": {
                        "categories": [],
                        "carousel_items": [],
                        "flash_sale_products": [],
                        "luxury_products": [],
                        "new_arrivals": [],
                        "top_picks": [],
                        "trending_products": [],
                        "daily_finds": [],
                        "all_products": {
                            "products": [],
                            "has_more": False,
                            "total": 0,
                            "page": 1,
                        },
                        "contact_cta_slides": [],
                        "topbar_slides": [],
                        "product_showcase": [],
                        "premium_experiences": [],
                    },
                    "meta": {
                        "cache_hit": False,
                        "cache_key": None,
                        "timestamp": None,
                        "errors": ["critical_failure"],
                    },
                }
            ),
            500,
        )
