# Notification System Setup Guide

## Overview

The notification system is now **production-ready** and will send real emails and SMS when properly configured. In development mode (without API keys), it logs notifications to the console.

## Quick Start

### 1. Email Setup (Resend - Recommended)

Resend is easy to set up and has a generous free tier (3,000 emails/month).

1. **Sign up for Resend**: Go to https://resend.com and create an account
2. **Get your API key**: 
   - Go to https://resend.com/api-keys
   - Click "Create API Key"
   - Copy the key (starts with `re_`)
3. **Set environment variables**:
   ```env
   EMAIL_SERVICE=resend
   EMAIL_SERVICE_API_KEY=re_your_api_key_here
   EMAIL_FROM_ADDRESS=alerts@yourdomain.com
   ```
   - For testing, you can use `onboarding@resend.dev` as the from address
   - For production, you need to verify your domain in Resend

### 2. SMS Setup (Twilio)

Twilio is the industry standard for SMS.

1. **Sign up for Twilio**: Go to https://www.twilio.com/try-twilio
2. **Get your credentials**:
   - Account SID (starts with `AC`)
   - Auth Token
   - Phone number (get a free trial number from the Twilio console)
3. **Set environment variables**:
   ```env
   SMS_SERVICE=twilio
   SMS_SERVICE_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SMS_SERVICE_API_KEY=your_auth_token_here
   SMS_FROM_NUMBER=+1234567890
   ```

## Environment Variables

Create a `.env.local` file in your project root:

```env
# Email (Resend)
EMAIL_SERVICE=resend
EMAIL_SERVICE_API_KEY=re_your_key_here
EMAIL_FROM_ADDRESS=alerts@yourdomain.com

# SMS (Twilio)
SMS_SERVICE=twilio
SMS_SERVICE_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMS_SERVICE_API_KEY=your_auth_token_here
SMS_FROM_NUMBER=+1234567890
```

## Testing

### Development Mode (No API Keys)
- Notifications are logged to the console
- No actual emails/SMS are sent
- Perfect for local development

### Production Mode (With API Keys)
- Real emails sent via Resend
- Real SMS sent via Twilio
- All notifications are delivered to registered users

## How It Works

1. **User Registration**: Users register their email/phone in the Notification Manager
2. **Automatic Inclusion**: Registered users are automatically included in critical breach alerts
3. **Real Delivery**: When a breach occurs:
   - Email is sent via Resend to registered email addresses
   - SMS is sent via Twilio to registered phone numbers
   - Notifications are logged in the notification history

## Cost Estimates

### Resend (Email)
- **Free tier**: 3,000 emails/month
- **Paid**: $20/month for 50,000 emails
- Perfect for most use cases

### Twilio (SMS)
- **Free trial**: $15.50 credit (good for ~100 SMS)
- **Paid**: ~$0.0075 per SMS in US
- Cost-effective for critical alerts

## Troubleshooting

### Emails not sending?
1. Check that `EMAIL_SERVICE_API_KEY` is set correctly
2. Verify your `EMAIL_FROM_ADDRESS` is verified in Resend
3. Check the server logs for error messages
4. For testing, use `onboarding@resend.dev` as the from address

### SMS not sending?
1. Check that all Twilio credentials are set (SID, Auth Token, From Number)
2. Verify your Twilio account has credits
3. Ensure phone numbers are in E.164 format (+1234567890)
4. Check the server logs for error messages

### Still in development mode?
- Make sure your `.env.local` file is in the project root
- Restart your Next.js server after adding environment variables
- Check that variable names match exactly (case-sensitive)

## Security Notes

- **Never commit** `.env.local` to git (it's already in `.gitignore`)
- Use environment variables in production (Vercel, AWS, etc.)
- Rotate API keys regularly
- Use separate API keys for development and production

## Next Steps

1. Set up your Resend account and get an API key
2. Set up your Twilio account (optional, for SMS)
3. Add environment variables to `.env.local`
4. Test by registering your email/phone and triggering a test alert
5. Deploy to production with environment variables configured

The system is ready to send real notifications! 🎉

