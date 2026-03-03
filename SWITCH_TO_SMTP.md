# Switching from Brevo API to SMTP

Your backend has been updated to use **SMTP instead of the REST API** for sending emails. This is more reliable for transactional emails like verification codes.

## Why SMTP is Better

- ✅ **More Reliable**: Industry-standard protocol, widely used for transactional emails
- ✅ **Better Error Handling**: Clear SMTP error codes help with debugging
- ✅ **No API Rate Limits**: Fewer potential timeout issues
- ✅ **Direct Connection**: Simpler and more predictable than HTTP REST calls

## Required Render Environment Variables

You need to update your **Render backend environment variables**. Replace these:

### Remove (no longer needed):
- `BREVO_API_KEY` - We're switching to SMTP

### Add/Update these:

| Variable | Value | Source |
|----------|-------|--------|
| `MAIL_SERVER` | `smtp-relay.brevo.com` | Fixed |
| `MAIL_PORT` | `587` | Fixed |
| `MAIL_USERNAME` | `8b0ea2003@smtp-brevo.com` | From your Brevo SMTP Settings |
| `MAIL_PASSWORD` | *(from Brevo SMTP key)* | From your Brevo SMTP Settings |
| `BREVO_SENDER_EMAIL` | `info.contactgilbertdev@gmail.com` | Your verified sender email |
| `BREVO_SENDER_NAME` | `MIZIZZI` | Your sender name |

## How to Update on Render

1. **Go to your Render Dashboard**
   - Navigate to your `MIZIZZI-ECOMMERCE` service
   - Click **Environment** in the left sidebar
   - Click **Edit** next to Environment Variables

2. **Update the variables:**
   - Delete: `BREVO_API_KEY`
   - Add/Verify:
     ```
     MAIL_SERVER = smtp-relay.brevo.com
     MAIL_PORT = 587
     MAIL_USERNAME = 8b0ea2003@smtp-brevo.com
     MAIL_PASSWORD = [your SMTP password from Brevo]
     BREVO_SENDER_EMAIL = info.contactgilbertdev@gmail.com
     BREVO_SENDER_NAME = MIZIZZI
     ```

3. **Get your SMTP credentials from Brevo:**
   - Go to your Brevo account
   - Settings → SMTP & API → SMTP tab
   - You'll see the SMTP key value and login

4. **Redeploy your backend** on Render after updating

## Troubleshooting

### Email still not sending?

Check these in order:

1. **SMTP credentials correct?**
   - Verify `MAIL_USERNAME` and `MAIL_PASSWORD` match your Brevo SMTP settings exactly
   - The password is **not** your Brevo account password - it's the SMTP key value

2. **Sender email verified in Brevo?**
   - Go to Brevo → Senders, domains, IPs
   - Verify that `info.contactgilbertdev@gmail.com` is listed and verified
   - If not, you need to add and verify it first

3. **Check Render logs:**
   - In Render dashboard, go to **Logs**
   - Look for `[v0]` messages showing email sending details
   - Common errors shown with helpful suggestions

### Error: "Authentication failed"
- Your `MAIL_USERNAME` or `MAIL_PASSWORD` is incorrect
- Double-check them against your Brevo SMTP settings

### Error: "Connection refused"
- Render can't reach `smtp-relay.brevo.com`
- This is rare but check your Render network settings

### Error: "sender email not verified"
- Add your sender email as a verified sender in Brevo
- The sender must be verified before Brevo allows emails to be sent

## Testing Email Sending

After deployment, try:

1. Go to frontend and register a new account with an email
2. Check your email for the verification code
3. If it fails, check Render logs for detailed error messages with [v0] prefix

The logs will show exactly what's wrong with very clear hints about what to fix.

## Fallback to API (if SMTP fails)

If for some reason SMTP doesn't work, you can still use the API by adding back `BREVO_API_KEY` and the old `send_email` function, but SMTP is strongly recommended.
