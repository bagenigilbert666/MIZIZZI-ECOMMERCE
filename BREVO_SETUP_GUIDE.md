# Setting Up Brevo Email for MIZIZZI Backend on Render

## Step 1: Get Your Brevo API Key

1. Log into your Brevo account at https://app.brevo.com
2. Go to **Settings → SMTP & API**
3. Click on the **"API keys & MCP"** tab
4. You should see your API key (it looks like: `xkeysib-xxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxx`)
5. Copy this full API key

## Step 2: Add Environment Variable to Render

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your **MIZIZZI backend service**
3. Go to **Settings** tab
4. Scroll down to **Environment** section
5. Click **"Add Environment Variable"**
6. Add the following variables:

```
BREVO_API_KEY = xkeysib-YOUR-ACTUAL-KEY-HERE
BREVO_SENDER_EMAIL = info.contactgilbertdev@gmail.com
BREVO_SENDER_NAME = MIZIZZI
```

### Important Notes:
- Replace `xkeysib-YOUR-ACTUAL-KEY-HERE` with your actual API key from Brevo
- `BREVO_SENDER_EMAIL` must match the verified sender in Brevo (info.contactgilbertdev@gmail.com is already verified in your account)
- After adding these, your backend will automatically redeploy with the new environment variables

## Step 3: Verify Brevo Sender is Verified

1. Log into Brevo: https://app.brevo.com
2. Go to **Settings → Senders, Domains & Dedicated IPs**
3. Confirm that **info.contactgilbertdev@gmail.com** shows as "Verified" (you can see this in the screenshot - it's already verified ✓)

## Step 4: Test Email Sending

Once environment variables are set, try registering a new user in the MIZIZZI app. You should receive a verification email.

## Troubleshooting

If emails still don't send after adding the API key:

1. **Check Render logs**: In your Render service → Logs tab, look for `[v0] Brevo API response status`
   - Status 200/201 = Success
   - Status 401 = Invalid API key
   - Status 400 = Bad request (check payload)
   - Status 429 = Rate limited

2. **Verify API Key**: Go to Brevo Settings → SMTP & API → API keys and make sure the key is "Active"

3. **Check Sender Email**: Ensure the sender email in Brevo is verified and not in "Default" DKIM mode

## Current Brevo Setup (From Your Dashboard):

✅ Sender Email: info.contactgilbertdev@gmail.com (Verified)
✅ SMTP Server: smtp-relay.brevo.com
✅ SMTP Port: 587
⚠️ DKIM: Currently "Default" (compliance warning)
⚠️ DMARC: Freemail domain not recommended

## Optional - Fix DKIM/DMARC (Recommended for Production):

If you want to improve email deliverability:
1. In Brevo: Go to Settings → Senders, Domains & Dedicated IPs → Domains tab
2. Add your custom domain (e.g., mizizzi.com) as a sender domain
3. Add DNS records as instructed by Brevo
4. Update BREVO_SENDER_EMAIL to use your custom domain

For now, the current setup should work for development/testing.
