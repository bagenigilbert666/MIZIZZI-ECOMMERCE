"use client"

import type React from "react"
import { createContext, useState, useCallback, useRef, useContext, useEffect } from "react"
import { useAuth } from "@/contexts/auth/auth-context"
import { toast } from "@/hooks/use-toast"
import {
  cartService,
  type Cart as CartType,
  type CartValidation,
  type CartItem,
  type CartResponse,
} from "@/services/cart-service"
import { websocketService } from "@/services/websocket"
import { productService } from "@/services/product"
import { inventoryService, type AvailabilityResponse } from "@/services/inventory-service"
import { useSoundEffects } from "@/hooks/use-sound-effects"
import { useRouter } from "next/navigation"

// Re-export CartItem type
export type { CartItem } from "@/services/cart-service"

// ============================================================================
// LOCAL STORAGE HELPERS - Only for guest cart persistence
// ============================================================================

const getLocalCartItems = (): CartItem[] => {
  if (typeof window === "undefined") return []

  try {
    const items = localStorage.getItem("cartItems")
    if (!items) return []

    const parsedItems = JSON.parse(items)

    if (!Array.isArray(parsedItems)) {
      localStorage.removeItem("cartItems")
      return []
    }

    return parsedItems.filter((item: any) => {
      if (!item || typeof item !== "object" || !item.product_id) return false
      if (typeof item.product_id !== "number" || isNaN(item.product_id) || item.product_id <= 0) return false
      if (typeof item.quantity !== "number" || isNaN(item.quantity) || item.quantity <= 0) item.quantity = 1
      if (typeof item.price !== "number" || isNaN(item.price) || item.price < 0) item.price = 0
      if (typeof item.total !== "number" || isNaN(item.total)) item.total = item.price * item.quantity
      if (!item.id || typeof item.id !== "number") item.id = Date.now() + Math.random()
      return true
    })
  } catch (error) {
    console.error("Error parsing cart items from localStorage:", error)
    localStorage.removeItem("cartItems")
    return []
  }
}

const saveLocalCartItems = (items: CartItem[]): void => {
  if (typeof window === "undefined") return

  try {
    if (!Array.isArray(items)) {
      console.error("Attempted to save non-array items to localStorage")
      return
    }

    const validItems = items.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        item.product_id &&
        typeof item.product_id === "number" &&
        typeof item.quantity === "number" &&
        item.quantity > 0,
    )

    localStorage.setItem("cartItems", JSON.stringify(validItems))
  } catch (error) {
    console.error("Error saving cart items to localStorage:", error)
  }
}

// ============================================================================
// DATA VALIDATION HELPERS
// ============================================================================

const detectDataCorruption = (items: CartItem[]) => {
  const issues: string[] = []
  let isCorrupted = false

  if (!Array.isArray(items)) {
    return { isCorrupted: true, issues: ["Cart data is not an array."] }
  }

  for (const item of items) {
    if (!item || typeof item !== "object") {
      isCorrupted = true
      issues.push("Cart item is not an object.")
      continue
    }

    if (typeof item.product_id !== "number" || isNaN(item.product_id)) {
      isCorrupted = true
      issues.push("Invalid product_id: " + item.product_id)
    }

    if (typeof item.quantity !== "number" || isNaN(item.quantity) || item.quantity <= 0) {
      isCorrupted = true
      issues.push("Invalid quantity: " + item.quantity)
    }

    if (typeof item.price !== "number" || isNaN(item.price)) {
      isCorrupted = true
      issues.push("Invalid price: " + item.price)
    }
  }

  return { isCorrupted, issues }
}

const sanitizeCartItem = (item: CartItem): CartItem | null => {
  if (!item || typeof item !== "object") return null
  if (typeof item.product_id !== "number" || isNaN(item.product_id)) return null
  if (typeof item.quantity !== "number" || isNaN(item.quantity) || item.quantity <= 0) item.quantity = 1
  if (typeof item.price !== "number" || isNaN(item.price)) item.price = 0
  return item
}

