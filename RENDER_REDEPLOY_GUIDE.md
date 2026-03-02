# Render Backend Redeploy Guide

## The Issue
You've added the environment variables to Render, but the backend service hasn't picked them up yet because it was deployed with the old configuration.

## Solution: Redeploy the Backend

### Step 1: Trigger a Redeploy
1. Go to https://dashboard.render.com
2. Select your **MIZIZZI-ECOMMERCE** service
3. Click the **"Manual deploy"** or **"Rerun last deployment"** button at the top
   - Or go to **Deployments** tab and click **"Deploy latest commit"**

### Step 2: Wait for Redeploy
- Watch the deployment logs
- Wait until you see **"Your service is live"** message
- This typically takes 2-5 minutes

### Step 3: Test Email Sending
After redeployment:
1. Go back to your app at http://localhost:3000/auth/login
2. Try to register a new account or request verification code resend
3. Check if you receive the verification email

### Troubleshooting

**Still not working after redeploy?**

Check the backend logs:
1. In Render dashboard, go to **Logs** tab
2. Search for "Brevo" or "email" to see what's happening
3. Look for error messages that indicate:
   - Invalid API key
   - Sender email not verified
   - Rate limiting from Brevo
   - Network connectivity issues

**Check Brevo Sender Configuration:**
1. Go to https://app.brevo.com
2. Settings → Senders, Domains & Dedicated IPs
3. Verify that "info.contactgilbertdev@gmail.com" is marked as **Verified**
4. Check DKIM and DMARC status (should be configured, not warnings)

**Regenerate New SMTP Key (Recommended for Security):**
Since you shared your API key publicly, regenerate it:
1. In Brevo: Settings → SMTP & API → API keys & MCP
2. Click "Generate a new SMTP key"
3. Copy the new key
4. Update BREVO_API_KEY in Render environment variables
5. Redeploy again

## Expected Behavior After Redeploy

When you register or resend verification code:
1. Backend receives request
2. Brevo API key is now loaded from environment
3. Email is sent via Brevo SMTP API
4. User receives verification email within 5-30 seconds
5. Frontend shows success message

## Need More Help?

If emails still don't arrive:
- Check Render logs for specific error messages
- Verify Brevo sender email is fully verified (not just Validated)
- Try sending a test email directly from Brevo dashboard
- Check spam/junk folder
- Verify recipient email address is correct
