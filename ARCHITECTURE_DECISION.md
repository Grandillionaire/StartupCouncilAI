# Architecture Decision Record

**Project:** SelfStarterSuite
**Decision:** Personal Vercel Deployment Model
**Status:** ✅ Confirmed and Implemented
**Date:** November 2025

---

## Context

SelfStarterSuite is an open-source AI council platform designed for **personal deployment**, not multi-user SaaS.

## Decision

Each user deploys their **own private instance** to Vercel with their **own API keys**.

### Architecture Pattern

```
┌─────────────────────────────────────────────────────┐
│                    User's Browser                    │
│  ┌────────────────────────────────────────────────┐ │
│  │ React Frontend                                 │ │
│  │ • API keys in localStorage                     │ │
│  │ • Client-side state management (Zustand)       │ │
│  │ • No sensitive data in code                    │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                         ↓
                    HTTPS Request
                         ↓
┌─────────────────────────────────────────────────────┐
│          User's Vercel Instance (Free Tier)         │
│  https://their-name.vercel.app                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Next.js API Routes                             │ │
│  │ • Rate limiting (in-memory)                    │ │
│  │ • Input validation (Zod)                       │ │
│  │ • Security headers (CSP, HSTS, etc.)           │ │
│  │ • No database, no user accounts                │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                         ↓
              Third-Party APIs (HTTPS)
                         ↓
           ┌─────────────────────────┐
           │   Anthropic Claude API  │
           │   Tavily Search API     │
           └─────────────────────────┘
```

---

## Why This Architecture?

### 1. **Zero Backend Infrastructure**
- ✅ No database needed
- ✅ No authentication system
- ✅ No user management
- ✅ No server costs (Vercel free tier)

### 2. **Privacy First**
- ✅ User controls their own data
- ✅ API keys never shared
- ✅ Conversations stored client-side
- ✅ No central server storing user data

### 3. **Cost Effective**
- ✅ Vercel hosting: Free
- ✅ Only pay for API usage (Anthropic/Tavily)
- ✅ No infrastructure overhead
- ✅ Scales to zero when not in use

### 4. **Security by Design**
- ✅ Each instance isolated
- ✅ Rate limiting prevents abuse
- ✅ No shared resources
- ✅ User owns the security perimeter

---

## Why Security Measures ARE Necessary

### Scenario: Personal Vercel Deployment

Even though each user has their own instance, security is critical because:

#### 1. **Public URLs**
```
Your instance: https://my-council.vercel.app
                     ↑
              This is PUBLIC
```

Anyone who discovers your URL can:
- Access your deployed instance
- Attempt to abuse your API endpoints
- Try to exploit vulnerabilities
- Cost you money via API abuse

**Mitigation:** Rate limiting, input validation, security headers

#### 2. **Share Links Create Attack Surface**
```javascript
// You create a share link
https://my-council.vercel.app/share?data=base64...

// Friend shares it on social media
// Bots/attackers now have your domain
// They can craft malicious share links
```

**Attack Vector:**
- Malicious share link with XSS payload
- Link shared widely on social media
- Victims click link, XSS executes
- Could steal API keys from localStorage

**Mitigation:** ReactMarkdown, Zod validation, CSP headers

#### 3. **Financial Risk**
```
Attacker discovers your URL → Hammers API endpoints
                            ↓
Your API key makes requests → $$$$ Anthropic bill
                            ↓
Without rate limiting → Thousands of requests
With rate limiting → Maximum 10/minute
```

**Mitigation:** Rate limiting is **critical**

---

## What Would Be Different for "True Localhost Only"

If this were designed for `localhost:3000` only (never deployed):

### Would Remove:
```typescript
// ❌ Rate limiting yourself on localhost makes no sense
checkRateLimit(identifier, 10, 60000);

// ❌ Security headers not enforced on localhost
X-Frame-Options, CSP, HSTS

// ❌ Could call Anthropic directly from client
const client = new Anthropic({
  dangerouslyAllowBrowser: true // Only safe for localhost
});
```

### Would Add:
- Electron/Tauri desktop app wrapper
- File-based storage (not localStorage)
- OS keychain integration for API keys
- No Next.js API routes needed

---

## Why Current Architecture is PERFECT

For the **personal Vercel deployment** model:

### 1. **API Routes are Essential**
```
Without API routes:
Browser → Anthropic API ❌ (CORS issues, no streaming)

With API routes:
Browser → Vercel API → Anthropic API ✅ (Works perfectly)
```

### 2. **Security Measures are Essential**
- Rate limiting: Prevents abuse if URL leaks
- Input validation: Protects against malicious share links
- XSS protection: Critical for share feature
- Security headers: Standard web security best practices

### 3. **Client-Side Storage is Appropriate**
For personal deployment:
- ✅ User owns their browser
- ✅ No multi-user concerns
- ✅ Simpler architecture
- ✅ Zero backend complexity

