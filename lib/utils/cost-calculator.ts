/**
 * Cost Calculator for AI Council Debates
 * Estimates and tracks token usage and costs
 */

export type ClaudeModel = 'claude-opus-4-5' | 'claude-sonnet-4-5' | 'claude-haiku-4';
export type DebateMode = 'quick' | 'standard' | 'deep';

// Anthropic API pricing (per million tokens) - January 2025
const PRICING = {
  'claude-opus-4-5': {
    input: 15.00,   // $15 per MTok
    output: 75.00,  // $75 per MTok
  },
  'claude-sonnet-4-5': {
    input: 3.00,    // $3 per MTok
    output: 15.00,  // $15 per MTok
  },
  'claude-haiku-4': {
    input: 0.80,    // $0.80 per MTok
    output: 4.00,   // $4 per MTok
  },
};

// Average token counts based on empirical data
const AVG_TOKENS = {
  userQuestion: 50,         // Average user question length
  advisorResponse: 250,     // Average advisor response
  researchContext: 300,     // Research findings added to context
  moderatorAnalysis: 500,   // Moderator consensus analysis
  finalAnswer: 800,         // Final synthesized answer
};

export interface CostEstimate {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCost: number;
  breakdown: {
    advisorResponses: number;
    moderatorAnalysis: number;
    finalAnswer: number;
    research?: number;
  };
  model: ClaudeModel;
  mode: DebateMode;
  advisorCount: number;
}

export interface ActualCost {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  model: ClaudeModel;
  timestamp: number;
}

/**
 * Estimate debate cost before it starts
 */
export function estimateDebateCost(
  model: ClaudeModel,
  mode: DebateMode,
  advisorCount: number,
  enableResearch: boolean
): CostEstimate {
  const rounds = mode === 'quick' ? 1 : mode === 'standard' ? 2 : 3;
  const pricing = PRICING[model];

  // Input tokens (what we send to API)
  let inputTokens = AVG_TOKENS.userQuestion; // Initial question

  // Each advisor gets context + their persona
  const advisorInputPerRound =
    AVG_TOKENS.userQuestion +                    // Question
    (enableResearch ? AVG_TOKENS.researchContext : 0) + // Research if enabled
    100;                                         // Persona + instructions

  // Later rounds include other advisors' responses in context
  const contextGrowth = (advisorCount - 1) * AVG_TOKENS.advisorResponse;

  for (let round = 0; round < rounds; round++) {
    const contextSize = round === 0 ? 0 : contextGrowth;
    inputTokens += advisorCount * (advisorInputPerRound + contextSize);
  }

  // Moderator analysis (once)
  inputTokens += advisorCount * AVG_TOKENS.advisorResponse + AVG_TOKENS.userQuestion;

  // Final answer generation
  inputTokens += advisorCount * AVG_TOKENS.advisorResponse + AVG_TOKENS.moderatorAnalysis;

  // Output tokens (what API generates)
  const advisorOutputTokens = advisorCount * rounds * AVG_TOKENS.advisorResponse;
  const moderatorOutputTokens = AVG_TOKENS.moderatorAnalysis;
  const finalAnswerTokens = AVG_TOKENS.finalAnswer;
  const outputTokens = advisorOutputTokens + moderatorOutputTokens + finalAnswerTokens;

  // Calculate costs
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    estimatedInputTokens: Math.round(inputTokens),
    estimatedOutputTokens: Math.round(outputTokens),
    estimatedCost: Number(totalCost.toFixed(4)),
    breakdown: {
      advisorResponses: Number(((advisorOutputTokens / 1_000_000) * pricing.output).toFixed(4)),
      moderatorAnalysis: Number(((moderatorOutputTokens / 1_000_000) * pricing.output).toFixed(4)),
      finalAnswer: Number(((finalAnswerTokens / 1_000_000) * pricing.output).toFixed(4)),
      research: enableResearch ? 0.01 : undefined, // Tavily API cost (approximate)
    },
    model,
    mode,
    advisorCount,
  };
}

/**
 * Calculate actual cost from Anthropic API usage
 */
export function calculateActualCost(
  model: ClaudeModel,
  inputTokens: number,
  outputTokens: number
): ActualCost {
  const pricing = PRICING[model];

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    inputTokens,
    outputTokens,
    totalCost: Number(totalCost.toFixed(4)),
    model,
    timestamp: Date.now(),
  };
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return '<$0.01';
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Format tokens for display
 */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens} tokens`;
  }
  return `${(tokens / 1000).toFixed(1)}K tokens`;
}

/**
 * Get cost warning level based on estimated cost
 */
export function getCostWarningLevel(estimatedCost: number): 'low' | 'medium' | 'high' {
  if (estimatedCost < 0.10) return 'low';      // Under $0.10
  if (estimatedCost < 0.50) return 'medium';   // $0.10 - $0.50
  return 'high';                                // Over $0.50
}

/**
 * Get model comparison info
 */
export function getModelComparison(): {
  model: ClaudeModel;
  speed: string;
  quality: string;
  cost: string;
}[] {
  return [
    {
      model: 'claude-haiku-4',
      speed: 'Fastest',
      quality: 'Good',
      cost: 'Cheapest ($0.01-0.05/debate)',
    },
    {
      model: 'claude-sonnet-4-5',
      speed: 'Balanced',
      quality: 'Great',
      cost: 'Moderate ($0.05-0.20/debate)',
    },
    {
      model: 'claude-opus-4-5',
      speed: 'Slower',
      quality: 'Best',
      cost: 'Premium ($0.20-1.00/debate)',
    },
  ];
}
