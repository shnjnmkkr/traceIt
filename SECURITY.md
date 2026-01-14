# Security & API Protection Guide

## 🔒 Implemented Safeguards

### 1. Rate Limiting
All API routes are protected with in-memory rate limiting:

- **AI Chat**: 10 messages per minute per user
- **Image Upload/OCR**: 5 uploads per hour per user
- **Bug Reports**: 5 reports per day per IP
- **Community Templates**: 10 shares per day per user
- **Attendance Updates**: 100 per hour per user
- **Timetable Operations**: 50 per hour per user

### 2. Input Validation
- Message length limited to 1000 characters
- Bug report title max 200 chars, description max 2000 chars
- Screenshot uploads limited to 5MB
- Template names max 100 chars, descriptions max 500 chars

### 3. Authentication
- All sensitive routes require Supabase authentication
- Row Level Security (RLS) enabled on all database tables
- User can only access/modify their own data

### 4. Environment Variables
- All API keys stored in `.env.local` (not committed to git)
- Automatic validation on startup
- Warning for placeholder values

## 🚨 Cost Monitoring

### Groq API (AI Chat)
- **Free Tier**: 14,400 requests/day, ~6,000 requests/hour
- **With Rate Limiting**: Max 10 req/min = 600/hour per user
- **Safe For**: ~10 concurrent users
- **Monitor**: https://console.groq.com/usage

### Supabase
- **Free Tier**: 500MB database, 2GB bandwidth/month, 50,000 monthly active users
- **With Rate Limiting**: Should stay well within limits
- **Monitor**: https://supabase.com/dashboard/project/_/settings/billing

### Google Gemini (if used for OCR)
- **Free Tier**: 15 requests/minute
- **With Rate Limiting**: Max 5 uploads/hour per user (safe)
- **Monitor**: https://aistudio.google.com/app/apikey

## 📊 Expected User Capacity

With current rate limits:
- **10-50 users**: Safe on all free tiers
- **50-100 users**: Monitor Groq usage
- **100-500 users**: May need paid Groq tier ($0.10/1M tokens)
- **500+ users**: Consider Redis-based rate limiting + paid tiers

## 🛡️ Additional Security Measures

### 1. Upgrade Rate Limiter (for production)
Current implementation uses in-memory storage (resets on server restart).

For production, consider **Upstash Redis** (free tier available):
```bash
npm install @upstash/redis @upstash/ratelimit
```

### 2. Add CORS Protection
In `next.config.js`:
```js
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE' },
      ],
    },
  ];
}
```

### 3. Add Request Logging
Track suspicious activity:
```typescript
// Log all API requests
console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
```

### 4. Enable Supabase Captcha
For auth routes: https://supabase.com/docs/guides/auth/auth-captcha

### 5. Set up Monitoring
- **Sentry**: Error tracking (free tier: 5K errors/month)
- **LogRocket**: Session replay
- **Vercel Analytics**: Traffic monitoring

## 🔐 Environment Variables Security

### ✅ DO:
- Keep `.env.local` in `.gitignore`
- Use separate keys for dev/production
- Rotate keys if exposed
- Use Vercel environment variables for deployment

### ❌ DON'T:
- Commit API keys to git
- Share keys in screenshots/demos
- Use production keys in development
- Store sensitive keys in client-side code

## 📈 Scaling Path

1. **0-100 users**: Current setup (free tiers)
2. **100-1K users**: 
   - Upstash Redis for rate limiting
   - Groq paid tier (~$10/month)
   - Supabase Pro ($25/month)
3. **1K-10K users**:
   - Dedicated Redis
   - CDN for static assets
   - Database connection pooling
4. **10K+ users**:
   - Multiple API key rotation
   - Load balancing
   - Dedicated database

## 🚀 Quick Security Checklist

Before deployment:
- [ ] All environment variables set in Vercel/hosting platform
- [ ] `.env.local` in `.gitignore`
- [ ] Supabase RLS policies enabled
- [ ] Rate limiting tested
- [ ] Error messages don't expose sensitive info
- [ ] HTTPS enforced
- [ ] Supabase Auth email verification enabled
- [ ] Monitor API usage dashboards

## 📞 Incident Response

If API keys are exposed:
1. **Immediately revoke** the exposed key
2. **Generate new key** in the provider dashboard
3. **Update** environment variables
4. **Redeploy** application
5. **Monitor** for unusual activity
6. **Check billing** for unexpected charges

## 🔗 Useful Links

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Groq Console](https://console.groq.com)
- [Google AI Studio](https://aistudio.google.com)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
