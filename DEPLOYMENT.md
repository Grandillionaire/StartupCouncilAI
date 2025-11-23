# Deployment Guide - SelfStarterSuite

This guide helps you deploy your **own private instance** of SelfStarterSuite to Vercel.

## 🎯 Architecture

SelfStarterSuite is designed for **personal deployment**:
- Each user deploys their own instance
- You bring your own API keys
- Zero backend infrastructure needed
- All data stored client-side (your browser)

---

## 🚀 Quick Deploy to Vercel

### Prerequisites
- GitHub account
- Vercel account (free tier works perfectly)
- Anthropic API key (from https://console.anthropic.com)
- (Optional) Tavily API key for web research (from https://tavily.com)

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/SelfStarterSuite)

**OR Manual Steps:**

1. **Fork this repository**
   ```bash
   # Click "Fork" on GitHub
   ```

2. **Import to Vercel**
   - Go to https://vercel.com/new
   - Import your forked repository
   - Click "Deploy"

3. **Access your instance**
   - Vercel will provide a URL: `https://your-project-name.vercel.app`
   - Open the URL in your browser

4. **Add your API keys**
   - Click "Settings" in the app
   - Add your Anthropic API key
   - (Optional) Add your Tavily API key
   - Keys are stored in your browser's localStorage

🎉 **Done!** Your private AI council is running.

---

## 🔒 Security Considerations

### Your Deployment is Public (But Secure)

**What this means:**
- ✅ Your Vercel URL is accessible to anyone who knows it
- ✅ Rate limiting prevents abuse (10 requests/min)
- ✅ Your API keys stay in YOUR browser only
- ✅ No one else can use your API keys

**Share Links:**
- ✅ Safe to share - no API keys included
- ✅ Recipients see the debate, can't access your keys
- ✅ XSS protection prevents malicious links

### Recommended: Keep Your URL Private

While your instance is secure, treat your Vercel URL like a password:
- ✅ Don't share it publicly
- ✅ Share debate links, not your main URL
- ⚠️ If URL leaks, rate limiting protects you (10 req/min)

### API Key Safety

**Your API keys are safe because:**
1. Stored only in browser localStorage (never sent to Vercel)
2. API calls go: Your Browser → Vercel API Routes → Anthropic
3. Keys never logged or stored on servers
4. Each user has their own keys

---

## 🔧 Environment Variables (Optional)

For **server-side API key management** (more secure for production):

### 1. Add to Vercel Dashboard

Go to: `Project Settings → Environment Variables`

```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxx
TAVILY_API_KEY=tvly-xxx
NODE_ENV=production
```

### 2. Redeploy

Vercel will automatically redeploy with new variables.

### 3. Remove Client-Side Keys

Server-side keys take precedence. You can remove them from Settings.

**Pros:**
- ✅ Keys never in browser
- ✅ More secure
- ✅ Can't be stolen via XSS

**Cons:**
- ⚠️ You're hosting API keys (more responsibility)
- ⚠️ Need to manage key rotation

---

## 📊 Monitoring Your Deployment

### Check API Usage

1. **Anthropic Console**
   - Visit: https://console.anthropic.com
   - Check usage dashboard
   - Set up billing alerts

2. **Tavily Dashboard**
   - Visit: https://tavily.com/dashboard
   - Monitor API calls

### Check Vercel Analytics

1. Go to your Vercel project
2. Click "Analytics" tab
3. Monitor:
   - Request volume
   - Response times
   - Error rates

### Security Monitoring

Check browser console for:
```
[Security] localStorage usage: XXX KB
[SECURITY] Rate limit exceeded (suspicious)
```

---

## 🛡️ Security Features Included

Your deployment includes enterprise-grade security:

### Rate Limiting
- ✅ 10 requests/minute - Council debates
- ✅ 1 request/minute - API key validation
- ✅ 5 requests/minute - Interrupts

### Security Headers
```
✅ Content-Security-Policy
✅ X-Frame-Options: DENY
✅ Strict-Transport-Security (HSTS)
✅ X-Content-Type-Options: nosniff
✅ Referrer-Policy
✅ Permissions-Policy
```

### Input Validation
- ✅ All inputs validated with Zod schemas
- ✅ Max lengths enforced (5KB questions, 100KB history)
- ✅ API key format validation

### XSS Protection
- ✅ ReactMarkdown for all user content
- ✅ Content Security Policy headers
- ✅ No dangerouslySetInnerHTML anywhere

### Storage Protection
- ✅ Automatic cleanup at 4.5MB
- ✅ Warning at 4MB usage
- ✅ Max 50 conversations stored

---

## 🔄 Updating Your Deployment

### Auto-Updates with GitHub Actions

**Option 1: Manual Sync**
```bash
# In your fork
git remote add upstream https://github.com/original/SelfStarterSuite
git fetch upstream
git merge upstream/main
git push origin main
# Vercel auto-deploys
```

**Option 2: GitHub Action** (Recommended)

Create `.github/workflows/sync-upstream.yml`:
```yaml
name: Sync Fork
on:
  schedule:
    - cron: '0 0 * * 0' # Weekly
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Sync upstream
        run: |
          git remote add upstream https://github.com/original/SelfStarterSuite
          git fetch upstream
          git merge upstream/main
          git push
```

---

## 💰 Cost Estimation

### Vercel Hosting
- **Free tier:** Unlimited
- **Bandwidth:** Generous limits
- **Functions:** 100GB-hrs/month free

**Expected cost: $0/month** (unless you go viral)

### API Costs

**Anthropic Claude:**
- Sonnet 4.5: ~$3 per million input tokens
- Typical debate: ~10,000 tokens = $0.03

**Tavily Search:**
- Free tier: 1000 searches/month
- Pro: $100/month unlimited

**Estimated monthly cost:**
- Light use (10 debates/day): ~$9/month
- Heavy use (50 debates/day): ~$45/month

---

## 🐛 Troubleshooting

### "Rate limit exceeded"
**Cause:** Too many requests in short time
**Solution:** Wait 1 minute, try again

### "Invalid API key"
**Cause:** Incorrect key format or expired
**Solution:**
1. Check key starts with `sk-ant-`
2. Verify in Anthropic Console
3. Generate new key if needed

### "Quota exceeded"
**Cause:** Anthropic API credit limit reached
**Solution:** Add credits in Anthropic Console

### Build fails on Vercel
**Cause:** Dependency or TypeScript error
**Solution:**
```bash
# Test locally first
npm install
npm run build
# Fix any errors before deploying
```

### Share links broken
**Cause:** URL too long (>2000 chars)
**Solution:** Conversation is too large. Feature automatically truncates.

---

## 🔐 Advanced: Custom Domain

### Setup Custom Domain

1. Go to Vercel Project Settings
2. Click "Domains"
3. Add your domain: `council.yourdomain.com`
4. Update DNS (Vercel provides instructions)
5. SSL automatically configured

**Benefits:**
- ✅ Professional URL
- ✅ Custom branding
- ✅ Automatic HTTPS

---

## 📱 Mobile Access

Your deployment works perfectly on mobile:
- ✅ Responsive design
- ✅ Touch-optimized
- ✅ Progressive Web App ready

**Add to Home Screen:**
1. Open your Vercel URL on mobile
2. Safari: Share → Add to Home Screen
3. Chrome: Menu → Add to Home Screen

---

## 🤝 Best Practices

### API Key Management
- ✅ Rotate keys every 90 days
- ✅ Use separate keys for dev/prod
- ✅ Set up billing alerts
- ✅ Never commit keys to git

### Performance
- ✅ Clear old conversations regularly
- ✅ Monitor localStorage usage
- ✅ Use appropriate debate modes:
  - Quick: Simple questions
  - Standard: Normal use
  - Deep: Complex analysis

### Security
- ✅ Keep deployment URL private
- ✅ Review share links before sharing
- ✅ Monitor API usage for anomalies
- ✅ Update dependencies regularly

---

## 🆘 Support

### Issues
- GitHub Issues: Report bugs
- Discussions: Ask questions
- Security: Email maintainer for vulnerabilities

### Resources
- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Anthropic Docs](https://docs.anthropic.com)

---

## 📜 License

This is open source software. You can:
- ✅ Deploy unlimited instances
- ✅ Modify for personal use
- ✅ Share with others
- ⚠️ Not resell as a service

See LICENSE file for details.

---

**Enjoy your personal AI council!** 🎉

Need help? Open an issue on GitHub.
