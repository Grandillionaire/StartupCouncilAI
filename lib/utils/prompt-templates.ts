/**
 * Smart Prompt Templates
 * Pre-configured prompts optimized for different use cases
 */

export interface PromptTemplate {
  id: string;
  category: string;
  title: string;
  template: string;
  icon: string;
  description: string;
  mode?: 'quick' | 'standard' | 'deep';
  advisors?: string[];
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Business Strategy
  {
    id: 'should-i-start',
    category: 'Business',
    title: 'Should I start this?',
    template: 'Should I [action]? Consider: my background is [background], I have [resources], and my goal is [goal].',
    icon: '🚀',
    description: 'Get strategic advice on starting something new',
    mode: 'deep',
  },
  {
    id: 'validate-idea',
    category: 'Business',
    title: 'Validate my idea',
    template: 'How do I validate this business idea: [describe idea]. My target market is [market], and I have [timeline] to test it.',
    icon: '💡',
    description: 'Validate business ideas before investing',
    mode: 'standard',
  },
  {
    id: 'growth-strategy',
    category: 'Business',
    title: 'Growth strategy',
    template: 'What\'s the best growth strategy for [product/company] targeting [audience]? Current traction: [metrics].',
    icon: '📈',
    description: 'Develop growth and scaling strategies',
    mode: 'deep',
  },
  {
    id: 'pricing-strategy',
    category: 'Business',
    title: 'Pricing advice',
    template: 'How should I price [product/service]? Target customer: [description]. Competitors charge [range]. My costs are [amount].',
    icon: '💰',
    description: 'Get pricing recommendations',
    mode: 'standard',
  },

  // Career & Decisions
  {
    id: 'career-decision',
    category: 'Career',
    title: 'Career decision',
    template: 'Should I [career move]? I\'m currently [current situation], and the opportunity is [description]. Timeline: [when].',
    icon: '🎯',
    description: 'Navigate career decisions',
    mode: 'deep',
  },
  {
    id: 'skill-development',
    category: 'Career',
    title: 'Skill development',
    template: 'What skills should I develop to [goal]? My current skills: [list]. Time available: [amount]. Budget: [amount].',
    icon: '📚',
    description: 'Plan skill development path',
    mode: 'standard',
  },

  // Product & Tech
  {
    id: 'tech-stack',
    category: 'Product',
    title: 'Tech stack advice',
    template: 'What tech stack should I use for [project description]? Requirements: [list]. Team size: [number]. Timeline: [duration].',
    icon: '⚡',
    description: 'Choose the right technology',
    mode: 'standard',
    advisors: ['elon', 'pavel', 'alex'],
  },
  {
    id: 'product-features',
    category: 'Product',
    title: 'Feature prioritization',
    template: 'Which features should I build first for [product]? User feedback says: [feedback]. Resources: [available].',
    icon: '🎨',
    description: 'Prioritize product features',
    mode: 'standard',
  },

  // Research & Analysis
  {
    id: 'market-research',
    category: 'Research',
    title: 'Market research',
    template: 'Research the market for [industry/product]. I need to understand: competitors, trends, opportunities, and risks.',
    icon: '🔍',
    description: 'Deep dive into market analysis',
    mode: 'deep',
  },
  {
    id: 'competitive-analysis',
    category: 'Research',
    title: 'Competitive analysis',
    template: 'Analyze competitors in [market]: [list competitors]. What are their strengths, weaknesses, and my opportunities?',
    icon: '⚔️',
    description: 'Understand your competition',
    mode: 'standard',
  },

  // Investment & Finance
  {
    id: 'investment-decision',
    category: 'Finance',
    title: 'Investment advice',
    template: 'Should I invest in [opportunity]? Amount: [sum]. Risk tolerance: [level]. Investment timeline: [duration]. Expected return: [percentage].',
    icon: '💎',
    description: 'Evaluate investment opportunities',
    mode: 'deep',
    advisors: ['naval', 'larry', 'elon'],
  },
  {
    id: 'fundraising',
    category: 'Finance',
    title: 'Fundraising strategy',
    template: 'How do I raise [amount] for [company/project]? Current stage: [description]. Traction: [metrics]. Use of funds: [plan].',
    icon: '💸',
    description: 'Plan fundraising approach',
    mode: 'deep',
    advisors: ['naval', 'elon', 'alex'],
  },

  // Personal Development
  {
    id: 'life-decision',
    category: 'Personal',
    title: 'Major life decision',
    template: 'I\'m considering [decision]. Pros: [list]. Cons: [list]. My priorities are: [priorities]. What should I do?',
    icon: '🌟',
    description: 'Navigate important life choices',
    mode: 'deep',
  },
  {
    id: 'productivity',
    category: 'Personal',
    title: 'Productivity system',
    template: 'How do I improve productivity for [goal]? Current challenges: [issues]. Available time: [hours/day]. Tools I use: [list].',
    icon: '⚙️',
    description: 'Optimize your productivity',
    mode: 'quick',
  },

  // Quick Decisions
  {
    id: 'pros-cons',
    category: 'Quick',
    title: 'Pros vs Cons',
    template: 'What are the pros and cons of [decision/option]? Context: [background].',
    icon: '⚖️',
    description: 'Quick pros and cons analysis',
    mode: 'quick',
  },
  {
    id: 'explain-concept',
    category: 'Quick',
    title: 'Explain concept',
    template: 'Explain [concept/topic] to someone with [background/expertise level]. Focus on practical applications.',
    icon: '🧠',
    description: 'Understand complex topics',
    mode: 'quick',
  },
];

export const TEMPLATE_CATEGORIES = [
  'All',
  'Business',
  'Career',
  'Product',
  'Research',
  'Finance',
  'Personal',
  'Quick',
];

export function getTemplatesByCategory(category: string): PromptTemplate[] {
  if (category === 'All') return PROMPT_TEMPLATES;
  return PROMPT_TEMPLATES.filter(t => t.category === category);
}

export function applyTemplate(template: PromptTemplate, variables: Record<string, string>): string {
  let result = template.template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(`[${key}]`, value);
  });
  return result;
}

export function parseTemplateVariables(template: string): string[] {
  const matches = template.match(/\[([^\]]+)\]/g) || [];
  return matches.map(m => m.slice(1, -1));
}
