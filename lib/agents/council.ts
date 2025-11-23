/**
 * AI Council Orchestrator
 * Manages multi-agent debate with consensus detection
 */

import Anthropic from '@anthropic-ai/sdk';
import { PERSONAS, ADVISOR_NAMES, type AdvisorName } from './personas';
import type { Message, DebateState, ConsensusAnalysis, StreamEvent, ResearchResult } from './types';
import { TavilyClient } from 'tavily';
import { estimateDebateCost, type CostEstimate } from '../utils/cost-calculator';

type ClaudeModel = 'claude-opus-4-5' | 'claude-sonnet-4-5' | 'claude-haiku-4';
type DebateMode = 'quick' | 'standard' | 'deep';

interface OrchestratorConfig {
  model?: ClaudeModel;
  mode?: DebateMode;
  selectedAdvisors?: AdvisorName[];
  enableResearch?: boolean;
  tavilyApiKey?: string; // NEW: Allow passing Tavily key from browser
}

interface DebateOptions {
  continueDebate?: boolean;
  regenerate?: boolean;
}

export class CouncilOrchestrator {
  private client: Anthropic;
  private maxRounds: number = 2;
  private model: string;
  private selectedAdvisors: AdvisorName[];
  private enableResearch: boolean;
  private tavilyClient: TavilyClient | null;
  private userEnabledResearch: boolean; // User's preference from settings

  constructor(apiKey: string, config?: OrchestratorConfig) {
    this.client = new Anthropic({ apiKey });

    // Initialize Tavily client if API key is available (browser-provided or environment)
    const tavilyKey = config?.tavilyApiKey || process.env.TAVILY_API_KEY;
    if (tavilyKey) {
      this.tavilyClient = new TavilyClient({ apiKey: tavilyKey });
    } else {
      this.tavilyClient = null;
    }

    // Map frontend model names to API model names
    const modelMap: Record<ClaudeModel, string> = {
      'claude-opus-4-5': 'claude-opus-4-20250514',
      'claude-sonnet-4-5': 'claude-sonnet-4-20250514',
      'claude-haiku-4': 'claude-3-5-haiku-20241022',
    };

    this.model = config?.model ? modelMap[config.model] : 'claude-sonnet-4-20250514';

    // Map debate mode to rounds
    const modeMap: Record<DebateMode, number> = {
      'quick': 1,
      'standard': 2,
      'deep': 3,
    };

    this.maxRounds = config?.mode ? modeMap[config.mode] : 2;
    this.selectedAdvisors = config?.selectedAdvisors || [...ADVISOR_NAMES];

    // Research is only enabled when explicitly requested (keyword-based)
    this.userEnabledResearch = config?.enableResearch === true;
    this.enableResearch = this.userEnabledResearch;
  }

  /**
   * Detect if user's question contains research-triggering keywords
   */
  private shouldActivateResearch(question: string): boolean {
    if (!this.tavilyClient) {
      return false; // Can't research without API key
    }

    // If user has research enabled in settings, always use it
    if (this.userEnabledResearch) {
      return true;
    }

    // Otherwise, check for research-triggering keywords
    const researchKeywords = [
      'research',
      'search',
      'look online',
      'look up',
      'find online',
      'check online',
      'google',
      'what does the data say',
      'latest data',
      'current data',
      'recent data',
      'find out',
      'look it up',
      'check the',
      'verify',
      'fact check',
      'statistics',
      'stats on',
      'numbers on',
      'data on',
    ];

    const lowerQuestion = question.toLowerCase();
    return researchKeywords.some(keyword => lowerQuestion.includes(keyword));
  }

