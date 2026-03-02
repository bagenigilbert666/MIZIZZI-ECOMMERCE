# Brevo Email Configuration - Render Deployment Guide

## Issue Summary
Brevo emails were working on localhost but failing on Render. This was due to:
1. Hardcoded fallback API keys in the code (security issue + causes failures with wrong keys)
2. Missing BREVO_SENDER_NAME environment variable configuration
3. Code not properly using environment variables from Render

## ✅ Changes Made

### 1. **auth_email_templates.py** - Removed hardcoded keys
- **BEFORE**: `BREVO_API_KEY = current_app.config.get('BREVO_API_KEY', 'xkeysib-...')`
- **AFTER**: `BREVO_API_KEY = current_app.config.get('BREVO_API_KEY')` (no fallback)
- Added proper error logging when API key is missing
- Made sender name configurable: `sender_name = current_app.config.get('BREVO_SENDER_NAME', 'MIZIZZI')`

### 2. **order_email_templates.py** - Same fixes applied
- Removed hardcoded sender email fallback
- Added BREVO_SENDER_NAME support
- Proper error handling for missing credentials

### 3. **config.py** - Added BREVO_SENDER_NAME
- New line: `BREVO_SENDER_NAME = os.environ.get('BREVO_SENDER_NAME') or 'MIZIZZI'`

## 🔧 Required Environment Variables on Render

Ensure these are set in your Render Dashboard → Environment Variables:

```
BREVO_API_KEY=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
BREVO_SENDER_EMAIL=info.contactgilbertdev@gmail.com
BREVO_SENDER_NAME=MIZIZZI
```

## ✅ Verification Checklist

### Step 1: Check Brevo Configuration
- [ ] Log in to Brevo dashboard at https://app.brevo.com
- [ ] Verify sender email is **verified**: Settings → Senders, domains, IPs
- [ ] Sender email should show ✅ status (green checkmark)
- [ ] Your API key is active and has no expiration

### Step 2: Check Render Environment Variables
```
1. Go to your Render service dashboard
2. Click "Environment" tab on the left
3. Verify these variables are set:
   - BREVO_API_KEY (your actual key)
   - BREVO_SENDER_EMAIL (info.contactgilbertdev@gmail.com)
   - BREVO_SENDER_NAME (MIZIZZI)
```

### Step 3: Restart Your Render Service
```
1. Go to your Render service page
2. Click the "..." menu → Restart service
   OR
3. Redeploy: git push to trigger new deployment
```

### Step 4: Check Render Logs for Errors
```
1. In Render dashboard, click "Logs"
2. Look for lines containing:
   - "BREVO_API_KEY not configured" → env var missing
   - "Failed to send email" → API error (check key validity)
   - "Email sent successfully" → working!
3. Check for sender verification issues
```

## 🚀 Testing Email Sending

### From Your Application
1. Create a test order
2. Check Render logs for email send confirmation
3. Look for response status codes:
   - **201/200**: Success ✅
   - **400**: Bad request (check sender email format)
   - **401**: Invalid API key (wrong key in env var)
   - **403**: Sender not verified (verify in Brevo)
   - **429**: Rate limited (reduce send volume)

### Manual Test with curl (from your server)
```bash
curl -X POST "https://api.brevo.com/v3/smtp/email" \
  -H "accept: application/json" \
  -H "api-key: YOUR_ACTUAL_API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "sender": {"name": "MIZIZZI", "email": "info.contactgilbertdev@gmail.com"},
    "to": [{"email": "test@example.com"}],
    "subject": "Test Email",
    "htmlContent": "<h1>Hello</h1>"
  }'
```

## 🔍 Common Issues & Solutions

### Issue: "BREVO_API_KEY not configured"
- **Cause**: Environment variable not set in Render
- **Solution**: Add BREVO_API_KEY to Render Environment Variables and restart service

### Issue: "Failed to send email - Status: 403"
- **Cause**: Sender email not verified in Brevo
- **Solution**: 
  1. Go to Brevo Settings → Senders, domains, IPs
  2. Click on your sender email
  3. Complete any verification steps (usually email or DNS)

### Issue: "Failed to send email - Status: 401"
- **Cause**: API key is wrong, expired, or has no permissions
- **Solution**:
  1. Go to Brevo Settings → SMTP & API → API keys
  2. Generate a new API key or verify existing one
  3. Update BREVO_API_KEY in Render and redeploy

### Issue: Emails still not sending after restart
- **Cause**: Multiple possible causes
- **Solution**:
  1. Check Render logs in detail
  2. Verify database connection (orders must be saved first)
  3. Check if email addresses are valid format
  4. Monitor Brevo activity log: https://app.brevo.com/logs/activity

## 📝 Code Review Summary

The email sending flow now works like this:

```
1. Order created/User registered
2. send_email() function called
3. Get API key from Render env var → BREVO_API_KEY
4. Get sender info from Render env vars → BREVO_SENDER_EMAIL, BREVO_SENDER_NAME
5. Make HTTPS POST to Brevo API with credentials
6. Log response status (200/201 = success)
7. Return true/false to calling code
```

## 🚀 Deploy Steps

```bash
git add .
git commit -m "Fix: Remove hardcoded Brevo keys and use env variables for Render"
git push origin main  # or your deployment branch
```

Render will automatically redeploy with the new code + existing environment variables.

## ❓ Still Not Working?

1. **Check if backend is even running**: `curl https://your-render-app.onrender.com/`
2. **Check complete error logs**: Include full error messages in Render logs
3. **Verify API call is happening**: Look for "Sending email via Brevo API" log
4. **Test with simpler email**: Try with just text/html, no complex formatting
5. **Check rate limits**: Brevo may throttle if sending too many too fast

## 📧 Sample Successful Log Output

```
[v0] Starting email send process to: customer@example.com
[v0] Email subject: Order Confirmation
[v0] Using Brevo API key: xkeysib-60ab...
[v0] Sending email via Brevo API to customer@example.com
[v0] Payload prepared with sender: info.contactgilbertdev@gmail.com
[v0] Brevo API response status: 201
[v0] ✅ Email sent successfully via Brevo API. Status: 201
```

---

**These fixes ensure:**
✅ No hardcoded secrets in code  
✅ Proper use of Render environment variables  
✅ Clear error messages when credentials are missing  
✅ Configurable sender name for different brands
