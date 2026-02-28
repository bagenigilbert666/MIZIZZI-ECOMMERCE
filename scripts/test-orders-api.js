#!/usr/bin/env node

/**
 * Script to test the orders API endpoint and debug authentication issues
 * Usage: node scripts/test-orders-api.js [token]
 */

const API_URL = process.env.API_URL || "https://mizizzi-ecommerce-1.onrender.com"

async function testOrdersAPI(token) {
  console.log(`\n[Test] Testing Orders API at ${API_URL}/api/admin/orders\n`)

  if (!token) {
    console.log("[Error] No authentication token provided")
    console.log("[Info] Usage: node scripts/test-orders-api.js <token>")
    console.log("[Info] Or set the ADMIN_TOKEN environment variable")
    return
  }

  try {
    console.log("[Request] Headers:")
    console.log(`  Authorization: Bearer ${token.substring(0, 20)}...`)
    console.log(`  Content-Type: application/json\n`)

    const response = await fetch(`${API_URL}/api/admin/orders`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "Mizizzi-Admin-Test/1.0",
      },
      credentials: "include",
    })

    console.log("[Response] Status:", response.status, response.statusText)
    console.log("[Response] Headers:")
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`)
    })
    console.log("")

    const data = await response.json()

    if (response.ok) {
      console.log("[Success] Orders retrieved successfully!")
      console.log("[Data] Items count:", data.items?.length || 0)
      console.log("[Data] Total items:", data.pagination?.total_items || 0)
      console.log("[Data] Current page:", data.pagination?.current_page || 1)
      console.log("[Data] Total pages:", data.pagination?.total_pages || 1)

      if (data.items && data.items.length > 0) {
        console.log("\n[Sample] First order:")
        console.log(JSON.stringify(data.items[0], null, 2))
      }
    } else {
      console.log("[Error] API returned an error:")
      console.log(JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error("[Exception] Request failed:", error.message)
    if (error.cause) {
      console.error("[Cause]:", error.cause)
    }
  }
}

// Get token from command line or environment
const token = process.argv[2] || process.env.ADMIN_TOKEN

testOrdersAPI(token)
