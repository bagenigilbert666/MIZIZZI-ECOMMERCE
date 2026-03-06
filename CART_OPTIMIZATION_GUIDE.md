# Cart System Optimization Architecture

## Overview
This document outlines the improved cart system architecture for MIZIZZI e-commerce, designed to deliver Jumia-like performance while maintaining data accuracy for checkout operations.

## Key Principles
1. **Database as Source of Truth** - Logged-in user carts stored in PostgreSQL
2. **Redis for Performance** - Guest carts and product data cached only
3. **Data Consistency** - Real-time accuracy for checkout and inventory
4. **Fast Reads** - Optimized queries with strategic caching
5. **No Full Cart Caching** - Cart totals calculated dynamically

## Architecture Components

### 1. Logged-in User Cart (Database-First)
- Cart items stored in PostgreSQL
- Source of truth for user sessions
- Product data fetched from Redis cache
- Totals calculated on-the-fly

### 2. Guest Cart (Redis-Based)
- Short-lived carts (24-hour TTL)
- Session identifier (UUID)
- Automatic cleanup after expiration
- Conversion to logged-in cart on registration

### 3. Product Cache (Redis)
- Product metadata (price, name, images, stock)
- Category information
- Seller details and ratings
- TTL: 30-60 minutes

### 4. Cache Layers
```
Browser Cache (5 min)
  ↓
Next.js ISR (10 min)
  ↓
Redis Cache (30 min)
  ↓
PostgreSQL (source of truth)
```

## Performance Targets
- Cart load: <200ms (cached products)
- Cart add/update: <100ms (fast writes)
- Guest checkout: <300ms (Redis reads)
- Logged-in checkout: <250ms (DB + Cache reads)

## API Endpoints (Unchanged)
- GET /cart - Get user cart with calculated totals
- POST /cart/add - Add item to cart
- PATCH /cart/item - Update cart item quantity
- DELETE /cart/item - Remove item from cart

## Implementation Strategy
- Phase 1: Guest cart Redis layer
- Phase 2: Product cache optimization
- Phase 3: Cart calculation optimization
- Phase 4: Performance monitoring
