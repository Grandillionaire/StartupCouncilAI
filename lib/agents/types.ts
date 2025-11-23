/**
 * Type definitions for the AI Council system
 */

export interface Message {
  role: 'user' | 'assistant' | 'moderator' | 'naval' | 'elon' | 'larry' | 'alex' | 'pavel';
  content: string;
  timestamp: number;
  round?: number;
}

export interface AgentResponse {
  agent: string;
  content: string;
  timestamp: number;
}

export interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface DebateState {
  messages: Message[];
  currentRound: number;
  maxRounds: number;
  consensusReached: boolean;
  needsClarification: boolean;
  clarificationQuestion?: string;
  agentResponses: Record<string, string[]>; // agent name -> array of responses
  finalAnswer?: string;
  researchResults?: ResearchResult[]; // Research findings to inform debate
}

export interface ConsensusAnalysis {
  consensusReached: boolean;
  agreementLevel: number; // 0-1
  agreements: string[];
  disagreements: string[];
  majorityView?: string;
  minorityViews?: string[];
}

export interface StreamEvent {
  type: 'agent_start' | 'agent_response' | 'agent_complete' | 'moderator_analysis' | 'consensus_check' | 'final_answer' | 'error' | 'clarification_needed' | 'research_start' | 'research_complete' | 'research_results' | 'cost_estimate' | 'cost_actual' | 'system' | 'status';
  agent?: string;
  content?: string;
  data?: any;
  timestamp: number;
}
