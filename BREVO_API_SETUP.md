# Brevo API Setup Guide

Your backend is configured to use the Brevo API for sending emails. Here's how to set it up on Render.

## Environment Variables Required

You need to add these variables to your Render service (`MIZIZZI-ECOMMERCE`):

| Variable | Value | Notes |
|----------|-------|-------|
| `BREVO_API_KEY` | Your API Key | `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` |
| `BREVO_SENDER_EMAIL` | Sender email | `info.contactgilbertdev@gmail.com` (should be verified in Brevo) |
| `BREVO_SENDER_NAME` | Display name | `MIZIZZI` (optional, defaults to MIZIZZI) |

## Steps to Add Variables to Render

1. **Go to Render Dashboard**
   - Navigate to https://dashboard.render.com
   - Select your project: `MIZIZZI-ECOMMERCE`
   - Click on the service

2. **Update Environment**
   - Click **Environment** in the left sidebar
   - Click **Edit** button

3. **Add the Variables**
   ```
   BREVO_API_KEY=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
   BREVO_SENDER_EMAIL=info.contactgilbertdev@gmail.com
   BREVO_SENDER_NAME=MIZIZZI
   ```

4. **Remove Old Variables** (if they exist)
   - `MAIL_SERVER`
   - `MAIL_PORT`
   - `MAIL_USERNAME`
   - `MAIL_PASSWORD`

5. **Deploy**
   - Click the **X** or **Back** button to save
   - Your service will automatically redeploy with the new variables

## How It Works

The backend's `send_email()` function will:

1. Read the `BREVO_API_KEY` from environment variables
2. Make an HTTPS POST request to `https://api.brevo.com/v3/smtp/email`
3. Include your API key in the request headers: `api-key: {BREVO_API_KEY}`
4. Send the email with sender info from `BREVO_SENDER_EMAIL` and `BREVO_SENDER_NAME`

## Troubleshooting

### If you get "Invalid Brevo API key" error:
- Check that you copied the full API key correctly
- The key should start with `xkeysib-`
- Go to Brevo dashboard → Settings → SMTP & API to verify the key

### If you get "Sender not authorized" error:
- The sender email must be verified in your Brevo account
- Go to Brevo → Senders, domains, IPs → Senders
- Make sure `info.contactgilbertdev@gmail.com` is listed and verified

### If emails still aren't sending:
- Check Render service logs for error messages
- Go to Render → Your service → Logs
- Look for `[v0]` tagged log messages for detailed error info

## Testing

Once deployed, try:
1. Register a new user
2. Check if the verification email arrives
3. Check Render logs for `[v0]` messages
4. Check Brevo dashboard → Transactional → Logs for delivery status
