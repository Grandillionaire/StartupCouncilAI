import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    // Validate key formats without revealing which specific keys are configured
    const anthropicValid = !!anthropicKey && anthropicKey.startsWith('sk-ant-');
    const tavilyValid = !!tavilyKey && tavilyKey.startsWith('tvly-');

    return NextResponse.json({ ready: anthropicValid || tavilyValid });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to validate API keys' },
      { status: 500 }
    );
  }
}
