/**
 * API Route: /api/council
 * Handles streaming council debates with security enhancements
 */

import { NextRequest, NextResponse } from 'next/server';
import { CouncilOrchestrator } from '@/lib/agents/council';
import type { StreamEvent } from '@/lib/agents/types';
import {
  CouncilDebateRequestSchema,
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
    // SECURITY: Rate limiting - 10 requests per minute per IP
    const identifier = getRateLimitIdentifier(request);
    const rateLimit = checkRateLimit(identifier, 10, 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // SECURITY: Parse and validate request body with Zod
    const body = await request.json();
    const validatedData = CouncilDebateRequestSchema.parse(body);

    // Support both environment variables AND user-provided keys
    const apiKey = validatedData.anthropicKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured. Please add your API key in Settings.' },
        { status: 400 }
      );
    }

    // Create a TransformStream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the debate in the background
    (async () => {
      try {
        const orchestrator = new CouncilOrchestrator(apiKey, {
          model: validatedData.model,
          mode: validatedData.mode,
          selectedAdvisors: validatedData.advisors,
          enableResearch: validatedData.enableResearch,
          tavilyApiKey: validatedData.tavilyKey,
        });

        await orchestrator.runCouncilDebate(
          validatedData.question,
          validatedData.conversationHistory || '',
          async (event: StreamEvent) => {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            await writer.write(encoder.encode(data));
          },
          {
            continueDebate: validatedData.continueDebate || false,
            regenerate: validatedData.regenerate || false,
          }
        );

        // Stream closes naturally after debate completes
      } catch (error) {
        console.error('Debate error:', error);

        // SECURITY: Use safe error message that doesn't expose internals
        const errorEvent: StreamEvent = {
          type: 'error',
          content: getSafeErrorMessage(error),
          timestamp: Date.now(),
        };
        await writer.write(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    // Return the readable stream
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    // SECURITY: Log validation failures for monitoring
    if (error instanceof z.ZodError) {
      logSecurityEvent({
        type: 'invalid_input',
        message: 'Invalid council debate request',
        metadata: { errors: error.issues },
      });

      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: process.env.NODE_ENV === 'development' ? error.issues : undefined,
        },
        { status: 400 }
      );
    }

    console.error('API error:', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500 }
    );
  }
}