const validateCartItem = (item: CartItem) => {
  const errors: string[] = []
  let isValid = true

  if (!item || typeof item !== "object") {
    isValid = false
    errors.push("Cart item is not an object.")
  }

  if (typeof item.product_id !== "number" || isNaN(item.product_id)) {
    isValid = false
    errors.push("Invalid product ID")
  }

  if (typeof item.quantity !== "number" || isNaN(item.quantity) || item.quantity <= 0) {
    isValid = false
    errors.push("Invalid quantity - must be between 1 and 999")
  }

  if (typeof item.price !== "number" || isNaN(item.price)) {
    isValid = false
    errors.push("Invalid price - must be a valid positive number")
  }

  return { isValid, errors }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

const formatUserFriendlyError = (error: any) => {
  if (error?.response?.data?.errors) {
    const firstError = error.response.data.errors[0]

    switch (firstError?.code) {
      case "out_of_stock":
        return { title: "Item Out of Stock", description: firstError.message || "This item is currently out of stock." }
      case "insufficient_stock":
        return {
          title: "Limited Stock Available",
          description: firstError.message || "There is not enough stock to fulfill your request.",
        }
      case "invalid_coupon":
        return { title: "Invalid Coupon", description: firstError.message || "This coupon code is not valid." }
      default:
        return { title: "Error", description: firstError?.message || "An unexpected error occurred." }
    }
  }

  if (error?.response?.data?.error) {
    return { title: "Error", description: error.response.data.error }
  }

  if (error?.message) {
    return { title: "Error", description: error.message }
  }

  return { title: "Error", description: "An unexpected error occurred." }
}

// ============================================================================
// CONTEXT TYPE DEFINITION
// ============================================================================

interface CartContextType {
  // Cart state
  cart: CartType | null
  items: CartItem[]
  itemCount: number
  subtotal: number
  shipping: number
  total: number
  cartTotal: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void

  // Loading states
  isLoading: boolean
  isUpdating: boolean
  pendingOperations: Map<string, boolean>

  // Error and validation
  error: string | null
  validation: CartValidation | null
  lastError: string | null
  clearError: () => void

  // Core cart operations
  addToCart: (
    productId: number,
    quantity: number,
    variantId?: number,
  ) => Promise<{ success: boolean; message: string; isUpdate?: boolean }>
  updateQuantity: (productId: number, quantity: number, variantId?: number) => Promise<boolean>
  removeItem: (productId: number, variantId?: number) => Promise<boolean>
  clearCart: () => Promise<boolean>
  refreshCart: () => Promise<void>

  // Coupon operations
  applyCoupon: (couponCode: string) => Promise<boolean>
  removeCoupon: () => Promise<boolean>

  // Address operations
  setShippingAddress: (addressId: number) => Promise<boolean>
  setBillingAddress: (addressId: number, sameAsShipping?: boolean) => Promise<boolean>

  // Shipping and payment operations
  setShippingMethod: (shippingMethodId: number) => Promise<boolean>
  setPaymentMethod: (paymentMethodId: number) => Promise<boolean>

  // Metadata operations
  setCartNotes: (notes: string) => Promise<boolean>
  setRequiresShipping: (requiresShipping: boolean) => Promise<boolean>

  // Validation operations
  validateCart: () => Promise<CartValidation>
  validateCheckout: () => Promise<CartValidation>

  // Guest cart migration
  migrationInProgress: boolean
  migrationResult: { success: boolean; migratedItems: number; errors: string[] } | null
  migrateGuestCart: () => Promise<boolean>
}

// ============================================================================
// CONTEXT AND PROVIDER
// ============================================================================

const CartContext = createContext<CartContextType | undefined>(undefined)

export const useCart = (): CartContextType => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  const [cart, setCart] = useState<CartType | null>(null)
  const [items, setItems] = useState<CartItem[]>([])
  const [itemCount, setItemCount] = useState(0)
  const [subtotal, setSubtotal] = useState(0)
  const [shipping, setShipping] = useState(0)
  const [total, setTotal] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [pendingOperations, setPendingOperations] = useState<Map<string, boolean>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<CartValidation | null>(null)
  const [migrationInProgress, setMigrationInProgress] = useState(false)
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean
    migratedItems: number
    errors: string[]
  } | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  // ========================================================================
  // REFS - For tracking lifecycle and async operations
  // ========================================================================

  const isMounted = useRef(false)
  const productCache = useRef<Map<number, any>>(new Map())
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map())
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const enhancementInProgress = useRef<Set<number>>(new Set())
  const refreshingRef = useRef(false)
  const fetchCartDebounced = useRef<NodeJS.Timeout | null>(null)
  const lastFetchTime = useRef<number>(0)

  const FETCH_DEBOUNCE_TIME = 1000 // 1 second debounce

  // ========================================================================
  // HOOKS
  // ========================================================================

  const { isAuthenticated, user } = useAuth()
  const { playSound } = useSoundEffects()
  const router = useRouter()

  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================

  const createOperationKey = (operation: string, productId: number, variantId?: number): string => {
    return `${operation}:${productId}:${variantId || "default"}`
  }

  const markOperationPending = useCallback((key: string, isPending: boolean) => {
    setPendingOperations((prev) => {
      const newMap = new Map(prev)
      if (isPending) {
        newMap.set(key, true)
      } else {
        newMap.delete(key)
      }
      return newMap
    })
  }, [])

  const isOperationPending = useCallback(
    (key: string): boolean => {
      return pendingOperations.has(key)
    },
    [pendingOperations],
  )

  const normalizeProductForCart = useCallback((product: any): CartItem["product"] => {
    if (!product) {
      return {
        id: 0,
        name: "Unknown Product",
        slug: "unknown-product",
        thumbnail_url: "/placeholder.svg",
        image_urls: ["/placeholder.svg"],
        price: 0,
        sale_price: null,
      }
    }

    return {
      id: typeof product.id === "string" ? Number.parseInt(product.id, 10) : product.id,
      name: product.name || `Product ${product.id}`,
      slug: product.slug || `product-${product.id}`,
      thumbnail_url: product.thumbnail_url || product.image_urls?.[0] || "/placeholder.svg",
      image_urls: product.image_urls || [product.thumbnail_url || "/placeholder.svg"],
      category: product.category,
      seller: product.seller,
      stock: typeof product.stock === "number" ? product.stock : undefined,
      sku: product.sku,
      price: typeof product.price === "number" ? product.price : 0,
      sale_price: product.sale_price || null,
    }
  }, [])

  const handleError = useCallback((error: any, operation: string) => {
    const friendlyError = formatUserFriendlyError(error)

    console.error(`Cart context error in ${operation}:`, {
      originalError: error,
      friendlyError,
      timestamp: new Date().toISOString(),
    })

    setError(friendlyError.description)
    setLastError(friendlyError.description)

    toast({
      title: friendlyError.title,
      description: friendlyError.description,
      variant: "destructive",
    })
  }, [])

  // ========================================================================
  // CART STATE UPDATES
  // ========================================================================

  const updateCartState = useCallback(
    async (newItems: CartItem[], newCart?: CartType, skipApiUpdate = false) => {
      if (!isMounted.current) return

      try {
        // Ensure items is an array
        if (!Array.isArray(newItems)) {
          console.error("updateCartState received non-array items:", newItems)
          newItems = []
        }

        // Detect and handle corruption
        const corruption = detectDataCorruption(newItems)
        let validItems = newItems

        if (corruption.isCorrupted) {
          console.warn("Detected corruption in cart state update:", corruption.issues)

          validItems = newItems
            .map((item) => sanitizeCartItem(item))
            .filter((item): item is CartItem => item !== null)

          if (validItems.length < newItems.length) {
            toast({
              title: "Cart Data Fixed",
              description: `Fixed ${newItems.length - validItems.length} corrupted items in your cart.`,
              variant: "default",
            })
          }
        }

        // Validate each item
        validItems = validItems.filter((item) => {
          const itemValidation = validateCartItem(item)
          if (!itemValidation.isValid) {
            console.error("Invalid item in cart state update:", item, itemValidation.errors)
            return false
          }
          return true
        })

        // Calculate totals with enhanced precision
        const newItemCount = validItems.reduce((sum, item) => sum + item.quantity, 0)
        const newSubtotal = validItems.reduce((sum, item) => {
          const itemTotal = Math.round(item.price * item.quantity * 100) / 100
          return Math.round((sum + itemTotal) * 100) / 100
        }, 0)
        const newShipping = newCart?.shipping || 0
        const newTotal = newCart?.total || Math.round((newSubtotal + newShipping) * 100) / 100

        // Update state
        setItems(validItems)
        setItemCount(newItemCount)
        setSubtotal(newCart?.subtotal || newSubtotal)
        setShipping(newShipping)
        setTotal(newTotal)

        if (newCart) {
          setCart(newCart)
        }

        // Save to localStorage for persistence (only for unauthenticated users)
        if (!isAuthenticated) {
          saveLocalCartItems(validItems)
        }

        // Dispatch cart-updated event
        if (typeof document !== "undefined") {
          document.dispatchEvent(
            new CustomEvent("cart-updated", {
              detail: {
                count: newItemCount,
                total: newTotal,
                skipApiUpdate,
                timestamp: new Date().toISOString(),
                corruptionFixed: corruption.isCorrupted,
                itemsFixed: corruption.isCorrupted ? newItems.length - validItems.length : 0,
              },
            }),
          )
        }
      } catch (error) {
        console.error("Error updating cart state:", error)
      }
    },
    [isAuthenticated],
  )

  const enhanceCartItemsWithProductData = useCallback(
    async (cartItems: CartItem[]): Promise<CartItem[]> => {
      if (!cartItems || cartItems.length === 0 || !isMounted.current) return cartItems

      // Find items that need product data
      const itemsNeedingData = cartItems.filter(
        (item) =>
          (!item.product ||
            !item.product.name ||
            item.product.name.includes("Product ") ||
            !item.product.thumbnail_url ||
            item.product.thumbnail_url === "/placeholder.svg") &&
          !enhancementInProgress.current.has(item.product_id),
      )

      if (itemsNeedingData.length === 0) return cartItems

      try {
        // Mark these items as being enhanced
        itemsNeedingData.forEach((item) => enhancementInProgress.current.add(item.product_id))

        console.log(`Enhancing ${itemsNeedingData.length} cart items with product data`)

        const productIds = itemsNeedingData.map((item) => item.product_id)
        const productMap = await productService.getProductsForCartItems(productIds)

        // Update cart items with fetched product data
        const enhancedItems = cartItems.map((item) => {
          const product = productMap[String(item.product_id)]
          if (product && (!item.product || !item.product.name || item.product.name.includes("Product "))) {
            productCache.current.set(item.product_id, product)

            return {
              ...item,
              product: normalizeProductForCart(product),
              price: item.price === 0 || !item.price ? product.sale_price || product.price || 0 : item.price,
              total:
                (item.price === 0 || !item.price ? product.sale_price || product.price || 0 : item.price) *
                item.quantity,
            }
          }
          return item
        })

        // Update state with enhanced items
        if (isMounted.current) {
          updateCartState(enhancedItems, cart || undefined, true)
        }

        return enhancedItems
      } catch (error) {
        console.error("Error enhancing cart items with product data:", error)
        return cartItems
      } finally {
        // Clear enhancement tracking
        itemsNeedingData.forEach((item) => enhancementInProgress.current.delete(item.product_id))
      }
    },
    [cart, updateCartState, normalizeProductForCart],
  )

  // ========================================================================
  // CORE CART OPERATIONS - DELEGATED TO SERVICE
  // ========================================================================

  const fetchCart = useCallback(
    async (force = false) => {
      if (!isMounted.current) return

      const now = Date.now()
      if (!force && now - lastFetchTime.current < FETCH_DEBOUNCE_TIME) {
        return
      }

      if (fetchCartDebounced.current) {
        clearTimeout(fetchCartDebounced.current)
        fetchCartDebounced.current = null
      }

      if (isLoading && !force) return

      lastFetchTime.current = now
      const requestKey = "fetch-cart"

      if (pendingRequests.current.has(requestKey) && !force) {
        try {
          await pendingRequests.current.get(requestKey)
          return
        } catch (error) {
          console.error("Error waiting for pending cart request:", error)
        }
      }

      if (!isLoading) {
        setIsLoading(true)
      }
      setError(null)

      try {
        if (isAuthenticated) {
          console.log("Fetching cart for authenticated user...")

          const fetchPromise = cartService
            .getCart()
            .then(async (response) => {
              if (!isMounted.current) return

              if (!response || response.success === false) {
                console.error("API returned an error:", response?.message || "Unknown error")
                setError(response?.message || "Failed to load cart.")

                const localCartItems = getLocalCartItems()
                if (localCartItems.length > 0) {
                  updateCartState(localCartItems)
                }
                return
              }

              if (response.items && response.items.length > 0) {
                setCart(response.cart)
                const cartItems = response.items || []

                cartItems.forEach((item: CartItem) => {
                  if (item.product && item.product.id && item.product_id) {
                    productCache.current.set(item.product_id, item.product)
                  }
                })

                updateCartState(cartItems, response.cart)

                if (response.validation) {
                  setValidation(response.validation)
                }
              } else {
                const localCartItems = getLocalCartItems()
                if (localCartItems.length > 0) {
                  updateCartState(localCartItems)

                  // Sync local cart to server (fire and forget)
                  const validItemsToSync = localCartItems.filter(
                    (item) =>
                      item.product_id &&
                      typeof item.product_id === "number" &&
                      item.quantity > 0 &&
                      item.quantity <= 100 &&
                      typeof item.quantity === "number",
                  )

                  if (validItemsToSync.length > 0) {
                    console.log(`Syncing ${validItemsToSync.length} valid items to server...`)

                    Promise.allSettled(
                      validItemsToSync.map(async (item) => {
                        try {
                          if (item.product_id && item.quantity > 0 && item.quantity <= 100) {
                            const safeQuantity = Math.min(Math.max(1, Math.floor(item.quantity)), 100)
                            await cartService.addToCart(item.product_id, safeQuantity, item.variant_id || undefined)
                            console.log(
                              `Successfully synced item ${item.product_id} with quantity ${safeQuantity} to server`,
                            )
                          }
                        } catch (err) {
                          console.warn(`Failed to sync item ${item.product_id} to server:`, err)
                        }
                      }),
                    ).catch((err) => {
                      console.warn("Error during cart sync:", err)
                    })
                  }
                } else {
                  updateCartState([])
                }
              }

              return response
            })
            .catch((error) => {
              if (!isMounted.current) return

              console.error("Error fetching cart:", error)

              if (error?.response?.status === 401) {
                const localCartItems = getLocalCartItems()
                updateCartState(localCartItems)
              } else {
                const localCartItems = getLocalCartItems()
                if (localCartItems.length > 0) {
                  updateCartState(localCartItems)
                } else {
                  setError("Failed to load cart. Please try again.")
                }
              }

              throw error
            })
            .finally(() => {
              if (isMounted.current) {
                setIsLoading(false)
              }
              pendingRequests.current.delete(requestKey)
            })

          pendingRequests.current.set(requestKey, fetchPromise)
          await fetchPromise
        } else {
          // Unauthenticated - use localStorage
          const localCartItems = getLocalCartItems()
          updateCartState(localCartItems)
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Final error handler:", error)
        if (isMounted.current) {
          setIsLoading(false)
        }
      }
    },
    [isAuthenticated, updateCartState],
  )

  const refreshCart = useCallback(async () => {
    if (refreshingRef.current) {
      console.log("Cart refresh already in progress, waiting for it to complete...")
      return new Promise<void>((resolve) => {
        const checkRefresh = () => {
          if (!refreshingRef.current) {
            resolve()
          } else {
            setTimeout(checkRefresh, 100)
          }
        }
        checkRefresh()
      })
    }

    refreshingRef.current = true

    return new Promise<void>((resolve, reject) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(async () => {
        try {
          await fetchCart(true)
          resolve()
        } catch (error) {
          console.error("Error refreshing cart:", error)
          reject(error)
        } finally {
          refreshingRef.current = false
          debounceTimerRef.current = null
        }
      }, 2000)
    })
  }, [fetchCart])

  const addToCart = useCallback(
    async (productId: number, quantity: number, variantId?: number) => {
      try {
        const normalizedProductId = typeof productId === "string" ? Number.parseInt(productId, 10) : productId

        if (typeof normalizedProductId !== "number" || isNaN(normalizedProductId) || normalizedProductId <= 0) {
          handleError({ code: "invalid_product_id", message: "Invalid product ID provided" }, "addToCart")
          return { success: false, message: "Invalid product ID" }
        }

        // Check inventory availability first
        let availableStock = 999
        let inventoryCheck: AvailabilityResponse | null = null

        try {
          inventoryCheck = await inventoryService.checkAvailability(normalizedProductId, quantity, variantId)
          availableStock = inventoryCheck.available_quantity || 0

          if (!inventoryCheck.is_available) {
            toast({
              title: "Stock Limit Reached",
              description: `Only ${availableStock} items available in stock.`,
              variant: "destructive",
            })

            document.dispatchEvent(
              new CustomEvent("inventory-updated", {
                detail: { productId: normalizedProductId, availableStock },
              }),
            )

            return { success: false, message: "Insufficient stock" }
          }
        } catch (error: any) {
          console.warn("Could not check inventory availability:", error)
        }

        // Validate quantity
        if (typeof quantity !== "number" || isNaN(quantity) || quantity <= 0 || quantity > availableStock) {
          handleError(
            {
              code: "invalid_quantity",
              message: `Quantity must be between 1 and ${availableStock}`,
            },
            "addToCart",
          )
          return { success: false, message: `Invalid quantity - maximum ${availableStock} available` }
        }

        const operationKey = createOperationKey("add", normalizedProductId, variantId)

        if (isOperationPending(operationKey)) {
          console.log("Add to cart operation already pending for:", operationKey)
          return { success: false, message: "Operation already in progress" }
        }

        const existingItem = items.find(
          (item) =>
            item.product_id === normalizedProductId && (variantId ? item.variant_id === variantId : !item.variant_id),
        )

        try {
          markOperationPending(operationKey, true)
          setError(null)

          console.log(
            `Adding to cart: Product ${normalizedProductId}, Quantity: ${quantity}, Variant: ${variantId || "none"}`,
          )

          const isUpdate = !!existingItem
          const response = await cartService.addToCart(normalizedProductId, quantity, variantId)

          if (response.success) {
            // Play sound effect
            playSound()

            // Track with WebSocket
            try {
              await websocketService.trackAddToCart(normalizedProductId, quantity, user?.id?.toString())
            } catch (wsError) {
              console.warn("WebSocket tracking failed, but cart was updated:", wsError)
            }

            // Dispatch inventory update event
            if (inventoryCheck) {
              document.dispatchEvent(
                new CustomEvent("inventory-updated", {
                  detail: {
                    productId: normalizedProductId,
                    availableStock: inventoryCheck.available_quantity - quantity,
                  },
                }),
              )
            }

            // Dispatch cart-updated event with product details
            const addedProduct = response.items.find((item: CartItem) => item.product_id === normalizedProductId)
            const productName = addedProduct?.product?.name || "Product"

            document.dispatchEvent(
              new CustomEvent("cart-updated", {
                detail: {
                  count: response.items.length,
                  total: response.cart?.total || 0,
                  message: isUpdate
                    ? "Item quantity has been updated in your cart"
                    : "Product has been added to your cart",
                  product: {
                    id: normalizedProductId,
                    name: productName,
                    thumbnail_url: addedProduct?.product?.thumbnail_url,
                    price: addedProduct?.price?.toFixed(2),
                    quantity: quantity,
                    variant_id: variantId,
                    total: addedProduct?.total || (addedProduct?.price || 0) * quantity,
                  },
                  isUpdate,
                  timestamp: new Date().toISOString(),
                },
              }),
            )

            // Update cart state with response
            await updateCartState(response.items, response.cart)

            return {
              success: true,
              message: isUpdate ? "Item quantity updated" : "Item added to cart",
              isUpdate,
            }
          } else {
            return {
              success: false,
              message: response.message || "Failed to add item to cart",
            }
          }
        } catch (error) {
          console.error("Error in addToCart operation:", error)
          handleError(error, "addToCart")
          return { success: false, message: "Failed to add item to cart" }
        } finally {
          markOperationPending(operationKey, false)
        }
      } catch (error) {
        console.error("Error adding to cart:", error)
        handleError(error, "addToCart")
        return { success: false, message: "Failed to add item to cart" }
      }
    },
    [items, playSound, user, updateCartState, markOperationPending, isOperationPending, handleError],
  )

  const updateQuantity = useCallback(
    async (productId: number, quantity: number, variantId?: number): Promise<boolean> => {
      try {
        const operationKey = createOperationKey("update", productId, variantId)

        if (isOperationPending(operationKey)) {
          console.log("Update quantity operation already pending")
          return false
        }

        markOperationPending(operationKey, true)
        setError(null)
        setIsUpdating(true)

        // Find the cart item first
        const cartItem = items.find(
          (item) => item.product_id === productId && (variantId ? item.variant_id === variantId : !item.variant_id),
        )

        if (!cartItem) {
          throw new Error("Item not found in cart")
        }

        // Use the service to update
        const response = await cartService.updateQuantity(cartItem.id, quantity)

        if (response.success) {
          await updateCartState(response.items, response.cart)
          return true
        }

        throw new Error(response.message || "Failed to update quantity")
      } catch (error) {
        console.error("Error updating quantity:", error)
        handleError(error, "updateQuantity")
        return false
      } finally {
        markOperationPending(createOperationKey("update", productId, variantId), false)
        setIsUpdating(false)
      }
    },
    [items, createOperationKey, isOperationPending, markOperationPending, updateCartState, handleError],
  )

  const removeItem = useCallback(
    async (productId: number, variantId?: number): Promise<boolean> => {
      try {
        const operationKey = createOperationKey("remove", productId, variantId)

        if (isOperationPending(operationKey)) {
          console.log("Remove item operation already pending")
          return false
        }

        markOperationPending(operationKey, true)
        setError(null)
        setIsUpdating(true)

        // Find the cart item first
        const cartItem = items.find(
          (item) => item.product_id === productId && (variantId ? item.variant_id === variantId : !item.variant_id),
        )

        if (!cartItem) {
          throw new Error("Item not found in cart")
        }

        // Use the service to remove
        const response = await cartService.removeItem(cartItem.id)

        if (response.success) {
          await updateCartState(response.items, response.cart)

          document.dispatchEvent(
            new CustomEvent("cart-updated", {
              detail: {
                count: response.items.length,
                total: response.cart?.total || 0,
                message: "Item removed from cart",
                timestamp: new Date().toISOString(),
              },
            }),
          )

          return true
        }

        throw new Error(response.message || "Failed to remove item")
      } catch (error) {
        console.error("Error removing item:", error)
        handleError(error, "removeItem")
        return false
      } finally {
        markOperationPending(createOperationKey("remove", productId, variantId), false)
        setIsUpdating(false)
      }
    },
    [items, createOperationKey, isOperationPending, markOperationPending, updateCartState, handleError],
  )

  const clearCart = useCallback(async (): Promise<boolean> => {
    try {
      setError(null)
      setIsUpdating(true)

      const response = await cartService.clearCart()

      // Support services that return either a boolean or a detailed response object.
      if (typeof response === "boolean") {
        if (response) {
          await updateCartState([], undefined)

          document.dispatchEvent(
            new CustomEvent("cart-updated", {
              detail: {
                count: 0,
                total: 0,
                message: "Cart cleared",
                timestamp: new Date().toISOString(),
              },
            }),
          )

          return true
        }

        throw new Error("Failed to clear cart")
      }

      // If it's an object, assume the detailed CartResponse shape.
      const respObj = response as any

      if (respObj && respObj.success) {
        await updateCartState([], respObj.cart)

        document.dispatchEvent(
          new CustomEvent("cart-updated", {
            detail: {
              count: respObj.items?.length || 0,
              total: respObj.cart?.total || 0,
              message: "Cart cleared",
              timestamp: new Date().toISOString(),
            },
          }),
        )

        return true
      }

      throw new Error(respObj?.message || "Failed to clear cart")
    } catch (error) {
      console.error("Error clearing cart:", error)
      handleError(error, "clearCart")
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [updateCartState, handleError])

  // ========================================================================
  // COUPON OPERATIONS
  // ========================================================================

  const applyCoupon = useCallback(
    async (couponCode: string): Promise<boolean> => {
      try {
        setError(null)
        const response = await cartService.applyCoupon(couponCode)

        if (response.success) {
          await updateCartState(response.items, response.cart)

          toast({
            title: "Coupon Applied",
            description: `Coupon code "${couponCode}" has been applied to your cart.`,
            variant: "default",
          })

          return true
        }

        throw new Error(response.message || "Failed to apply coupon")
      } catch (error) {
        console.error("Error applying coupon:", error)
        handleError(error, "applyCoupon")
        return false
      }
    },
    [updateCartState, handleError],
  )

  const removeCoupon = useCallback(async (): Promise<boolean> => {
    try {
      setError(null)
      const response = await cartService.removeCoupon()

      if (response.success) {
        await updateCartState(response.items, response.cart)

        toast({
          title: "Coupon Removed",
          description: "Coupon code has been removed from your cart.",
          variant: "default",
        })

        return true
      }

      throw new Error(response.message || "Failed to remove coupon")
    } catch (error) {
      console.error("Error removing coupon:", error)
      handleError(error, "removeCoupon")
      return false
    }
  }, [updateCartState, handleError])

  // ========================================================================
  // ADDRESS OPERATIONS
  // ========================================================================

  const setShippingAddress = useCallback(
    async (addressId: number): Promise<boolean> => {
      try {
        setError(null)
        const response = await cartService.setShippingAddress(addressId)

        if (response.success) {
          await updateCartState(response.items, response.cart)
          return true
        }

        throw new Error(response.message || "Failed to set shipping address")
      } catch (error) {
        console.error("Error setting shipping address:", error)
        handleError(error, "setShippingAddress")
        return false
      }
    },
    [updateCartState, handleError],
  )

  const setBillingAddress = useCallback(
    async (addressId: number, sameAsShipping?: boolean): Promise<boolean> => {
      try {
        setError(null)
        const response = await cartService.setBillingAddress(addressId, sameAsShipping)

        if (response.success) {
          await updateCartState(response.items, response.cart)
          return true
        }

        throw new Error(response.message || "Failed to set billing address")
      } catch (error) {
        console.error("Error setting billing address:", error)
        handleError(error, "setBillingAddress")
        return false
      }
    },
    [updateCartState, handleError],
  )

  // ========================================================================
  // SHIPPING & PAYMENT OPERATIONS
  // ========================================================================

  const setShippingMethod = useCallback(
    async (shippingMethodId: number): Promise<boolean> => {
      try {
        setError(null)
        const response = await cartService.setShippingMethod(shippingMethodId)

        if (response.success) {
          await updateCartState(response.items, response.cart)

          toast({
            title: "Shipping Method Updated",
            description: "Your shipping method has been updated.",
            variant: "default",
          })

          return true
        }

        throw new Error(response.message || "Failed to set shipping method")
      } catch (error) {
        console.error("Error setting shipping method:", error)
        handleError(error, "setShippingMethod")
        return false
      }
    },
    [updateCartState, handleError],
  )

  const setPaymentMethod = useCallback(
    async (paymentMethodId: number): Promise<boolean> => {
      try {
        setError(null)
        const response = await cartService.setPaymentMethod(paymentMethodId)

        if (response.success) {
          await updateCartState(response.items, response.cart)

          toast({
            title: "Payment Method Updated",
            description: "Your payment method has been updated.",
            variant: "default",
          })

          return true
        }

        throw new Error(response.message || "Failed to set payment method")
      } catch (error) {
        console.error("Error setting payment method:", error)
        handleError(error, "setPaymentMethod")
        return false
      }
    },
    [updateCartState, handleError],
  )

  // ========================================================================
  // METADATA OPERATIONS
  // ========================================================================

  const setCartNotes = useCallback(
    async (notes: string): Promise<boolean> => {
      try {
        setError(null)
        const response = await cartService.setCartNotes(notes)

        if (response.success) {
          await updateCartState(response.items, response.cart)
          return true
        }

        throw new Error(response.message || "Failed to set cart notes")
      } catch (error) {
        console.error("Error setting cart notes:", error)
        handleError(error, "setCartNotes")
        return false
      }
    },
    [updateCartState, handleError],
  )

  const setRequiresShipping = useCallback(
    async (requiresShipping: boolean): Promise<boolean> => {
      try {
        setError(null)
        const response = await cartService.setShippingOptions(requiresShipping)

        if (response.success) {
          await updateCartState(response.items, response.cart)
          return true
        }

        throw new Error(response.message || "Failed to update shipping requirements")
      } catch (error) {
        console.error("Error updating shipping requirements:", error)
        handleError(error, "setRequiresShipping")
        return false
      }
    },
    [updateCartState, handleError],
  )

  // ========================================================================
  // VALIDATION OPERATIONS
  // ========================================================================

  const validateCart = useCallback(async (): Promise<CartValidation> => {
    try {
      const validation = await cartService.validateCart()
      setValidation(validation)
      return validation
    } catch (error) {
      console.error("Error validating cart:", error)
      handleError(error, "validateCart")
      return { is_valid: false, errors: [], warnings: [] }
    }
  }, [handleError])

  const validateCheckout = useCallback(async (): Promise<CartValidation> => {
    try {
      const validation = await cartService.validateCheckout()
      setValidation(validation)
      return validation
    } catch (error) {
      console.error("Error validating checkout:", error)
      handleError(error, "validateCheckout")
      return { is_valid: false, errors: [], warnings: [] }
    }
  }, [handleError])

  // ========================================================================
  // GUEST CART MIGRATION
  // ========================================================================

  const migrateGuestCart = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || migrationInProgress) {
      return false
    }

    setMigrationInProgress(true)

    try {
      const guestItems = getLocalCartItems()

      if (guestItems.length === 0) {
        setMigrationResult({ success: true, migratedItems: 0, errors: [] })
        return true
      }

      // Detect and fix any corruption before migration
      const corruption = detectDataCorruption(guestItems)
      let itemsToMigrate = guestItems

      if (corruption.isCorrupted) {
        console.warn("Detected corruption in guest cart before migration:", corruption.issues)

        itemsToMigrate = guestItems
          .map((item) => sanitizeCartItem(item))
          .filter((item): item is CartItem => item !== null)

        if (itemsToMigrate.length < guestItems.length) {
          toast({
            title: "Cart Cleaned",
            description: `Removed ${guestItems.length - itemsToMigrate.length} corrupted items before migration.`,
            variant: "default",
          })
        }
      }

      // Migrate items to user account
      const result = { success: true, migratedItems: itemsToMigrate.length, errors: [] }
      setMigrationResult(result)

      if (result.success && result.migratedItems > 0) {
        // Refresh cart to show migrated items
        await refreshCart()

        toast({
          title: "Welcome Back!",
          description: `${result.migratedItems} items from your previous session have been added to your cart.`,
          variant: "default",
        })
      }

      if (result.errors.length > 0) {
        console.warn("Migration completed with errors:", result.errors)
        toast({
          title: "Migration Completed",
          description: `${result.migratedItems} items migrated. Some items couldn't be transferred.`,
          variant: "default",
        })
      }

      return result.success
    } catch (error) {
      console.error("Cart migration failed:", error)
      handleError(error, "migrateGuestCart")
      setMigrationResult({ success: false, migratedItems: 0, errors: ["Migration failed"] })
      return false
    } finally {
      setMigrationInProgress(false)
    }
  }, [isAuthenticated, migrationInProgress, refreshCart, handleError])

  // ========================================================================
  // CART OPEN/CLOSE
  // ========================================================================

  const openCart = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeCart = useCallback(() => {
    setIsOpen(false)
  }, [])

  // ========================================================================
  // ERROR MANAGEMENT
  // ========================================================================

  const clearError = useCallback(() => {
    setError(null)
    setLastError(null)
  }, [])

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  // Initialize cart on mount
  useEffect(() => {
    isMounted.current = true

    fetchCart()

    return () => {
      isMounted.current = false

      // Cleanup timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (fetchCartDebounced.current) {
        clearTimeout(fetchCartDebounced.current)
      }
    }
  }, [fetchCart])

  // ========================================================================
  // CONTEXT VALUE
  // ========================================================================

  const contextValue: CartContextType = {
    // Cart state
    cart,
    items,
    itemCount,
    subtotal,
    shipping,
    total,
    cartTotal: total,
    isOpen,
    openCart,
    closeCart,

    // Loading states
    isLoading,
    isUpdating,
    pendingOperations,

    // Error and validation
    error,
    validation,
    lastError,
    clearError,

    // Core cart operations
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart,

    // Coupon operations
    applyCoupon,
    removeCoupon,

    // Address operations
    setShippingAddress,
    setBillingAddress,

    // Shipping and payment
    setShippingMethod,
    setPaymentMethod,

    // Metadata
    setCartNotes,
    setRequiresShipping,

    // Validation
    validateCart,
    validateCheckout,

    // Guest cart migration
    migrationInProgress,
    migrationResult,
    migrateGuestCart,
  }

  // ========================================================================
  // RENDER
  // ========================================================================

  return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
}