  /**
   * Perform web research using Tavily
   */
  private async performResearch(query: string, onEvent?: (event: StreamEvent) => void): Promise<ResearchResult[]> {
    // Check if research is requested but API key is missing
    if (this.enableResearch && !this.tavilyClient) {
      onEvent?.({
        type: 'system',
        content: 'Research requested but TAVILY_API_KEY not configured. Get your free API key at https://tavily.com',
        timestamp: Date.now(),
      });
      return [];
    }

    if (!this.enableResearch || !this.tavilyClient) {
      return [];
    }

    try {
      onEvent?.({
        type: 'research_start',
        content: `Searching for: ${query}`,
        timestamp: Date.now(),
      });

      const response = await this.tavilyClient.search({
        query: query,
        max_results: 3,
        search_depth: 'basic',
      });

      const results: ResearchResult[] = response.results?.map((result) => ({
        title: result.title || 'Untitled',
        url: result.url || '',
        snippet: result.content || '',
      })) || [];

      onEvent?.({
        type: 'research_complete',
        timestamp: Date.now(),
      });

      return results;
    } catch (error) {
      console.error('Research error:', error);
      onEvent?.({
        type: 'research_complete',
        timestamp: Date.now(),
      });
      return [];
    }
  }

  /**
   * Initialize a new debate session
   */
  createInitialState(userQuestion: string): DebateState {
    // Create agentResponses only for selected advisors
    const agentResponses: Record<AdvisorName, string[]> = {} as Record<AdvisorName, string[]>;
    for (const advisor of this.selectedAdvisors) {
      agentResponses[advisor] = [];
    }

    return {
      messages: [
        {
          role: 'user',
          content: userQuestion,
          timestamp: Date.now(),
        },
      ],
      currentRound: 0,
      maxRounds: this.maxRounds,
      consensusReached: false,
      needsClarification: false,
      agentResponses,
    };
  }

