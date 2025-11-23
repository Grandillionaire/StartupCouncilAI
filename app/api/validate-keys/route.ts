import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    const validation = {
      anthropic: {
        configured: !!anthropicKey,
        valid: false,
      },
      tavily: {
        configured: !!tavilyKey,
        valid: false,
        optional: true,
      },
    };

    // Validate Anthropic key format
    if (anthropicKey) {
      validation.anthropic.valid = anthropicKey.startsWith('sk-ant-');
    }

    // Validate Tavily key format
    if (tavilyKey) {
      validation.tavily.valid = tavilyKey.startsWith('tvly-');
    }

    // Overall status
    const isValid = validation.anthropic.configured && validation.anthropic.valid;

    return NextResponse.json({
      valid: isValid,
      keys: validation,
      message: isValid
        ? 'API keys configured correctly'
        : 'Anthropic API key is required',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to validate API keys' },
      { status: 500 }
    );
  }
}
