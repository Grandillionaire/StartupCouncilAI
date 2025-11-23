# Security Policy

## Supported Versions

We release patches for security vulnerabilities. The following versions are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of SelfStarterSuite seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do Not

- **Do not** open a public GitHub issue for security vulnerabilities
- **Do not** disclose the vulnerability publicly until it has been addressed

### How to Report

Please report security vulnerabilities by emailing **maximgagievv@gmail.com** with:

1. **Subject Line:** `[SECURITY] SelfStarterSuite - Brief Description`
2. **Description:** A clear description of the vulnerability
3. **Steps to Reproduce:** Detailed steps to reproduce the vulnerability
4. **Impact:** Your assessment of the potential impact
5. **Suggested Fix:** If you have suggestions on how to fix it (optional)

### What to Expect

- **Acknowledgment:** We will acknowledge receipt of your vulnerability report within 48 hours
- **Assessment:** We will assess the vulnerability and determine its severity
- **Timeline:** We will provide an estimated timeline for a fix within 7 days
- **Updates:** We will keep you informed of our progress
- **Credit:** If you wish, we will credit you in the release notes when the fix is published

### Security Update Process

1. The security vulnerability is received and assigned to a primary handler
2. The problem is confirmed and a list of affected versions is determined
3. Code is audited to find any similar problems
4. Fixes are prepared for all supported versions
5. New versions are released and announcements are made

## Security Best Practices for Users

### API Key Management

- **Never commit API keys** to version control
- Store API keys in `.env` file (already in `.gitignore`)
- Use environment variables in production deployments
- Rotate API keys periodically
- The application stores API keys in browser localStorage only - they never leave your machine
- **Note:** Client-side storage of API keys is suitable for personal use only. For production deployments, implement server-side key management.

### Deployment Security

- Always use HTTPS in production (enforced via HSTS header)
- Keep dependencies updated (`npm audit` regularly)
- Review security advisories for dependencies
- Use environment-specific configurations
- **Rate limiting is now implemented** - 10 requests/minute for debates, 1 request/minute for API key validation
- Security headers configured (CSP, X-Frame-Options, HSTS, etc.)

### Data Privacy

- **No data is sent to SelfStarterSuite servers** - all API calls go directly to Anthropic/Tavily
- API keys are stored locally in browser localStorage
- Conversation history is stored locally in browser localStorage
- No telemetry or analytics are collected by default

### Dependencies

- We regularly audit dependencies for vulnerabilities
- Run `npm audit` before deploying
- Keep Node.js and npm updated
- Review `package-lock.json` changes in pull requests

## Security Enhancements (v1.0.1+)

### Implemented Protections

**Input Validation & Sanitization**
- Comprehensive Zod schemas for all API inputs
- Maximum length limits on all user-provided data (5000 chars for questions, 100KB for conversation history)
- Format validation for API keys and URLs
- Protection against prototype pollution attacks via strict schema validation
- Suspicious content detection (script tags, javascript: URLs, etc.)

**Rate Limiting**
- Council debate API: 10 requests/minute per IP
- API key validation: 1 request/minute per IP (aggressive to prevent brute force)
- Interrupt endpoint: 5 requests/minute per IP
- Standard HTTP rate limit headers included in responses (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After)

**XSS Protection**
- ReactMarkdown used for all user-generated content rendering (safe by default)
- Content Security Policy (CSP) headers configured
- X-XSS-Protection header enabled
- All message content sanitized before display
- No use of dangerouslySetInnerHTML anywhere in codebase

**Security Headers**
- Content-Security-Policy: Restricts resource loading to trusted sources
- X-Frame-Options: DENY (prevents clickjacking)
- X-Content-Type-Options: nosniff (prevents MIME sniffing)
- Strict-Transport-Security: Forces HTTPS with preload
- Referrer-Policy: Limits referrer information leakage
- Permissions-Policy: Disables unnecessary browser features (camera, microphone, geolocation)

**Error Handling**
- Safe error messages in production (no internal details exposed)
- Development-only detailed error responses with validation errors
- Security event logging for monitoring suspicious activities
- No stack traces in production responses

**Storage Protection**
- localStorage quota monitoring (4MB warning, 4.5MB critical threshold)
- Automatic cleanup when quota exceeded
- Limited history retention (50 conversations max)
- Protection against client-side DoS via storage exhaustion

**Data Validation**
- Share URL data validated with Zod schemas before processing
- Protection against JSON deserialization attacks
- Base64 input validation before decoding (character set and length checks)
- Maximum message count limits (100 messages per shared conversation)

**Security Logging**
- Failed validation attempts logged with metadata
- Rate limit violations tracked
- Suspicious activity detection and logging
- Production-ready for integration with monitoring services (Sentry, DataDog, etc.)

## Known Security Considerations

### Client-Side API Key Storage (Design Decision)

The application stores API keys in browser localStorage for user convenience. This is an intentional design choice for the target use case.

