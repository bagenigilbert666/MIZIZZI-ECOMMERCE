#!/usr/bin/env node

/**
 * Feature Cards Cache Invalidation Script
 * 
 * Automatically invalidates feature cards cache after backend updates.
 * 
 * Usage:
 *   node scripts/invalidate-feature-cards-cache.js [options]
 * 
 * Options:
 *   --url <url>          Frontend URL (default: http://localhost:3000)
 *   --token <token>      Cache invalidation token
 *   --timeout <ms>       Request timeout in milliseconds (default: 10000)
 *   --verify            Also verify cache was invalidated
 *   --check-status      Only check cache status, don't invalidate
 */

const https = require('https');
const http = require('http');

class CacheInvalidator {
  constructor(options = {}) {
    this.baseUrl = options.url || process.env.FRONTEND_URL || 'http://localhost:3000';
    this.token = options.token || process.env.CACHE_INVALIDATION_TOKEN;
    this.timeout = options.timeout || 10000;
    this.verify = options.verify || false;
    this.checkOnly = options.checkOnly || false;
  }

  async request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (this.token) {
        options.headers['Authorization'] = `Bearer ${this.token}`;
      }

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: parsed,
            });
          } catch (err) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: data,
            });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  async checkStatus() {
    console.log('📊 Checking feature cards cache status...\n');

    try {
      const result = await this.request('GET', '/api/feature-cards');
      
      console.log('✅ Frontend API Status:');
      console.log(`   Status Code: ${result.status}`);
      console.log(`   Items Count: ${Array.isArray(result.body) ? result.body.length : 'N/A'}`);
      console.log(`   Cache Control: ${result.headers['cache-control'] || 'Not set'}`);
      
      if (!Array.isArray(result.body) || result.body.length === 0) {
        console.log('   ⚠️  No data returned - checking backend...');
      }

      return result;
    } catch (err) {
      console.error('❌ Failed to check cache status:', err.message);
      throw err;
    }
  }

  async invalidate() {
    console.log('🧹 Invalidating feature cards cache...\n');

    try {
      const result = await this.request('POST', '/api/feature-cards/invalidate', {});

      if (result.status === 200 || result.status === 204) {
        console.log('✅ Cache invalidation successful!');
        console.log(`   Status: ${result.status}`);
        
        if (result.body.invalidatedTags) {
          console.log(`   Invalidated Tags: ${result.body.invalidatedTags.join(', ')}`);
        }
        
        if (result.body.timestamp) {
          console.log(`   Timestamp: ${result.body.timestamp}`);
        }

        return result;
      } else if (result.status === 401) {
        console.error('❌ Unauthorized - Invalid or missing cache invalidation token');
        console.error('   Set CACHE_INVALIDATION_TOKEN environment variable or use --token flag');
        throw new Error('Unauthorized');
      } else {
        console.error(`❌ Failed with status ${result.status}`);
        console.error('   Response:', result.body);
        throw new Error(`HTTP ${result.status}`);
      }
    } catch (err) {
      console.error('❌ Cache invalidation failed:', err.message);
      throw err;
    }
  }

  async run() {
    try {
      console.log(`🔗 Target URL: ${this.baseUrl}`);
      console.log(`🔐 Auth Token: ${this.token ? '✓ Set' : '✗ Not set (public endpoint)'}`);
      console.log('');

      if (this.checkOnly) {
        await this.checkStatus();
      } else {
        // Invalidate
        await this.invalidate();

        // Verify if requested
        if (this.verify) {
          console.log('');
          console.log('⏳ Waiting 2 seconds before verification...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log('');
          await this.checkStatus();
        }
      }

      console.log('');
      console.log('✨ Done!');
      process.exit(0);
    } catch (err) {
      console.log('');
      console.log('💥 Error:', err.message);
      process.exit(1);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  url: process.env.FRONTEND_URL || 'http://localhost:3000',
  token: process.env.CACHE_INVALIDATION_TOKEN,
  timeout: 10000,
  verify: false,
  checkOnly: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--url':
      options.url = args[++i];
      break;
    case '--token':
      options.token = args[++i];
      break;
    case '--timeout':
      options.timeout = parseInt(args[++i]);
      break;
    case '--verify':
      options.verify = true;
      break;
    case '--check-status':
      options.checkOnly = true;
      break;
    case '--help':
    case '-h':
      console.log(`
Feature Cards Cache Invalidation Script

Usage:
  node scripts/invalidate-feature-cards-cache.js [options]

Options:
  --url <url>          Frontend URL (default: http://localhost:3000)
  --token <token>      Cache invalidation token
  --timeout <ms>       Request timeout in milliseconds (default: 10000)
  --verify             Also verify cache was invalidated
  --check-status       Only check cache status, don't invalidate
  --help               Show this help message

Environment Variables:
  FRONTEND_URL                Base URL of frontend (e.g., https://mysite.com)
  CACHE_INVALIDATION_TOKEN    Bearer token for cache invalidation

Examples:
  # Invalidate cache with token
  node scripts/invalidate-feature-cards-cache.js \\
    --url https://mysite.com \\
    --token secret-token \\
    --verify

  # Check cache status only
  node scripts/invalidate-feature-cards-cache.js --check-status

  # Invalidate with environment variables
  FRONTEND_URL=https://mysite.com \\
  CACHE_INVALIDATION_TOKEN=secret-token \\
  node scripts/invalidate-feature-cards-cache.js
      `);
      process.exit(0);
  }
}

// Run the invalidator
const invalidator = new CacheInvalidator(options);
invalidator.run();