  /**
   * Check if moderator needs clarification from user
   */
  async checkForClarification(state: DebateState): Promise<{ needsClarification: boolean; question?: string }> {
    const userQuestion = state.messages.find((m) => m.role === 'user')?.content || '';

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      system: [
        {
          type: "text",
          text: PERSONAS.moderator.systemPrompt,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [
        {
          role: 'user',
          content: `A user has asked: "${userQuestion}"

Analyze this question. Is it clear enough for the advisors to provide valuable, specific advice?

If the question is too vague, lacks context, or needs clarification, respond with:
NEEDS_CLARIFICATION: [your specific clarifying question]

If the question is clear enough, respond with:
CLEAR

Examples of questions that need clarification:
- "Should I start a business?" (What kind? What's your background? What resources do you have?)
- "How do I make money?" (What skills do you have? What's your timeline? Risk tolerance?)

Examples of clear questions:
- "I'm a software engineer with $50k savings. Should I quit my job to build a SaaS product for project management?"
- "What's the best way to validate a business idea before investing significant time and money?"`,
        },
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    if (content.startsWith('NEEDS_CLARIFICATION:')) {
      return {
        needsClarification: true,
        question: content.replace('NEEDS_CLARIFICATION:', '').trim(),
      };
    }

    return { needsClarification: false };
  }

  /**
   * Get response from a single advisor
   */
  async getAdvisorResponse(
    advisorName: AdvisorName,
    state: DebateState,
    onStream?: (content: string) => void,
    onEvent?: (event: StreamEvent) => void
  ): Promise<{ response: string }> {
    const persona = PERSONAS[advisorName];
    const userQuestion = state.messages.find((m) => m.role === 'user')?.content || '';

    // Build research context from state (research happened BEFORE debate)
    const researchContext = state.researchResults && state.researchResults.length > 0
      ? `\n\n**RESEARCH FINDINGS** (cite these sources in your response):\n${state.researchResults.map((r, i) =>
          `[${i + 1}] ${r.title}\n   Source: ${r.url}\n   ${r.snippet}`
        ).join('\n\n')}\n\nIMPORTANT: When using research findings, cite them like "[1]" or "according to [2]"`
      : '';

    // Build context from previous rounds
    let contextMessages: { role: 'user' | 'assistant'; content: string }[] = [
      {
        role: 'user',
        content: `You are participating in an AI council debate. The user has asked:\n\n"${userQuestion}"${researchContext}\n\n${
          state.currentRound === 0
            ? 'This is Round 1. Provide your initial perspective on this question based on your expertise and thinking framework.' + (researchContext ? ' Use the research findings above and cite sources with [1], [2], etc.' : '')
            : `This is Round ${state.currentRound + 1}. Here's what other advisors have said:\n\n${this.buildAdvisorContext(
                state,
                advisorName
              )}\n\nProvide your response, addressing points of agreement or disagreement with other advisors if relevant.${researchContext ? ' Continue citing research sources with [1], [2], etc.' : ''}`
        }`,
      },
    ];

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 250,
      // Enable prompt caching on system prompt (saves 90% on repeated calls)
      system: [
        {
          type: "text",
          text: persona.systemPrompt,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: contextMessages,
      stream: !!onStream,
    });

    if (onStream) {
      let fullContent = '';
      // @ts-ignore - stream types
      for await (const event of response) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const text = event.delta.text;
          fullContent += text;
          onStream(text);
        }
      }
      return { response: fullContent };
    } else {
      // @ts-ignore
      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      return { response: responseText };
    }
  }

  /**
   * Build context from other advisors' responses
   */
  private buildAdvisorContext(state: DebateState, currentAdvisor: AdvisorName): string {
    const otherAdvisors = this.selectedAdvisors.filter((name) => name !== currentAdvisor);
    let context = '';

    for (const advisor of otherAdvisors) {
      const responses = state.agentResponses[advisor];
      if (responses && responses.length > 0) {
        const latestResponse = responses[responses.length - 1];
        context += `**${PERSONAS[advisor].name}**: ${latestResponse}\n\n`;
      }
    }

    return context;
  }

  /**
   * Analyze consensus among advisors
   */
  async analyzeConsensus(state: DebateState): Promise<ConsensusAnalysis> {
    // Get the latest response from each advisor
    const latestResponses = this.selectedAdvisors.map((name) => {
      const responses = state.agentResponses[name];
      return {
        advisor: PERSONAS[name].name,
        response: responses && responses.length > 0 ? responses[responses.length - 1] : '',
      };
    }).filter((r) => r.response.length > 0);

    if (latestResponses.length < 3) {
      return {
        consensusReached: false,
        agreementLevel: 0,
        agreements: [],
        disagreements: [],
      };
    }

    const userQuestion = state.messages.find((m) => m.role === 'user')?.content || '';

    const analysisPrompt = `Analyze the following advisor responses to determine if consensus has been reached.

User Question: "${userQuestion}"

Advisor Responses:
${latestResponses.map((r) => `${r.advisor}:\n${r.response}\n`).join('\n---\n')}

Determine:
1. Is there consensus on the core answer/recommendation? (3+ advisors must agree on the fundamental answer)
2. What are the key points of agreement?
3. What are the key points of disagreement?
4. What is the majority view?
5. Are there minority views worth noting?

Respond in this format:
CONSENSUS: [YES/NO]
AGREEMENT_LEVEL: [0-100]
AGREEMENTS:
- [point 1]
- [point 2]
DISAGREEMENTS:
- [point 1]
- [point 2]
MAJORITY_VIEW: [summary]
MINORITY_VIEWS: [summary if any]`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1000,
      system: [
        {
          type: "text",
          text: PERSONAS.moderator.systemPrompt,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse the response
    const consensusMatch = content.match(/CONSENSUS:\s*(YES|NO)/i);
    const agreementLevelMatch = content.match(/AGREEMENT_LEVEL:\s*(\d+)/);
    const agreementsMatch = content.match(/AGREEMENTS:([\s\S]*?)(?=DISAGREEMENTS:|$)/);
    const disagreementsMatch = content.match(/DISAGREEMENTS:([\s\S]*?)(?=MAJORITY_VIEW:|$)/);
    const majorityViewMatch = content.match(/MAJORITY_VIEW:([\s\S]*?)(?=MINORITY_VIEWS:|$)/);
    const minorityViewsMatch = content.match(/MINORITY_VIEWS:([\s\S]*?)$/);

    const parseList = (text: string): string[] => {
      return text
        .split('\n')
        .filter((line) => line.trim().startsWith('-'))
        .map((line) => line.trim().substring(1).trim());
    };

    return {
      consensusReached: consensusMatch ? consensusMatch[1].toUpperCase() === 'YES' : false,
      agreementLevel: agreementLevelMatch ? parseInt(agreementLevelMatch[1]) / 100 : 0,
      agreements: agreementsMatch ? parseList(agreementsMatch[1]) : [],
      disagreements: disagreementsMatch ? parseList(disagreementsMatch[1]) : [],
      majorityView: majorityViewMatch ? majorityViewMatch[1].trim() : undefined,
      minorityViews: minorityViewsMatch ? [minorityViewsMatch[1].trim()] : undefined,
    };
  }

  /**
   * Generate final consensus answer
   */
  async generateFinalAnswer(state: DebateState, consensus: ConsensusAnalysis): Promise<string> {
    const userQuestion = state.messages.find((m) => m.role === 'user')?.content || '';

    const latestResponses = this.selectedAdvisors.map((name) => {
      const responses = state.agentResponses[name];
      return {
        advisor: PERSONAS[name].name,
        response: responses && responses.length > 0 ? responses[responses.length - 1] : '',
      };
    }).filter((r) => r.response.length > 0);

    const finalPrompt = `Synthesize a final answer to the user's question based on the council's debate.

User Question: "${userQuestion}"

Consensus Analysis:
- Consensus Reached: ${consensus.consensusReached ? 'Yes' : 'No'}
- Agreement Level: ${Math.round(consensus.agreementLevel * 100)}%
- Key Agreements: ${consensus.agreements.join('; ')}
- Key Disagreements: ${consensus.disagreements.join('; ')}

Advisor Perspectives:
${latestResponses.map((r) => `${r.advisor}:\n${r.response}\n`).join('\n---\n')}

Provide a clear, actionable final answer that:
1. Directly answers the user's question
2. Incorporates the collective wisdom of the council
3. Highlights key insights and recommendations
4. Notes any important caveats or alternative perspectives
5. Is structured and easy to follow

${
  consensus.consensusReached
    ? 'The advisors have reached consensus, so present a unified recommendation.'
    : 'The advisors have not fully agreed, so present the majority view while acknowledging alternative perspectives.'
}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: PERSONAS.moderator.systemPrompt,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [{ role: 'user', content: finalPrompt }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  /**
   * Run a complete debate round with SEQUENTIAL advisor responses
   * Advisors take turns so they can see and respond to each other's arguments
   */
  async runDebateRound(
    state: DebateState,
    onEvent?: (event: StreamEvent) => void
  ): Promise<DebateState> {
    const newState = { ...state };
    newState.currentRound += 1;

    let successfulResponses = 0;

    // Run advisors SEQUENTIALLY so they can respond to each other (like a real debate)
    for (const advisorName of this.selectedAdvisors) {
      try {
        // Emit status update
        const advisorDisplayName = PERSONAS[advisorName as keyof typeof PERSONAS]?.name || advisorName;
        onEvent?.({
          type: 'status',
          content: `${advisorDisplayName} is thinking...`,
          timestamp: Date.now(),
        });

        // Emit start event
        onEvent?.({
          type: 'agent_start',
          agent: advisorName,
          timestamp: Date.now(),
        });

        // Get response with streaming - advisor sees all previous responses in this round
        const result = await this.getAdvisorResponse(
          advisorName,
          newState, // Pass updated state so advisor can see previous responses
          (chunk) => {
            onEvent?.({
              type: 'agent_response',
              agent: advisorName,
              content: chunk,
              timestamp: Date.now(),
            });
          },
          onEvent
        );

        // Add response to state immediately so next advisor can see it
        if (result.response) {
          newState.agentResponses[advisorName].push(result.response);
          successfulResponses++;
        }

        // Emit complete event
        onEvent?.({
          type: 'agent_complete',
          agent: advisorName,
          timestamp: Date.now(),
        });

      } catch (error) {
        // Graceful error handling - don't crash entire debate
        console.error(`Error from ${advisorName}:`, error);

        onEvent?.({
          type: 'error',
          content: `${advisorName} failed to respond: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        });
      }
    }

    // Check if we have enough responses to continue
    if (successfulResponses < 2) {
      throw new Error(`Insufficient advisor responses: only ${successfulResponses} succeeded`);
    }

    return newState;
  }

  /**
   * Run the complete council debate
   */
  async runCouncilDebate(
    userQuestion: string,
    conversationHistory: string = '',
    onEvent?: (event: StreamEvent) => void,
    options?: DebateOptions
  ): Promise<{ state: DebateState; finalAnswer: string }> {
    let state = this.createInitialState(userQuestion);

    // Emit cost estimate before starting debate
    const modelKey = this.model.includes('opus') ? 'claude-opus-4-5' as const :
                     this.model.includes('haiku') ? 'claude-haiku-4' as const :
                     'claude-sonnet-4-5' as const;

    const modeKey = this.maxRounds === 1 ? 'quick' as const :
                    this.maxRounds === 3 ? 'deep' as const :
                    'standard' as const;

    const costEstimate = estimateDebateCost(
      modelKey,
      modeKey,
      this.selectedAdvisors.length,
      this.enableResearch
    );

    onEvent?.({
      type: 'cost_estimate',
      data: costEstimate,
      timestamp: Date.now(),
    });

    // CLARIFICATION CHECK DISABLED FOR NOW
    // Reason: Too aggressive - blocks valid questions like "what is the best kind of cheese?"
    // TODO: Re-enable with better heuristics for open source launch
    //
    // if (!conversationHistory || conversationHistory.trim().length === 0) {
    //   onEvent?.({ type: 'moderator_analysis', content: 'Analyzing question...', timestamp: Date.now() });
    //   const clarification = await this.checkForClarification(state);
    //
    //   if (clarification.needsClarification) {
    //     onEvent?.({
    //       type: 'clarification_needed',
    //       content: clarification.question,
    //       timestamp: Date.now(),
    //     });
    //
    //     return {
    //       state: { ...state, needsClarification: true, clarificationQuestion: clarification.question },
    //       finalAnswer: clarification.question || '',
    //     };
    //   }
    // }

    // PERFORM RESEARCH FIRST (before advisors respond)
    const shouldResearch = this.shouldActivateResearch(userQuestion);
    if (shouldResearch) {
      onEvent?.({
        type: 'status',
        content: 'Performing web research...',
        timestamp: Date.now(),
      });
      const researchResults = await this.performResearch(userQuestion, onEvent);

      if (researchResults && researchResults.length > 0) {
        // Store research in state so ALL advisors can see it
        state.researchResults = researchResults;

        // Emit research results event with sources
        onEvent?.({
          type: 'research_results',
          content: `Found ${researchResults.length} relevant sources`,
          data: { sources: researchResults },
          timestamp: Date.now(),
        });
      }
    }

    // Run debate rounds
    for (let round = 0; round < this.maxRounds; round++) {
      onEvent?.({
        type: 'status',
        content: `Round ${round + 1} of ${this.maxRounds}`,
        timestamp: Date.now(),
      });

      onEvent?.({
        type: 'moderator_analysis',
        content: `Starting Round ${round + 1}...`,
        timestamp: Date.now(),
      });

      state = await this.runDebateRound(state, onEvent);

      // Check for consensus after round 2
      if (round >= 1) {
        onEvent?.({
          type: 'status',
          content: 'Checking for consensus...',
          timestamp: Date.now(),
        });

        onEvent?.({
          type: 'consensus_check',
          content: 'Analyzing consensus...',
          timestamp: Date.now(),
        });

        const consensus = await this.analyzeConsensus(state);

        if (consensus.consensusReached) {
          onEvent?.({
            type: 'status',
            content: 'Generating final consensus...',
            timestamp: Date.now(),
          });

          onEvent?.({
            type: 'moderator_analysis',
            content: 'Consensus reached! Generating final answer...',
            timestamp: Date.now(),
          });

          const finalAnswer = await this.generateFinalAnswer(state, consensus);
          state.consensusReached = true;
          state.finalAnswer = finalAnswer;

          onEvent?.({
            type: 'final_answer',
            content: finalAnswer,
            timestamp: Date.now(),
          });

          return { state, finalAnswer };
        }
      }
    }

    // No consensus after max rounds - generate final answer anyway
    onEvent?.({
      type: 'moderator_analysis',
      content: 'Maximum rounds reached. Synthesizing perspectives...',
      timestamp: Date.now(),
    });

    const consensus = await this.analyzeConsensus(state);
    const finalAnswer = await this.generateFinalAnswer(state, consensus);
    state.finalAnswer = finalAnswer;

    onEvent?.({
      type: 'final_answer',
      content: finalAnswer,
      timestamp: Date.now(),
    });

    return { state, finalAnswer };
  }
}
