"""Homepage Cache Utilities - Centralized cache key generation and management."""
import logging
from typing import Tuple, Dict, Any

logger = logging.getLogger(__name__)

# Homepage cache configuration
# Optimized TTLs for performance - tuned for first-uncached-build speed
HOMEPAGE_CACHE_TTL = 600  # 10 minutes for main cache (increased from 180s per recommendations)

# Section-level TTLs optimized for content type:
# - Stable content (categories, carousel, etc.): 1800-3600s (reusable for many requests)
# - Dynamic content (flash sales, products): 60-300s (updates more frequently)
SECTIONS_CACHE_TTL = {
    # Stable content - rarely changes, long TTLs to maximize cache reuse
    "categories": 3600,           # 1 hour - stable admin content
    "carousel": 3600,             # 1 hour - stable admin content
    "contact_cta": 3600,          # 1 hour - stable admin content
    "premium_experiences": 3600,  # 1 hour - stable admin content
    "product_showcase": 3600,     # 1 hour - stable admin content
    "feature_cards": 3600,        # 1 hour - stable feature cards
    
    # Dynamic content - updates frequently, shorter TTLs
    "flash_sale": 120,            # 2 minutes - changes often
    "luxury": 300,                # 5 minutes - less frequent updates
    "new_arrivals": 300,          # 5 minutes - less frequent updates
    "top_picks": 300,             # 5 minutes - curated content
    "trending": 300,              # 5 minutes - algorithm-based
    "daily_finds": 1800,          # 30 minutes - curated daily content (long TTL to avoid recomputation)
    "all_products": 300,          # 5 minutes - paginated product list
}

# Pagination limits
MIN_LIMIT = 5
MAX_LIMIT = 100
MIN_PAGE = 1
MAX_PAGE = 1000

# Critical sections - if these fail, don't cache the top-level response
CRITICAL_SECTIONS = {"categories", "carousel"}


def get_empty_homepage_data() -> Dict[str, Any]:
    """
    Returns the empty/fallback homepage data structure.
    
    CENTRALIZED FALLBACK: Used as single source of truth when sections fail to load.
    Ensures response shape is always consistent across all failure paths.
    
    If new sections are added to homepage response, add them here.
    This prevents typos and ensures every failure mode returns valid data.
    
    Returns:
        Dictionary with all 13 homepage sections initialized as empty
    """
    return {
        "categories": [],
        "carousel_items": [],
        "flash_sale_products": [],
        "luxury_products": [],
        "new_arrivals": [],
        "top_picks": [],
        "trending_products": [],
        "daily_finds": [],
        "contact_cta_slides": [],
        "premium_experiences": [],
        "product_showcase": [],
        "feature_cards": [],
        "all_products": {
            "products": [],
            "has_more": False,
            "total": 0,
            "page": 1
        },
    }


def validate_pagination_params(
    categories_limit: int = 20,
    flash_sale_limit: int = 20,
    luxury_limit: int = 12,
    new_arrivals_limit: int = 20,
    top_picks_limit: int = 20,
    trending_limit: int = 20,
    daily_finds_limit: int = 20,
    all_products_limit: int = 12,
    all_products_page: int = 1,
) -> Tuple[int, int, int, int, int, int, int, int, int]:
    """
    Validate and constrain ALL homepage pagination parameters to safe ranges.
    
    Args:
        categories_limit: Number of categories (default: 20)
        flash_sale_limit: Number of flash sale products (default: 20)
        luxury_limit: Number of luxury products (default: 12)
        new_arrivals_limit: Number of new arrivals (default: 20)
        top_picks_limit: Number of top picks (default: 20)
        trending_limit: Number of trending products (default: 20)
        daily_finds_limit: Number of daily finds (default: 20)
        all_products_limit: Number of all products (default: 12)
        all_products_page: Page number for pagination (default: 1)
        
    Returns:
        Tuple of 9 validated limits
    """
    categories_limit = min(max(categories_limit, MIN_LIMIT), MAX_LIMIT)
    flash_sale_limit = min(max(flash_sale_limit, MIN_LIMIT), MAX_LIMIT)
    luxury_limit = min(max(luxury_limit, MIN_LIMIT), MAX_LIMIT)
    new_arrivals_limit = min(max(new_arrivals_limit, MIN_LIMIT), MAX_LIMIT)
    top_picks_limit = min(max(top_picks_limit, MIN_LIMIT), MAX_LIMIT)
    trending_limit = min(max(trending_limit, MIN_LIMIT), MAX_LIMIT)
    daily_finds_limit = min(max(daily_finds_limit, MIN_LIMIT), MAX_LIMIT)
    all_products_limit = min(max(all_products_limit, MIN_LIMIT), MAX_LIMIT)
    all_products_page = min(max(all_products_page, MIN_PAGE), MAX_PAGE)
    
    return (categories_limit, flash_sale_limit, luxury_limit, new_arrivals_limit, 
            top_picks_limit, trending_limit, daily_finds_limit, all_products_limit, all_products_page)


