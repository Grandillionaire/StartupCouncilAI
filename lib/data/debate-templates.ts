/**
 * Pre-built debate templates to help users get started
 */

export interface DebateTemplate {
  id: string;
  title: string;
  question: string;
  category: 'business' | 'career' | 'product' | 'growth' | 'decision';
  recommendedMode: 'quick' | 'standard' | 'deep';
  recommendedAdvisors?: string[];
  enableResearch?: boolean;
  tags: string[];
}

export const DEBATE_TEMPLATES: DebateTemplate[] = [
  // Business Strategy
  {
    id: 'quit-job',
    title: 'Should I quit my job to start a business?',
    question: 'I have $50,000 in savings and a business idea for [describe your idea]. Should I quit my full-time job to pursue it?',
    category: 'business',
    recommendedMode: 'deep',
    tags: ['career', 'entrepreneurship', 'risk'],
  },
  {
    id: 'raise-funding',
    title: 'Should I raise funding or bootstrap?',
    question: 'My startup has [describe traction]. Should I raise VC funding or continue bootstrapping?',
    category: 'business',
    recommendedMode: 'deep',
    tags: ['funding', 'startup', 'growth'],
  },
  {
    id: 'pivot-or-persist',
    title: 'Should I pivot my business or persist?',
    question: 'My business has been running for [time period] with [describe results]. Should I pivot the business model or keep pushing forward?',
    category: 'business',
    recommendedMode: 'deep',
    tags: ['strategy', 'pivot', 'persistence'],
  },

  // Growth & Marketing
  {
    id: 'youtube-growth',
    title: 'Best YouTube growth strategy?',
    question: 'Research the best strategies for YouTube growth. My channel has [subscriber count] and focuses on [niche].',
    category: 'growth',
    recommendedMode: 'standard',
    enableResearch: true,
    tags: ['youtube', 'growth', 'content'],
  },
  {
    id: 'marketing-channels',
    title: 'Which marketing channel should I focus on?',
    question: "I'm selling [product/service] to [target audience]. Which marketing channel should I invest in first?",
    category: 'growth',
    recommendedMode: 'standard',
    tags: ['marketing', 'channels', 'acquisition'],
  },
  {
    id: 'viral-strategy',
    title: 'How do I make my product go viral?',
    question: 'What does the latest data say about making products go viral? My product is [describe product].',
    category: 'growth',
    recommendedMode: 'standard',
    enableResearch: true,
    tags: ['viral', 'growth', 'product'],
  },

  // Product Development
  {
    id: 'validate-idea',
    title: 'How do I validate my business idea?',
    question: "I want to validate my idea for [describe idea] before investing significant time. What's the best approach?",
    category: 'product',
    recommendedMode: 'standard',
    tags: ['validation', 'mvp', 'product'],
  },
  {
    id: 'pricing-strategy',
    title: 'What should I charge for my product?',
    question: 'Search for pricing data on [industry/category]. My product is [describe product]. What should I charge?',
    category: 'product',
    recommendedMode: 'standard',
    enableResearch: true,
    tags: ['pricing', 'monetization', 'strategy'],
  },
  {
    id: 'feature-priority',
    title: 'Which features should I build first?',
    question: 'I have these feature requests: [list features]. Which should I prioritize for maximum impact?',
    category: 'product',
    recommendedMode: 'quick',
    tags: ['features', 'prioritization', 'roadmap'],
  },

  // Career Decisions
  {
    id: 'job-offer',
    title: 'Should I accept this job offer?',
    question: 'I received a job offer: [salary/role/company]. Current situation: [describe]. Should I accept it?',
    category: 'career',
    recommendedMode: 'standard',
    tags: ['career', 'job-offer', 'decision'],
  },
  {
    id: 'ask-for-raise',
    title: 'Should I ask for a raise?',
    question: "I've been at my company for [time], my accomplishments include [list], market data shows [stats]. Should I ask for a raise?",
    category: 'career',
    recommendedMode: 'quick',
    enableResearch: true,
    tags: ['salary', 'negotiation', 'career'],
  },
  {
    id: 'change-career',
    title: 'Should I switch careers?',
    question: "I'm currently working in [field] but considering switching to [new field]. I have [skills/experience]. Should I make the switch?",
    category: 'career',
    recommendedMode: 'deep',
    tags: ['career-change', 'transition', 'decision'],
  },

  // Decision Making
  {
    id: 'hire-team-member',
    title: 'Should I hire this role?',
    question: "My business needs [role] and I'm considering hiring. Current situation: [revenue/team size]. Should I hire now?",
    category: 'decision',
    recommendedMode: 'standard',
    tags: ['hiring', 'team', 'growth'],
  },
  {
    id: 'time-management',
    title: 'How should I prioritize my time?',
    question: "I'm juggling: [list activities/projects]. What should I focus on for maximum ROI on my time?",
    category: 'decision',
    recommendedMode: 'quick',
    tags: ['productivity', 'focus', 'time'],
  },
  {
    id: 'expansion-strategy',
    title: 'Should I expand to a new market?',
    question: 'My business is successful in [current market]. Should I expand to [new market]? Research the market data.',
    category: 'decision',
    recommendedMode: 'deep',
    enableResearch: true,
    tags: ['expansion', 'growth', 'strategy'],
  },

  // Additional Business Strategy
  {
    id: 'scale-operations',
    title: 'How to scale operations efficiently?',
    question: 'My business is growing fast. What are the best strategies to scale operations without sacrificing quality or burning out my team?',
    category: 'business',
    recommendedMode: 'deep',
    tags: ['scaling', 'operations', 'team'],
  },
  {
    id: 'international-expansion',
    title: 'Should I expand internationally?',
    question: 'We\'re successful domestically. Should we expand internationally now, and if so, which markets should we prioritize?',
    category: 'business',
    recommendedMode: 'deep',
    enableResearch: true,
    tags: ['international', 'expansion', 'markets'],
  },
  {
    id: 'co-founder-conflict',
    title: 'Resolving co-founder disagreements',
    question: 'My co-founder and I disagree on the company direction. How do we resolve this without destroying the business?',
    category: 'business',
    recommendedMode: 'standard',
    tags: ['co-founder', 'conflict', 'partnership'],
  },

  // Additional Career
  {
    id: 'freelance-vs-fulltime',
    title: 'Freelance vs full-time employment?',
    question: 'Should I go freelance or stick with full-time employment? I value flexibility but also need stability.',
    category: 'career',
    recommendedMode: 'standard',
    tags: ['freelance', 'employment', 'career'],
  },
  {
    id: 'negotiate-equity',
    title: 'How to negotiate equity in a startup?',
    question: 'I\'ve been offered a role at a startup. How should I think about and negotiate equity compensation?',
    category: 'career',
    recommendedMode: 'standard',
    tags: ['equity', 'startup', 'compensation'],
  },
  {
    id: 'industry-switch',
    title: 'Switching to a different industry',
    question: 'I want to switch from [current industry] to [target industry]. What\'s the best approach to make this transition?',
    category: 'career',
    recommendedMode: 'standard',
    tags: ['career-change', 'transition', 'industry'],
  },

  // Additional Product
  {
    id: 'tech-stack-choice',
    title: 'Choosing the right tech stack',
    question: 'Research the best tech stack for building [type of product]. What are the trade-offs between different options?',
    category: 'product',
    recommendedMode: 'standard',
    enableResearch: true,
    tags: ['tech-stack', 'technology', 'development'],
  },
  {
    id: 'mvp-scope',
    title: 'Defining MVP scope',
    question: 'What features should I include in my MVP for [product idea]? How do I avoid feature creep while staying competitive?',
    category: 'product',
    recommendedMode: 'standard',
    tags: ['mvp', 'scope', 'features'],
  },
  {
    id: 'user-retention',
    title: 'Improving user retention',
    question: 'Our product has good signup rates but poor retention. What strategies should we implement to keep users engaged?',
    category: 'product',
    recommendedMode: 'standard',
    tags: ['retention', 'engagement', 'users'],
  },

  // Additional Growth & Marketing
  {
    id: 'content-strategy',
    title: 'Building a content strategy',
    question: 'Research effective content strategies for [industry/niche]. What content should we create and where should we distribute it?',
    category: 'growth',
    recommendedMode: 'standard',
    enableResearch: true,
    tags: ['content', 'strategy', 'marketing'],
  },
  {
    id: 'paid-vs-organic',
    title: 'Paid vs organic growth?',
    question: 'Should we focus on paid acquisition or organic growth? Our budget is [amount] and we need to grow [target].',
    category: 'growth',
    recommendedMode: 'standard',
    tags: ['paid-ads', 'organic', 'growth'],
  },
  {
    id: 'influencer-marketing',
    title: 'Leveraging influencer marketing',
    question: 'Research the ROI of influencer marketing for [industry]. Should we invest in it, and how do we choose the right influencers?',
    category: 'growth',
    recommendedMode: 'standard',
    enableResearch: true,
    tags: ['influencer', 'marketing', 'roi'],
  },
  {
    id: 'community-building',
    title: 'Building an engaged community',
    question: 'How do I build and nurture a community around my product/brand? What platforms and strategies work best?',
    category: 'growth',
    recommendedMode: 'standard',
    tags: ['community', 'engagement', 'brand'],
  },

  // Additional Decision Making
  {
    id: 'remote-vs-office',
    title: 'Remote vs office-first?',
    question: 'Should our company be remote-first, office-first, or hybrid? What are the trade-offs for productivity and culture?',
    category: 'decision',
    recommendedMode: 'standard',
    tags: ['remote', 'office', 'culture'],
  },
  {
    id: 'automation-investment',
    title: 'Investing in automation',
    question: 'Should we invest in automating [specific process]? What\'s the ROI and what are the risks?',
    category: 'decision',
    recommendedMode: 'standard',
    tags: ['automation', 'efficiency', 'roi'],
  },
  {
    id: 'rebrand-timing',
    title: 'When to rebrand?',
    question: 'Our brand feels outdated. Should we rebrand now or focus on other priorities? How do we know if it\'s the right time?',
    category: 'decision',
    recommendedMode: 'standard',
    tags: ['rebrand', 'brand', 'timing'],
  },
  {
    id: 'agency-vs-inhouse',
    title: 'Agency vs in-house team?',
    question: 'Should we hire an agency or build an in-house team for [function]? What are the long-term implications?',
    category: 'decision',
    recommendedMode: 'standard',
    tags: ['agency', 'hiring', 'team'],
  },

  // New Category: Financial
  {
    id: 'pricing-increase',
    title: 'Raising prices without losing customers',
    question: 'We need to increase prices by [percentage]. How do we communicate this to customers without losing them?',
    category: 'business',
    recommendedMode: 'standard',
    tags: ['pricing', 'increase', 'customers'],
  },
  {
    id: 'cash-flow-management',
    title: 'Managing cash flow',
    question: 'Our business is growing but cash flow is tight. What strategies should we implement to improve cash flow?',
    category: 'business',
    recommendedMode: 'standard',
    tags: ['cash-flow', 'finance', 'management'],
  },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): DebateTemplate[] {
  return DEBATE_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): DebateTemplate | undefined {
  return DEBATE_TEMPLATES.find(t => t.id === id);
}

/**
 * Get all categories
 */
export function getCategories(): Array<{
  id: string;
  label: string;
  icon: string;
  count: number;
}> {
  const categories = [
    { id: 'business', label: 'Business Strategy', icon: '💼' },
    { id: 'career', label: 'Career Decisions', icon: '🎯' },
    { id: 'product', label: 'Product Development', icon: '🚀' },
    { id: 'growth', label: 'Growth & Marketing', icon: '📈' },
    { id: 'decision', label: 'Decision Making', icon: '🤔' },
  ];

  return categories.map(cat => ({
    ...cat,
    count: DEBATE_TEMPLATES.filter(t => t.category === cat.id).length,
  }));
}

/**
 * Search templates by keyword
 */
export function searchTemplates(query: string): DebateTemplate[] {
  const lowerQuery = query.toLowerCase();
  return DEBATE_TEMPLATES.filter(
    t =>
      t.title.toLowerCase().includes(lowerQuery) ||
      t.question.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
