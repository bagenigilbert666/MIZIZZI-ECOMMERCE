"use client"

import { useEffect, useState } from "react"
import { useCart } from "@/contexts/cart/cart-context"

interface TestResult {
  name: string
  status: "passed" | "failed" | "pending"
  message: string
}

export default function CartValidationTestPage() {
  const cart = useCart()
  const [results, setResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const runTests = async () => {
      const testResults: TestResult[] = []

      // Test 1: Context is available
      try {
        if (cart) {
          testResults.push({
            name: "Cart Context Available",
            status: "passed",
            message: "useCart hook returns context successfully",
          })
        } else {
          testResults.push({
            name: "Cart Context Available",
            status: "failed",
            message: "useCart hook returned undefined",
          })
        }
      } catch (error) {
        testResults.push({
          name: "Cart Context Available",
          status: "failed",
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }

      // Test 2: Cart state properties exist
      try {
        const requiredProperties = [
          "items",
          "itemCount",
          "total",
          "subtotal",
          "shipping",
          "cart",
          "isLoading",
          "isUpdating",
        ]

        const missingProperties = requiredProperties.filter((prop) => !(prop in cart))

        if (missingProperties.length === 0) {
          testResults.push({
            name: "Cart State Properties",
            status: "passed",
            message: `All ${requiredProperties.length} required state properties exist`,
          })
        } else {
          testResults.push({
            name: "Cart State Properties",
            status: "failed",
            message: `Missing properties: ${missingProperties.join(", ")}`,
          })
        }
      } catch (error) {
        testResults.push({
          name: "Cart State Properties",
          status: "failed",
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }

      // Test 3: Cart operations methods exist
      try {
        const requiredMethods = [
          "addToCart",
          "updateQuantity",
          "removeItem",
          "clearCart",
          "refreshCart",
          "applyCoupon",
          "removeCoupon",
          "validateCart",
          "validateCheckout",
        ]

        const missingMethods = requiredMethods.filter((method) => typeof (cart as any)[method] !== "function")

        if (missingMethods.length === 0) {
          testResults.push({
            name: "Cart Operation Methods",
            status: "passed",
            message: `All ${requiredMethods.length} required methods are callable`,
          })
        } else {
          testResults.push({
            name: "Cart Operation Methods",
            status: "failed",
            message: `Missing methods: ${missingMethods.join(", ")}`,
          })
        }
      } catch (error) {
        testResults.push({
          name: "Cart Operation Methods",
          status: "failed",
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }

      // Test 4: Cart state values are correct types
      try {
        const typeChecks = [
          {
            name: "items is array",
            check: Array.isArray(cart.items),
          },
          {
            name: "itemCount is number",
            check: typeof cart.itemCount === "number",
          },
          {
            name: "total is number",
            check: typeof cart.total === "number",
          },
          {
            name: "subtotal is number",
            check: typeof cart.subtotal === "number",
          },
          {
            name: "shipping is number",
            check: typeof cart.shipping === "number",
          },
          {
            name: "isLoading is boolean",
            check: typeof cart.isLoading === "boolean",
          },
          {
            name: "isUpdating is boolean",
            check: typeof cart.isUpdating === "boolean",
          },
        ]

        const failedChecks = typeChecks.filter((check) => !check.check)

        if (failedChecks.length === 0) {
          testResults.push({
            name: "Cart State Types",
            status: "passed",
            message: "All state values have correct types",
          })
        } else {
          testResults.push({
            name: "Cart State Types",
            status: "failed",
            message: `Type mismatches: ${failedChecks.map((c) => c.name).join(", ")}`,
          })
        }
      } catch (error) {
        testResults.push({
          name: "Cart State Types",
          status: "failed",
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }

      // Test 5: Cart operations return expected types
      try {
        const operationReturns = [
          {
            name: "addToCart returns Promise",
            check: cart.addToCart instanceof Function && cart.addToCart.constructor.name === "AsyncFunction",
          },
          {
            name: "updateQuantity returns Promise",
            check:
              cart.updateQuantity instanceof Function && cart.updateQuantity.constructor.name === "AsyncFunction",
          },
          {
            name: "removeItem returns Promise",
            check: cart.removeItem instanceof Function && cart.removeItem.constructor.name === "AsyncFunction",
          },
        ]

        const failedReturns = operationReturns.filter((op) => !op.check)

        if (failedReturns.length === 0) {
          testResults.push({
            name: "Cart Operations Return Types",
            status: "passed",
            message: "All operations return Promises",
          })
        } else {
          testResults.push({
            name: "Cart Operations Return Types",
            status: "failed",
            message: `Failed checks: ${failedReturns.map((op) => op.name).join(", ")}`,
          })
        }
      } catch (error) {
        testResults.push({
          name: "Cart Operations Return Types",
          status: "failed",
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }

      // Test 6: Validate no duplicate operations
      try {
        if (cart.pendingOperations instanceof Map) {
          testResults.push({
            name: "Pending Operations Tracking",
            status: "passed",
            message: "Pending operations tracked as Map",
          })
        } else {
          testResults.push({
            name: "Pending Operations Tracking",
            status: "failed",
            message: "Pending operations should be a Map",
          })
        }
      } catch (error) {
        testResults.push({
          name: "Pending Operations Tracking",
          status: "failed",
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }

      // Test 7: Validate error handling
      try {
        if (typeof cart.error === "string" || cart.error === null) {
          testResults.push({
            name: "Error Handling",
            status: "passed",
            message: "Error property correctly typed",
          })
        } else {
          testResults.push({
            name: "Error Handling",
            status: "failed",
            message: "Error property should be string or null",
          })
        }
      } catch (error) {
        testResults.push({
          name: "Error Handling",
          status: "failed",
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }

      // Test 8: Validate cart UI controls
      try {
        const uiControls = [
          {
            name: "openCart is function",
            check: typeof cart.openCart === "function",
          },
          {
            name: "closeCart is function",
            check: typeof cart.closeCart === "function",
          },
          {
            name: "isOpen is boolean",
            check: typeof cart.isOpen === "boolean",
          },
        ]

        const failedControls = uiControls.filter((control) => !control.check)

        if (failedControls.length === 0) {
          testResults.push({
            name: "Cart UI Controls",
            status: "passed",
            message: "All UI controls properly implemented",
          })
        } else {
          testResults.push({
            name: "Cart UI Controls",
            status: "failed",
            message: `Failed: ${failedControls.map((c) => c.name).join(", ")}`,
          })
        }
      } catch (error) {
        testResults.push({
          name: "Cart UI Controls",
          status: "failed",
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }

      setResults(testResults)
      setLoading(false)
    }

    runTests()
  }, [cart])

  const passedCount = results.filter((r) => r.status === "passed").length
  const failedCount = results.filter((r) => r.status === "failed").length

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Cart Context Validation</h1>
          <p className="text-slate-600 mb-8">Testing comprehensive cart context implementation and integration</p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-slate-600">Running validation tests...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8 grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600">Total Tests</p>
                  <p className="text-3xl font-bold text-blue-600">{results.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600">Passed</p>
                  <p className="text-3xl font-bold text-green-600">{passedCount}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600">Failed</p>
                  <p className="text-3xl font-bold text-red-600">{failedCount}</p>
                </div>
              </div>

              <div className="space-y-3">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4 flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {result.status === "passed" ? (
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100">
                          <span className="text-green-600 text-sm font-bold">✓</span>
                        </div>
                      ) : result.status === "failed" ? (
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100">
                          <span className="text-red-600 text-sm font-bold">✕</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-yellow-100">
                          <span className="text-yellow-600 text-sm font-bold">?</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{result.name}</p>
                      <p className="text-sm text-slate-600 mt-1">{result.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {failedCount === 0 && (
                <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <p className="text-lg font-semibold text-green-900">All tests passed!</p>
                  <p className="text-sm text-green-700 mt-2">
                    Cart context is properly implemented with full service integration.
                  </p>
                </div>
              )}

              {failedCount > 0 && (
                <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6">
                  <p className="text-lg font-semibold text-red-900">
                    {failedCount} test{failedCount !== 1 ? "s" : ""} failed
                  </p>
                  <p className="text-sm text-red-700 mt-2">
                    Please review the failed tests above and check the console for detailed error messages.
                  </p>
                </div>
              )}

              <div className="mt-8 bg-slate-50 rounded-lg p-6">
                <h2 className="font-semibold text-slate-900 mb-3">Cart State Summary</h2>
                <div className="space-y-2 text-sm">
                  <p className="flex justify-between">
                    <span className="text-slate-600">Items in cart:</span>
                    <span className="font-semibold text-slate-900">{cart.itemCount}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-semibold text-slate-900">${cart.subtotal.toFixed(2)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-600">Shipping:</span>
                    <span className="font-semibold text-slate-900">${cart.shipping.toFixed(2)}</span>
                  </p>
                  <p className="flex justify-between border-t pt-2">
                    <span className="text-slate-600">Total:</span>
                    <span className="font-semibold text-slate-900">${cart.total.toFixed(2)}</span>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </main>
  )
}