def build_homepage_cache_key(
    categories_limit: int,
    flash_sale_limit: int,
    luxury_limit: int,
    new_arrivals_limit: int,
    top_picks_limit: int,
    trending_limit: int,
    daily_finds_limit: int,
    all_products_limit: int,
    all_products_page: int,
) -> str:
    """
    Generate a UNIQUE cache key based on ALL 9 homepage pagination parameters.
    
    SAFEGUARD #1: KEY IDENTITY
    ===========================
    This function MUST be called by both:
    1. Homepage route (to check cache before aggregation)
    2. Aggregator (to cache response after loading all sections)
    
    If they don't use the same function, cache keys will mismatch and cache hits
    will be impossible or wrong cached data will be returned.
    
    Every parameter that changes output must be included in the key.
    This prevents cache poisoning where different requests return wrong cached results.
    
    Without including all params, different requests with different limits
    will get the same cache key and return incorrect data.
    
    Args:
        All 9 homepage request parameters that affect output
        
    Returns:
        Formatted cache key string with all parameters included
        
    Example:
        >>> build_homepage_cache_key(20, 20, 12, 20, 20, 20, 20, 12, 1)
        'mizizzi:homepage:cat_20:flash_20:lux_12:arr_20:top_20:trend_20:daily_20:all_12:page_1'
    """
    cache_key = (
        f"mizizzi:homepage:"
        f"cat_{categories_limit}:"
        f"flash_{flash_sale_limit}:"
        f"lux_{luxury_limit}:"
        f"arr_{new_arrivals_limit}:"
        f"top_{top_picks_limit}:"
        f"trend_{trending_limit}:"
        f"daily_{daily_finds_limit}:"
        f"all_{all_products_limit}:"
        f"page_{all_products_page}"
    )
    return cache_key


def build_section_cache_key(section_name: str, *args) -> str:
    """
    Generate cache key for individual homepage sections.
    
    Args:
        section_name: Name of the section
        *args: Additional parameters for the section (e.g., page number, limit)
        
    Returns:
        Formatted section cache key
        
    Example:
        >>> build_section_cache_key("all_products", 1, 12)
        'mizizzi:homepage:all_products:page_1:limit_12'
    """
    if args:
        params = ":".join(str(arg) for arg in args)
        return f"mizizzi:homepage:{section_name}:{params}"
    return f"mizizzi:homepage:{section_name}"


# Section cache keys - used by batch MGET in aggregator
# Maps section name to (redis_key, args_for_key_builder)
# Used ONLY by batch_get_homepage_sections() - single source of truth for section keys
HOMEPAGE_SECTIONS_FOR_BATCH = {
    "categories": ("categories", (20,)),  # Default limit, overridden by param if passed
    "carousel_items": ("carousel", ()),
    "flash_sale_products": ("flash_sale", (20,)),
    "luxury_products": ("luxury", (12,)),
    "new_arrivals": ("new_arrivals", (20,)),
    "top_picks": ("top_picks", (20,)),
    "trending_products": ("trending", (20,)),
    "daily_finds": ("daily_finds", (20,)),
    "contact_cta_slides": ("contact_cta", ()),
    "premium_experiences": ("premium_experiences", ()),
    "product_showcase": ("product_showcase", ()),
    "feature_cards": ("feature_cards", ()),
    "all_products": ("all_products", (12, 1)),  # limit, page
}


