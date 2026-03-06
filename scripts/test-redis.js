import { Redis } from '@upstash/redis'

// Test configuration
const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_URL || 'https://nearby-rabbit-63956.upstash.io'
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_TOKEN || ''

console.log('[v0] Redis Test Suite Starting...\n')
console.log('[v0] Configuration:')
console.log(`  URL: ${UPSTASH_REDIS_URL}`)
console.log(`  Token: ${UPSTASH_REDIS_TOKEN ? '✓ Set' : '✗ Missing'}\n`)

// Initialize Redis client
const redis = new Redis({
  url: UPSTASH_REDIS_URL,
  token: UPSTASH_REDIS_TOKEN,
})

// Test counter
let passedTests = 0
let failedTests = 0

// Test helper function
async function test(name, fn) {
  try {
    await fn()
    console.log(`✓ ${name}`)
    passedTests++
  } catch (error) {
    console.log(`✗ ${name}`)
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}\n`)
    failedTests++
  }
}

async function runTests() {
  console.log('--- Running Tests ---\n')

  // Test 1: Connection/Ping
  await test('Redis Connection (PING)', async () => {
    const pong = await redis.ping()
    if (pong !== 'PONG' && pong !== true) {
      throw new Error(`Expected PONG or true, got ${pong}`)
    }
  })

  // Test 2: SET operation
  await test('SET operation', async () => {
    await redis.set('test_key', 'test_value')
  })

  // Test 3: GET operation
  await test('GET operation', async () => {
    const value = await redis.get('test_key')
    if (value !== 'test_value') {
      throw new Error(`Expected 'test_value', got ${value}`)
    }
  })

  // Test 4: SET with expiration
  await test('SET with expiration (EX)', async () => {
    await redis.set('expiring_key', 'expires_soon', { ex: 10 })
  })

  // Test 5: GET expiring key
  await test('GET expiring key', async () => {
    const value = await redis.get('expiring_key')
    if (value !== 'expires_soon') {
      throw new Error(`Expected 'expires_soon', got ${value}`)
    }
  })

  // Test 6: DEL operation
  await test('DEL operation', async () => {
    await redis.del('test_key')
    const value = await redis.get('test_key')
    if (value !== null) {
      throw new Error(`Expected null after delete, got ${value}`)
    }
  })

  // Test 7: INCR operation
  await test('INCR operation', async () => {
    await redis.set('counter', '0')
    const result = await redis.incr('counter')
    if (result !== 1) {
      throw new Error(`Expected counter to be 1, got ${result}`)
    }
  })

  // Test 8: MSET and MGET operations
  await test('MSET and MGET operations', async () => {
    const values = {
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
    }
    await redis.mset(values)
    const result = await redis.mget('key1', 'key2', 'key3')
    const expected = ['value1', 'value2', 'value3']
    if (JSON.stringify(result) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`)
    }
  })

  // Test 9: JSON SET/GET
  await test('JSON SET/GET operations', async () => {
    const testData = { id: 1, name: 'Test Product', price: 99.99 }
    await redis.set('product:1', JSON.stringify(testData))
    const retrieved = await redis.get('product:1')
    const parsed = JSON.parse(retrieved)
    if (JSON.stringify(parsed) !== JSON.stringify(testData)) {
      throw new Error(`Data mismatch`)
    }
  })

  // Test 10: TTL check
  await test('TTL verification', async () => {
    await redis.set('ttl_test', 'value', { ex: 5 })
    const ttl = await redis.ttl('ttl_test')
    if (ttl <= 0) {
      throw new Error(`Expected positive TTL, got ${ttl}`)
    }
  })

  // Test 11: EXISTS check
  await test('EXISTS operation', async () => {
    await redis.set('exists_test', 'value')
    const exists = await redis.exists('exists_test')
    if (exists !== 1) {
      throw new Error(`Expected 1 (exists), got ${exists}`)
    }
  })

  // Test 12: APPEND operation
  await test('APPEND operation', async () => {
    await redis.set('append_key', 'Hello')
    await redis.append('append_key', ' World')
    const value = await redis.get('append_key')
    if (value !== 'Hello World') {
      throw new Error(`Expected 'Hello World', got ${value}`)
    }
  })

  // Test 13: STRLEN operation
  await test('STRLEN operation', async () => {
    await redis.set('length_key', 'Hello')
    const length = await redis.strlen('length_key')
    if (length !== 5) {
      throw new Error(`Expected length 5, got ${length}`)
    }
  })

  // Test 14: LPUSH and LRANGE (List operations)
  await test('LPUSH and LRANGE operations', async () => {
    await redis.del('mylist')
    await redis.lpush('mylist', 'world', 'hello')
    const list = await redis.lrange('mylist', 0, -1)
    const expected = ['hello', 'world']
    if (JSON.stringify(list) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(list)}`)
    }
  })

  // Test 15: SADD and SMEMBERS (Set operations)
  await test('SADD and SMEMBERS operations', async () => {
    await redis.del('myset')
    await redis.sadd('myset', 'a', 'b', 'c')
    const members = await redis.smembers('myset')
    if (members.length !== 3 || !members.includes('a') || !members.includes('b') || !members.includes('c')) {
      throw new Error(`Expected set with a, b, c`)
    }
  })

  console.log('\n--- Test Results ---\n')
  console.log(`Passed: ${passedTests}`)
  console.log(`Failed: ${failedTests}`)
  console.log(`Total:  ${passedTests + failedTests}\n`)

  if (failedTests === 0) {
    console.log('✓ All tests passed! Redis is working correctly.')
    process.exit(0)
  } else {
    console.log('✗ Some tests failed. Check your Redis configuration.')
    process.exit(1)
  }
}

// Run tests
runTests().catch((error) => {
  console.error('[v0] Fatal error:', error)
  process.exit(1)
})