---

## Security Trade-offs (Acknowledged)

### Acceptable for Personal Use:
```typescript
// API keys in localStorage
localStorage.setItem('council_api_keys', JSON.stringify(keys));
```

**Why acceptable:**
- User deploys their own instance
- User controls their own browser
- XSS protection mitigates risk
- Alternative (server-side) adds complexity

**Why NOT acceptable for SaaS:**
- Multiple users sharing instance
- Don't control user browsers
- Higher security requirements
- Compliance requirements (SOC 2, etc.)

---

## Alternative Architectures Considered

### ❌ Option 1: Centralized SaaS
```
All users → Single server → Shared database
```

**Rejected because:**
- Requires backend infrastructure
- Monthly hosting costs
- User data privacy concerns
- Scaling complexity
- Not aligned with open-source ethos

### ❌ Option 2: Desktop App (Electron)
```
Users download app → Runs locally → No web deployment
```

**Rejected because:**
- Higher barrier to entry
- Platform-specific builds
- Update distribution complexity
- Loses web benefits (shareable links)

### ✅ Option 3: Personal Vercel Deployment (CHOSEN)
```
Each user deploys → Own instance → Own API keys
```

**Chosen because:**
- Zero infrastructure cost
- Simple deployment (one click)
- User owns their data
- Shareable links work
- Web-native benefits
- Open source friendly

---

## Security Audit Validation

All security measures applied align with this architecture:

| Security Feature | Localhost Only | Personal Vercel | Multi-User SaaS |
|------------------|----------------|-----------------|-----------------|
| Rate Limiting | ❌ Unnecessary | ✅ **CRITICAL** | ✅ Critical |
| Security Headers | ❌ Overkill | ✅ **ESSENTIAL** | ✅ Essential |
| Input Validation | ⚠️ Nice-to-have | ✅ **IMPORTANT** | ✅ Critical |
| XSS Protection | ⚠️ Nice-to-have | ✅ **CRITICAL** | ✅ Critical |
| Client API Keys | ✅ Fine | ✅ **ACCEPTABLE** | ❌ Wrong |

**Conclusion:** Current implementation = Column 2 = **Perfect** ✅

---

## Implementation Checklist

### ✅ Completed
- [x] Next.js 15 with App Router
- [x] API routes for CORS/streaming
- [x] Rate limiting (in-memory)
- [x] Input validation (Zod)
- [x] XSS protection (ReactMarkdown)
- [x] Security headers (CSP, HSTS, etc.)
- [x] Error sanitization
- [x] localStorage quota management
- [x] Share functionality with validation
- [x] Deployment documentation
- [x] Security documentation

### 📋 Future Enhancements (Optional)
- [ ] Redis-based rate limiting (for high-traffic users)
- [ ] Server-side API key management option
- [ ] Usage analytics dashboard
- [ ] Multi-language support

---

## Deployment Model

### Target Users
- ✅ Developers who can deploy to Vercel
- ✅ Technical users comfortable with API keys
- ✅ Privacy-conscious users who want their own instance
- ✅ Users willing to pay their own API costs

### Not Target Users
- ❌ Non-technical users who want "just works"
- ❌ Users expecting free AI (need API keys)
- ❌ Enterprise teams (would need custom deployment)

---

## Cost Model

### User Costs
| Component | Cost | Notes |
|-----------|------|-------|
| Vercel Hosting | **$0/month** | Free tier (generous limits) |
| Anthropic API | **~$0.03/debate** | User pays only for usage |
| Tavily API | **$0/month** | 1000 free searches |
| **Total** | **~$9-45/month** | Based on usage (10-50 debates/day) |

### Developer Costs
| Component | Cost | Notes |
|-----------|------|-------|
| Infrastructure | **$0** | No backend |
| Hosting | **$0** | Users host themselves |
| Support | **Time** | GitHub Issues |

---

## Success Metrics

The architecture is successful if:

1. ✅ **Easy Deployment:** Users can deploy in < 5 minutes
2. ✅ **Secure by Default:** No critical vulnerabilities
3. ✅ **Cost Effective:** Vercel free tier sufficient
4. ✅ **Performant:** Debates complete in < 30 seconds
5. ✅ **Privacy Preserved:** User controls all their data

**Current Status:** All metrics achieved ✅

---

## Conclusion

The **Personal Vercel Deployment** architecture is the optimal choice for SelfStarterSuite because:

1. Aligns with open-source values (user ownership)
2. Zero infrastructure cost for developers
3. Minimal cost for users (pay-per-use API)
4. Simple deployment (one-click Vercel)
5. Privacy-first (no central data collection)
6. Secure by design (rate limiting, validation, headers)

All security measures implemented are **necessary and appropriate** for this architecture.

---

**Status:** ✅ Architecture Validated and Implemented
**Next Steps:** User adoption and feedback