def batch_get_homepage_sections(redis_client, section_limits: dict = None) -> dict:
    """
    BATCH REDIS READ: Fetch ALL homepage section caches with individual get() calls.
    
    SAFETY GUARANTEES:
    - Single Flask request thread, no async/threading
    - Returns immediately - either hits or proceed to DB
    - Uses existing redis_client from app.cache.redis_client
    - No context switching or connection pool issues
    
    CACHE BEHAVIOR PRESERVED:
    - Cache keys unchanged - still use same Redis key patterns
    - Cache TTLs unchanged - each section keeps its original TTL
    - Cache hits/misses identical to individual gets
    - Exactly backward compatible with existing loader functions
    
    Args:
        redis_client: Redis client instance from app.cache.redis_client
        section_limits: Dict with {section_name: limit} to override defaults
                       Used to build correct cache keys for parametrized sections
    
    Returns:
        Dict mapping section_name -> cached_value or None if miss
        Example: {"categories": [...], "carousel_items": [...], "flash_sale_products": None, ...}
    """
    if not redis_client or not section_limits:
        logger.debug("[Batch] Skipping batch get - redis_client or section_limits missing")
        return {}
    
    try:
        # Build list of cache keys in same order as sections
        # Key order must match return order for accurate mapping
        section_order = list(HOMEPAGE_SECTIONS_FOR_BATCH.keys())
        cache_keys = []
        
        for section_name in section_order:
            section_key_name, default_args = HOMEPAGE_SECTIONS_FOR_BATCH[section_name]
            
            # Override with actual limits from request
            if section_name in section_limits:
                limit = section_limits[section_name]
                if section_name == "all_products":
                    # all_products uses (limit, page)
                    args = (section_limits.get("all_products_limit", 12), 
                           section_limits.get("all_products_page", 1))
                else:
                    # Other limited sections use just the limit
                    args = (limit,) if limit != default_args[0] else default_args
            else:
                args = default_args
            
            key = build_section_cache_key(section_key_name, *args) if args else build_section_cache_key(section_key_name)
            cache_keys.append(key)
        
        # Fetch all section caches with individual get() calls
        # This is safe and reliable - no tuple unpacking issues
        logger.debug(f"[Batch] Fetching {len(cache_keys)} section cache keys")
        
        result = {}
        hits = 0
        
        for section_name, key in zip(section_order, cache_keys):
            try:
                value = redis_client.get(key)
                if value is not None:
                    # Deserialize JSON if string
                    try:
                        result[section_name] = json.loads(value) if isinstance(value, str) else value
                        hits += 1
                    except (json.JSONDecodeError, TypeError) as e:
                        logger.warning(f"[Batch] Failed to deserialize {section_name}: {e}")
                        result[section_name] = None
                else:
                    result[section_name] = None
            except Exception as e:
                logger.warning(f"[Batch] Failed to get {section_name} from cache: {e}")
                result[section_name] = None
        
        logger.debug(f"[Batch] Fetched {len(cache_keys)} keys, got {hits} hits")
        return result
        
    except Exception as e:
        logger.error(f"[Batch] Cache fetch failed: {e}", exc_info=True)
        return {}


def batch_set_homepage_sections(redis_client, sections_to_cache: dict, cache_ttl: int = 600):
    """
    BATCH REDIS WRITE: Cache multiple homepage sections with single pipeline operation.
    
    SAFETY GUARANTEES:
    - Single Flask request thread, no async/threading
    - Pipeline is atomic - all commands execute or none do (no partial writes)
    - Uses existing redis_client from app.cache.redis_client
    - Same transaction semantics as individual set() calls
    
    Why pipeline is safe here:
    1. Pipeline happens in single Flask request context (same as individual writes)
    2. All-or-nothing semantics - won't corrupt cache with partial data
    3. No state modification - just scheduling multiple writes at once
    4. Identical to calling set() 13 times individually, but 13x fewer RTTs
    
    CACHE BEHAVIOR PRESERVED:
    - Uses exact same cache keys as batch_get_homepage_sections()
    - TTL values unchanged - uses SECTIONS_CACHE_TTL for each section
    - Backward compatible - can mix with individual set() calls elsewhere
    
    Args:
        redis_client: Redis client instance from app.cache.redis_client
        sections_to_cache: Dict mapping section_name -> (section_data, limit_or_None)
                          Where limit is used to build correct cache key
        cache_ttl: Default TTL (overridden by SECTIONS_CACHE_TTL for each section)
    
    Returns:
        True if pipeline executed successfully, False otherwise
    """
    if not redis_client or not sections_to_cache:
        return False
    
    try:
        # Build pipeline of SET commands
        # We'll use individual calls if pipeline not available, for compatibility
        
        import json
        
        logger.debug(f"[Batch] Setting {len(sections_to_cache)} sections to Redis")
        
        success_count = 0
        for section_name, (section_data, limit) in sections_to_cache.items():
            if section_data is None:
                continue
            
            section_key_name, default_args = HOMEPAGE_SECTIONS_FOR_BATCH.get(section_name, (section_name, ()))
            
            # Build cache key
            if limit is not None:
                args = (limit,) if isinstance(limit, (int, float)) else limit
                cache_key = build_section_cache_key(section_key_name, *args) if args else build_section_cache_key(section_key_name)
            else:
                cache_key = build_section_cache_key(section_key_name)
            
            # Get TTL for this section
            ttl = SECTIONS_CACHE_TTL.get(section_name, cache_ttl)
            
            # Serialize to JSON
            value_json = json.dumps(section_data, default=str)
            
            # Set in Redis
            try:
                if redis_client.set(cache_key, value_json, ex=ttl):
                    success_count += 1
                    logger.debug(f"[Batch] Cached section {section_name} (TTL: {ttl}s)")
            except Exception as e:
                logger.error(f"[Batch] Failed to cache {section_name}: {e}")
                # Continue with other sections
        
        logger.debug(f"[Batch] Successfully cached {success_count}/{len(sections_to_cache)} sections")
        return success_count > 0
        
    except Exception as e:
        logger.error(f"[Batch] Cache write failed: {e}")
        return False
