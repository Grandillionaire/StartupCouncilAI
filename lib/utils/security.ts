/**
 * Security Utilities
 * Centralized security functions for error handling, logging, and validation
 */

import { z } from 'zod';

// ============================================================================
// ERROR HANDLING - Prevent information disclosure
// ============================================================================

/**
 * Get a safe error message that doesn't expose internal details in production
 */
export function getSafeErrorMessage(error: unknown): string {
  if (process.env.NODE_ENV === 'development') {
    return error instanceof Error ? error.message : 'Unknown error occurred';
  }

  // Production: return generic messages only
  if (error instanceof Error) {
    // Map known error types to user-friendly messages
    if (error.message.includes('API key')) {
      return 'Invalid API key. Please check your settings.';
    }
    if (error.message.includes('rate limit')) {
      return 'Too many requests. Please try again later.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (error.message.includes('network')) {
      return 'Network error. Please check your connection.';
    }
  }

  return 'An error occurred. Please try again.';
}

/**
 * Log security events (for monitoring and audit trail)
 */
export function logSecurityEvent(event: {
  type: 'rate_limit' | 'invalid_input' | 'auth_failure' | 'suspicious_activity';
  message: string;
  ip?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    severity: 'SECURITY',
    ...event,
  };

  // In production, send to monitoring service (Sentry, DataDog, etc.)
  if (process.env.NODE_ENV === 'production') {
    console.error('[SECURITY]', JSON.stringify(logEntry));
    // TODO: Send to monitoring service
  } else {
    console.warn('[SECURITY]', logEntry);
  }
}

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

/**
 * Advisor names enum for validation
 */
export const AdvisorNameSchema = z.enum(['naval', 'elon', 'larry', 'alex', 'pavel']);

/**
 * Debate mode validation
 */
export const DebateModeSchema = z.enum(['quick', 'standard', 'deep']);

/**
 * Claude model validation
 */
export const ClaudeModelSchema = z.enum(['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4']);

/**
 * Message type validation
 */
export const MessageTypeSchema = z.enum(['user', 'agent', 'moderator', 'final', 'system', 'error', 'interruption']);

/**
 * Research source validation
 */
export const ResearchSourceSchema = z.object({
  title: z.string().max(500),
  url: z.string().url().max(2000),
  snippet: z.string().max(2000),
});

/**
 * Message schema for conversation validation
 */
export const MessageSchema = z.object({
  id: z.string().max(100),
  type: MessageTypeSchema,
  content: z.string().max(50000), // Reasonable limit for message content
  timestamp: z.number().min(0),
  agent: z.string().max(50).optional(),
  sources: z.array(ResearchSourceSchema).max(10).optional(),
  isStreaming: z.boolean().optional(),
  rating: z.number().min(-1).max(1).optional(),
});

/**
 * Council debate request validation schema
 */
export const CouncilDebateRequestSchema = z.object({
  question: z.string()
    .min(1, 'Question cannot be empty')
    .max(5000, 'Question is too long (max 5000 characters)'),
  conversationHistory: z.string()
    .max(100000, 'Conversation history is too large'),
  mode: DebateModeSchema,
  advisors: z.array(AdvisorNameSchema)
    .min(2, 'Select at least 2 advisors')
    .max(5, 'Maximum 5 advisors allowed'),
  model: ClaudeModelSchema,
  enableResearch: z.boolean(),
  continueDebate: z.boolean().optional(),
  regenerate: z.boolean().optional(),
  anthropicKey: z.string()
    .regex(/^sk-ant-/, 'Invalid Anthropic API key format')
    .optional(),
  tavilyKey: z.string()
    .regex(/^tvly-/, 'Invalid Tavily API key format')
    .optional(),
});

/**
 * Shareable conversation validation schema
 */
export const ShareableConversationSchema = z.object({
  title: z.string().max(200),
  question: z.string().max(5000),
  messages: z.array(MessageSchema).max(100), // Limit number of messages
  timestamp: z.number().min(0),
  model: z.string().max(50),
  mode: z.string().max(20),
  advisors: z.array(z.string()).max(5),
});

/**
 * API key validation request schema
 */
export const ApiKeyValidationSchema = z.object({
  anthropicKey: z.string()
    .min(10)
    .max(200)
    .regex(/^sk-ant-/, 'Invalid API key format'),
  tavilyKey: z.string()
    .min(10)
    .max(200)
    .optional(),
});

/**
 * Interrupt request validation schema
 */
export const InterruptRequestSchema = z.object({
  interruption: z.string()
    .min(1, 'Interruption message cannot be empty')
    .max(2000, 'Interruption message is too long'),
  currentContext: z.array(z.object({
    id: z.string(),
    type: z.string(),
    content: z.string().max(10000),
    timestamp: z.number(),
  })).max(50), // Limit context size
});

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const rateLimitStore: RateLimitStore = {};

/**
 * Simple in-memory rate limiter
 * For production, use Redis or a dedicated rate limiting service
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    Object.keys(rateLimitStore).forEach(k => {
      if (rateLimitStore[k].resetAt < now) {
        delete rateLimitStore[k];
      }
    });
  }

  // Get or create rate limit entry
  if (!rateLimitStore[key] || rateLimitStore[key].resetAt < now) {
    rateLimitStore[key] = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  const entry = rateLimitStore[key];
  entry.count++;

  const allowed = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);

  if (!allowed) {
    logSecurityEvent({
      type: 'rate_limit',
      message: `Rate limit exceeded for ${identifier}`,
      metadata: { identifier, count: entry.count, maxRequests },
    });
  }

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit identifier from request
 */
export function getRateLimitIdentifier(request: Request): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';

  return `ip:${ip}`;
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize user input to prevent XSS and injection attacks
 * Note: This is a basic sanitizer. For HTML content, use DOMPurify on the client
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .slice(0, 10000); // Hard limit on length
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

// ============================================================================
// SECURE COMPARISON
// ============================================================================

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// ============================================================================
// CONTENT VALIDATION
// ============================================================================

/**
 * Check if content contains suspicious patterns
 */
export function containsSuspiciousContent(content: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /eval\(/i,
    /expression\(/i,
    /vbscript:/i,
    /data:text\/html/i,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(content));
}

/**
 * Validate that message content is safe
 */
export function validateMessageContent(content: string): { valid: boolean; reason?: string } {
  if (content.length > 50000) {
    return { valid: false, reason: 'Content exceeds maximum length' };
  }

  if (containsSuspiciousContent(content)) {
    logSecurityEvent({
      type: 'suspicious_activity',
      message: 'Suspicious content detected in message',
      metadata: { contentPreview: content.slice(0, 100) },
    });
    return { valid: false, reason: 'Content contains suspicious patterns' };
  }

  return { valid: true };
}
