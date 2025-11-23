/**
 * API Key Validation Endpoint
 * Tests if provided API keys are valid
 * SECURITY: Heavily rate-limited to prevent brute force attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  ApiKeyValidationSchema,
  checkRateLimit,
  getRateLimitIdentifier,
  getSafeErrorMessage,
  logSecurityEvent,
} from '@/lib/utils/security';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: VERY aggressive rate limiting - 1 request per minute per IP
    // This prevents brute-force validation of stolen keys
    const identifier = getRateLimitIdentifier(request);
    const rateLimit = checkRateLimit(identifier, 1, 60 * 1000);

    if (!rateLimit.allowed) {
      logSecurityEvent({
        type: 'rate_limit',
        message: 'API key validation rate limit exceeded',
        metadata: { identifier },
      });

      return NextResponse.json(
        {
          valid: false,
          error: 'Too many validation attempts. Please wait before trying again.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '1',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // SECURITY: Validate input format before making API call
    const body = await request.json();
    const validatedData = ApiKeyValidationSchema.parse(body);

    // Test Anthropic key with a minimal API call
    try {
      const client = new Anthropic({ apiKey: validatedData.anthropicKey });

      // Make a minimal test call (uses cheapest model)
      await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });

      // If we get here, key is valid
      return NextResponse.json({ valid: true });
    } catch (error: any) {
      // Don't log full error details for security
      console.error('API key validation failed');

      if (error.status === 401) {
        return NextResponse.json(
          { valid: false, error: 'Invalid Anthropic API key' },
          { status: 200 }
        );
      }

      if (error.message?.includes('credit')) {
        return NextResponse.json(
          { valid: false, error: 'API key is valid but has insufficient credits' },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { valid: false, error: 'Failed to validate API key' },
        { status: 200 }
      );
    }
  } catch (error) {
    // Log validation failures
    if (error instanceof z.ZodError) {
      logSecurityEvent({
        type: 'invalid_input',
        message: 'Invalid API key validation request',
        metadata: { errors: error.issues },
      });

      return NextResponse.json(
        { valid: false, error: 'Invalid request format' },
        { status: 400 }
      );
    }

    console.error('Validation endpoint error:', error);
    return NextResponse.json(
      { valid: false, error: getSafeErrorMessage(error) },
      { status: 500 }
    );
  }
}