**Suitable for:**
- Personal use
- Development environments
- Trusted single-user deployments
- Users who control their own browser environment

**Security considerations:**
- Keys are accessible to JavaScript (XSS risk mitigated by CSP and ReactMarkdown)
- Keys are visible in browser DevTools (acceptable for personal use)
- No encryption at rest (browser localStorage limitation)

**For production multi-user deployments, implement:**
- Server-side API key management with secure storage (encrypted at rest)
- User authentication/authorization layer
- Session-based key access with HTTP-only cookies
- API key encryption at rest using industry-standard algorithms
- Regular key rotation policies and audit trails

### Third-Party API Usage

This application makes API calls to:
- **Anthropic Claude API** - For AI model inference
- **Tavily API** - For web research (optional)

**Security measures:**
- All API calls go directly from server to third-party (client→server→API)
- API keys never logged in production
- Rate limiting prevents API abuse and cost attacks
- Input validation prevents injection attacks
- API keys validated before use

**Users should:**
- Review the privacy policies of these services
- Understand that data sent to these APIs is subject to their terms
- Use API keys with appropriate rate limits and quotas
- Monitor API usage for unexpected patterns
- Set up billing alerts on API provider dashboards

## Security Checklist for Contributors

When contributing code, please ensure:

- [x] No hardcoded secrets or API keys
- [x] Input validation for all user inputs (using Zod schemas)
- [x] No use of `eval()` or similar dangerous functions
- [x] No `dangerouslySetInnerHTML` without sanitization (ReactMarkdown used everywhere)
- [x] Dependencies are up to date
- [x] No known security vulnerabilities in dependencies
- [x] Proper error handling (no stack traces exposed to users in production)
- [x] CORS configured appropriately
- [ ] No SQL injection vulnerabilities (N/A - no database)
- [x] No XSS vulnerabilities in rendered content (ReactMarkdown + CSP headers)
- [x] Rate limiting implemented on all API endpoints
- [x] Security logging for suspicious activities
- [x] localStorage quota management to prevent DoS

**Additional checks for new code:**
- [ ] All new API routes have rate limiting
- [ ] All new inputs are validated with Zod schemas
- [ ] Error messages don't expose sensitive information
- [ ] New dependencies audited with `npm audit`
- [ ] Security implications documented for design decisions

## Vulnerability Disclosure Timeline

- **Day 0:** Vulnerability reported
- **Day 1-2:** Acknowledgment sent to reporter
- **Day 3-7:** Vulnerability assessed and verified
- **Day 7-30:** Fix developed and tested
- **Day 30+:** Fix released, security advisory published, reporter credited (if desired)

## Past Security Issues

### v1.0.0 - Security Audit Findings (Resolved in v1.0.1)

**Critical Issues Fixed:**
- **XSS in share page (CVE-pending):** Raw HTML rendering without sanitization → Fixed by implementing ReactMarkdown for all content
- **Unsafe JSON deserialization (CVE-pending):** No validation of decoded share URLs → Added comprehensive Zod validation
- **API key brute force vulnerability:** No rate limiting on validation endpoint → Implemented aggressive 1 req/min limit

**High Severity Issues Fixed:**
- **Missing rate limiting:** No DoS protection on API endpoints → Implemented across all routes with appropriate limits
- **Missing security headers:** No CSP, HSTS, or frame protection → Comprehensive header configuration added
- **Information disclosure in errors:** Stack traces exposed to users → Safe error messages in production
- **No input validation:** Missing length and format checks → Zod schemas for all inputs

**Medium Severity Issues Fixed:**
- **localStorage quota exhaustion:** No protection against storage DoS → Auto-cleanup and monitoring implemented
- **Incomplete error handling:** Inconsistent error responses → Centralized safe error handling

**Security Improvements:**
- Added security event logging system
- Implemented content validation and sanitization
- Added protection against prototype pollution
- Enhanced monitoring capabilities

## Security Architecture

### Defense in Depth Strategy

SelfStarterSuite implements multiple layers of security:

1. **Network Layer:** HTTPS enforced, HSTS header, secure API connections
2. **Application Layer:** Input validation, rate limiting, safe error handling
3. **Data Layer:** localStorage quotas, automatic cleanup, data validation
4. **Presentation Layer:** ReactMarkdown for safe rendering, CSP headers
5. **Monitoring Layer:** Security event logging, quota tracking

### Security Testing

Run security checks before deploying:

```bash
# Dependency vulnerabilities
npm audit

# Build check (includes TypeScript type safety)
npm run build

# Test in development mode to see detailed errors
npm run dev

# Check for hardcoded secrets (recommended)
git secrets --scan || echo "Install git-secrets for automated scanning"
```

## Contact

For security-related questions or concerns, contact:
- **Email:** maximgagievv@gmail.com
- **GitHub Issues:** For non-security bugs only

---

Thank you for helping keep SelfStarterSuite and its users safe!
