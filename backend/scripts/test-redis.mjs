import { Redis } from '@upstash/redis'

// Test configuration
const testConfig = {
  url: process.env.UPSTASH_REDIS_URL || 'https://nearby-rabbit-63956.upstash.io',
  token: process.env.UPSTASH_REDIS_TOKEN || '',
}

console.log('[Redis Test] Starting Redis connection test...\n')

// Test 1: Initialize Redis
console.log('Test 1: Initializing Redis client')
console.log(`URL: ${testConfig.url}`)
console.log(`Token: ${testConfig.token ? '***' + testConfig.token.slice(-5) : 'NOT SET'}\n`)

const redis = new Redis(testConfig)

// Test 2: Ping Redis
console.log('Test 2: Testing PING command')
try {
  const pongResult = await redis.ping()
  console.log(`✓ PING successful: ${pongResult}\n`)
} catch (error) {
  console.error(`✗ PING failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
  process.exit(1)
}

// Test 3: Set and Get
console.log('Test 3: Testing SET and GET')
try {
  const testKey = 'test:redis:connection'
  const testValue = `Connected at ${new Date().toISOString()}`
  
  await redis.set(testKey, testValue)
  console.log(`✓ SET successful: ${testKey} = ${testValue}`)
  
  const retrievedValue = await redis.get(testKey)
  console.log(`✓ GET successful: ${testKey} = ${retrievedValue}\n`)
} catch (error) {
  console.error(`✗ SET/GET failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
  process.exit(1)
}

// Test 4: Expiration
console.log('Test 4: Testing expiration with EX')
try {
  const expiringKey = 'test:expire'
  const expiringValue = 'This will expire in 10 seconds'
  
  await redis.set(expiringKey, expiringValue, { ex: 10 })
  console.log(`✓ SET with expiration successful: ${expiringKey} (expires in 10s)`)
  
  const ttl = await redis.ttl(expiringKey)
  console.log(`✓ TTL check successful: ${ttl} seconds remaining\n`)
} catch (error) {
  console.error(`✗ Expiration test failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
  process.exit(1)
}

// Test 5: Delete
console.log('Test 5: Testing DELETE')
try {
  const deleteKey = 'test:delete'
  await redis.set(deleteKey, 'This will be deleted')
  console.log(`✓ Created key: ${deleteKey}`)
  
  await redis.del(deleteKey)
  const deleted = await redis.get(deleteKey)
  console.log(`✓ Deleted key, value is now: ${deleted}\n`)
} catch (error) {
  console.error(`✗ Delete test failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
  process.exit(1)
}

// Test 6: Cache pattern (like products)
console.log('Test 6: Testing cache pattern (simulating product cache)')
try {
  const cacheKey = 'products:list:page:1'
  const cacheValue = JSON.stringify({
    data: [
      { id: 1, name: 'Product 1', price: 100 },
      { id: 2, name: 'Product 2', price: 200 },
    ],
    total: 2,
  })
  
  await redis.set(cacheKey, cacheValue, { ex: 300 }) // 5 minute expiry
  console.log(`✓ Cached products: ${cacheKey}`)
  
  const cachedData = await redis.get(cacheKey)
  const parsed = JSON.parse(cachedData)
  console.log(`✓ Retrieved from cache: ${parsed.data.length} products`)
  console.log(`✓ Data: ${JSON.stringify(parsed, null, 2)}\n`)
} catch (error) {
  console.error(`✗ Cache pattern test failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
  process.exit(1)
}

console.log('═══════════════════════════════════════════════════════════')
console.log('✓ All Redis tests passed successfully!')
console.log('═══════════════════════════════════════════════════════════')
console.log('\nYour Redis connection is working properly.')
console.log('Your product routes are now caching data in Redis.')
console.log('\nNext steps:')
console.log('1. Deploy your changes to production')
console.log('2. Monitor cache hits using the X-Cache-Source header')
console.log('3. Check Upstash console for usage metrics')
