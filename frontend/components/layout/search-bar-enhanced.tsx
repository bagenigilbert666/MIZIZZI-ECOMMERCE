"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState, memo } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Search, Clock, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProductSearchResults } from "@/components/products/product-search-results"
import { useSearch } from "@/hooks/use-search"
import { useRouter } from "next/navigation"

interface EnhancedSearchBarProps {
  isMobile?: boolean
  placeholder?: string
  onSearch?: (query: string) => void
  containerClassName?: string
}

// Memoized search input component - NO CLEAR BUTTON (Jumia-inspired)
const EnhancedSearchInput = memo(
  ({
    inputRef,
    value,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    placeholder,
    className,
  }: {
    inputRef: React.RefObject<HTMLInputElement>
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onFocus: () => void
    onBlur: () => void
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
    placeholder: string
    className: string
  }) => (
    <div className="relative flex-1">
      <div className="absolute left-0 top-0 h-full flex items-center pl-4 pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={className}
        style={{ boxShadow: "none", outline: "none" }}
        aria-label={placeholder}
        autoComplete="off"
        spellCheck="false"
      />
    </div>
  ),
)

EnhancedSearchInput.displayName = "EnhancedSearchInput"

// Enhanced suggestions component with smoother animations
const EnhancedSearchSuggestions = memo(
  ({
    query,
    onSelect,
    searchHook,
  }: {
    query: string
    onSelect: (suggestion: string | any) => void
    searchHook: any
  }) => {
    const [suggestions, setSuggestions] = useState<string[]>([])
    const router = useRouter()

    useEffect(() => {
      if (query.length > 0) {
        const allSuggestions = searchHook.suggestions || []
        const queryLower = query.toLowerCase()

        // Filter: Keep suggestions that actually contain or start with the query
        const realSuggestions = allSuggestions.filter((suggestion: string) => {
          const suggestionLower = suggestion.toLowerCase()
          return suggestionLower.includes(queryLower)
        })

        // Sort: Start-with matches first, then contains
        realSuggestions.sort((a: string, b: string) => {
          const aLower = a.toLowerCase()
          const bLower = b.toLowerCase()

          const aStarts = aLower.startsWith(queryLower)
          const bStarts = bLower.startsWith(queryLower)

          if (aStarts !== bStarts) {
            return aStarts ? -1 : 1
          }
          return a.localeCompare(b)
        })

        setSuggestions(realSuggestions.slice(0, 8))
      } else {
        setSuggestions([])
      }
    }, [query, searchHook.suggestions])

    const handleSuggestionClick = (suggestion: string | any) => {
      const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]")
      const searchTerm = typeof suggestion === "string" ? suggestion : suggestion.name
      const updated = [searchTerm, ...recent.filter((s: string) => s !== searchTerm)].slice(0, 10)
      localStorage.setItem("recentSearches", JSON.stringify(updated))

      if (typeof suggestion === "object" && suggestion.id) {
        router.push(`/product/${suggestion.id}`)
      } else {
        onSelect(searchTerm)
      }
    }

    if (query.length === 0) {
      const recentSearches = searchHook.getRecentSearches()
      const trendingProducts = searchHook.getTrendingProducts()
      const categories = searchHook.getCategories()

      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="p-4 space-y-4 max-h-[400px] overflow-y-auto"
        >
          {recentSearches.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Searches</span>
              </div>
              <div className="space-y-1">
                {recentSearches.slice(0, 5).map((search, index) => {
                  const searchTerm = typeof search === "string" ? search : search.search_term || search.name
                  const isProduct = typeof search === "object" && search.type === "product"

                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + index * 0.03 }}
                      onClick={() => handleSuggestionClick(search)}
                      className="block w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-orange-50 rounded-lg transition-all duration-200 group"
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isProduct ? (
                        <div className="flex items-center gap-2">
                          {search.image && (
                            <img
                              src={
                                search.image?.startsWith("http")
                                  ? search.image
                                  : `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/uploads/product_images/${search.image.split("/").pop()}`
                              }
                              alt={search.name}
                              className="w-6 h-6 object-cover rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "/diverse-products-still-life.png"
                              }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium text-gray-900">{search.name}</div>
                            {search.price && (
                              <div className="text-xs text-gray-500">KSh {search.price.toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span>{searchTerm}</span>
                        </div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {categories.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Popular Categories</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.slice(0, 6).map((category, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + index * 0.03 }}
                    onClick={() => handleSuggestionClick(category.name)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-orange-100 hover:text-orange-700 rounded-full transition-all duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {category.name}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {trendingProducts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trending Products</span>
              </div>
              <div className="space-y-1">
                {trendingProducts.slice(0, 5).map((product, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + index * 0.03 }}
                    onClick={() => handleSuggestionClick(product)}
                    className="block w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-orange-50 rounded-lg transition-all duration-200"
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-2">
                      {product.image && (
                        <img
                          src={
                            product.image?.startsWith("http")
                              ? product.image
                              : `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/uploads/product_images/${product.image.split("/").pop()}`
                          }
                          alt={product.name}
                          className="w-6 h-6 object-cover rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/diverse-products-still-life.png"
                          }}
                        />
                      )}
                      <span className="truncate">{product.name}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="p-2"
      >
        {suggestions.slice(0, 8).map((suggestion, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
            onClick={() => handleSuggestionClick(suggestion)}
            className="block w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-orange-50 rounded-lg transition-all duration-200"
            whileHover={{ x: 4, backgroundColor: "rgb(255, 245, 230)" }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="font-medium text-gray-900">{suggestion}</span>
          </motion.button>
        ))}
      </motion.div>
    )
  },
)

EnhancedSearchSuggestions.displayName = "EnhancedSearchSuggestions"

export function EnhancedSearchBar({
  isMobile = false,
  placeholder = "Search for products, brands and categories...",
  onSearch,
  containerClassName = "",
}: EnhancedSearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchResultsRef = useRef<HTMLDivElement>(null)
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1)
  const shouldReduceMotion = useReducedMotion()

  const searchHook = useSearch({
    initialQuery: query,
    delay: 300,
    onSearch: (searchQuery) => {
      if (onSearch) {
        onSearch(searchQuery)
      }
    },
  })

  const { results, isLoading, error, searchTime, suggestions, handleSearch: updateSearchQuery } = searchHook

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        if (query.trim().length >= 2) {
          router.push(`/search?q=${encodeURIComponent(query.trim())}`)
          setIsSearchFocused(false)
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        setIsSearchFocused(false)
      }
      // Space and all other keys are allowed to pass through normally
    },
    [query, router],
  )

  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setQuery(value)
      updateSearchQuery(value)
    },
    [updateSearchQuery],
  )

  const handleSearch = useCallback(() => {
    if (query.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      setIsSearchFocused(false)
    }
  }, [query, router])

  useEffect(() => {
    setSelectedResultIndex(-1)
  }, [results])

  const shouldShowDropdown = isSearchFocused && query.length >= 2

  return (
    <div className={`w-full ${containerClassName}`}>
      <div className="relative">
        <div className="flex items-center gap-2">
          <EnhancedSearchInput
            inputRef={searchInputRef}
            value={query}
            onChange={handleSearchInputChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 h-11 rounded-lg border-2 border-gray-200 text-sm font-medium transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 placeholder:text-gray-400"
          />

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              className="h-11 px-5 rounded-lg bg-cherry-600 hover:bg-cherry-700 text-white font-semibold border-0 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 flex-shrink-0"
              onClick={handleSearch}
              disabled={!query.trim() || query.trim().length < 2}
              aria-label="Search products"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </Button>
          </motion.div>
        </div>

        <AnimatePresence>
          {shouldShowDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                duration: shouldReduceMotion ? 0.1 : 0.3,
              }}
              className="absolute left-0 top-full z-50 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
              style={{ width: "100%", minWidth: "fit-content" }}
            >
              <div className="w-full max-h-[500px] overflow-y-auto scrollbar-hide">
                <ProductSearchResults
                  ref={searchResultsRef}
                  results={results}
                  isLoading={isLoading}
                  selectedIndex={selectedResultIndex}
                  onClose={() => setQuery("")}
                  searchTime={searchTime}
                  suggestions={suggestions}
                  error={error}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
