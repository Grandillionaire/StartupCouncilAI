/**
 * API Route: /api/council/interrupt
 * Handles real-time interruptions during debate
 * SECURITY: Validated and rate-limited
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  InterruptRequestSchema,
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
    // SECURITY: Rate limiting - 5 interrupts per minute
    const identifier = getRateLimitIdentifier(request);
    const rateLimit = checkRateLimit(identifier, 5, 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many interruption attempts. Please slow down.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // SECURITY: Validate request body
    const body = await request.json();
    const validatedData = InterruptRequestSchema.parse(body);

    // TODO: In a production system with session management, this would:
    // 1. Find the active debate session (using session ID or user ID)
    // 2. Pause the current streaming response
    // 3. Inject the interruption into the conversation history
    // 4. Resume the debate with the new context
    //
    // For now, we acknowledge the interruption
    // The frontend handles showing it to the user
    // The next API call will include this in conversationHistory

    return NextResponse.json(
      {
        success: true,
        message: 'Interruption received',
        timestamp: Date.now(),
      },
      { status: 200 }
    );
  } catch (error) {
    // Log validation failures
    if (error instanceof z.ZodError) {
      logSecurityEvent({
        type: 'invalid_input',
        message: 'Invalid interrupt request',
        metadata: { errors: error.issues },
      });

      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    console.error('Interrupt error:', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500 }
    );
  }
}
