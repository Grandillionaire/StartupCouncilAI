/**
 * Analytics Storage Utility
 * Tracks debate metrics and performance data
 */

export interface DebateAnalytics {
  id: string;
  timestamp: number;
  duration: number; // in seconds
  model: string;
  mode: string;
  advisors: string[];
  advisorCount: number;
  researchUsed: boolean;
  rating?: number; // 1 (thumbs up), -1 (thumbs down), 0 (not rated)
  messageCount: number;
  roundCount: number;
  hadErrors: boolean;
  wasInterrupted: boolean;
  questionLength: number;
  answerLength: number;
}

export interface AnalyticsSummary {
  totalDebates: number;
  averageDuration: number;
  averageRating: number;
  totalDebateTime: number; // in seconds

  // Model usage
  modelUsage: Record<string, number>;

  // Mode usage
  modeUsage: Record<string, number>;

  // Advisor usage
  advisorUsage: Record<string, { count: number; avgRating: number }>;

  // Research stats
  researchActivationRate: number;
  researchUsageCount: number;

  // Rating distribution
  ratingDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };

  // Quality metrics
  averageMessageCount: number;
  averageRoundCount: number;
  errorRate: number;
  interruptionRate: number;

  // Time-based metrics
  debatesByDay: Record<string, number>;
  debatesByHour: Record<number, number>;
}

const ANALYTICS_STORAGE_KEY = 'council_analytics';
const MAX_ANALYTICS_ITEMS = 100;

/**
 * Check if we're in a browser environment
 */
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

/**
 * Save a debate's analytics
 */
export function saveDebateAnalytics(analytics: DebateAnalytics): void {
  if (!isBrowser) return;

  try {
    const allAnalytics = getDebateAnalytics();
    allAnalytics.unshift(analytics);

    // Keep only last MAX_ANALYTICS_ITEMS
    const trimmed = allAnalytics.slice(0, MAX_ANALYTICS_ITEMS);

    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save analytics:', error);
  }
}

/**
 * Get all debate analytics
 */
export function getDebateAnalytics(): DebateAnalytics[] {
  if (!isBrowser) return [];

  try {
    const saved = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!saved) return [];

    const analytics = JSON.parse(saved);
    return Array.isArray(analytics) ? analytics : [];
  } catch (error) {
    console.error('Failed to load analytics:', error);
    return [];
  }
}

/**
 * Clear all analytics
 */
export function clearAnalytics(): boolean {
  if (!isBrowser) return false;

  try {
    localStorage.removeItem(ANALYTICS_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear analytics:', error);
    return false;
  }
}

/**
 * Get analytics summary with aggregated statistics
 */
export function getAnalyticsSummary(): AnalyticsSummary {
  const analytics = getDebateAnalytics();

  if (analytics.length === 0) {
    return {
      totalDebates: 0,
      averageDuration: 0,
      averageRating: 0,
      totalDebateTime: 0,
      modelUsage: {},
      modeUsage: {},
      advisorUsage: {},
      researchActivationRate: 0,
      researchUsageCount: 0,
      ratingDistribution: { positive: 0, negative: 0, neutral: 0 },
      averageMessageCount: 0,
      averageRoundCount: 0,
      errorRate: 0,
      interruptionRate: 0,
      debatesByDay: {},
      debatesByHour: {},
    };
  }

  const totalDebates = analytics.length;
  const totalDuration = analytics.reduce((sum, a) => sum + a.duration, 0);
  const ratedDebates = analytics.filter(a => a.rating !== undefined && a.rating !== 0);
  const totalRating = ratedDebates.reduce((sum, a) => sum + (a.rating || 0), 0);

  // Model usage
  const modelUsage: Record<string, number> = {};
  analytics.forEach(a => {
    modelUsage[a.model] = (modelUsage[a.model] || 0) + 1;
  });

  // Mode usage
  const modeUsage: Record<string, number> = {};
  analytics.forEach(a => {
    modeUsage[a.mode] = (modeUsage[a.mode] || 0) + 1;
  });

  // Advisor usage
  const advisorUsage: Record<string, { count: number; ratings: number[] }> = {};
  analytics.forEach(a => {
    a.advisors.forEach(advisor => {
      if (!advisorUsage[advisor]) {
        advisorUsage[advisor] = { count: 0, ratings: [] };
      }
      advisorUsage[advisor].count += 1;
      if (a.rating) {
        advisorUsage[advisor].ratings.push(a.rating);
      }
    });
  });

  const advisorUsageWithAvg = Object.entries(advisorUsage).reduce((acc, [advisor, data]) => {
    const avgRating = data.ratings.length > 0
      ? data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length
      : 0;
    acc[advisor] = { count: data.count, avgRating };
    return acc;
  }, {} as Record<string, { count: number; avgRating: number }>);

  // Research stats
  const researchUsageCount = analytics.filter(a => a.researchUsed).length;
  const researchActivationRate = (researchUsageCount / totalDebates) * 100;

  // Rating distribution
  const positive = analytics.filter(a => a.rating === 1).length;
  const negative = analytics.filter(a => a.rating === -1).length;
  const neutral = analytics.filter(a => !a.rating || a.rating === 0).length;

  // Quality metrics
  const averageMessageCount = analytics.reduce((sum, a) => sum + a.messageCount, 0) / totalDebates;
  const averageRoundCount = analytics.reduce((sum, a) => sum + a.roundCount, 0) / totalDebates;
  const errorRate = (analytics.filter(a => a.hadErrors).length / totalDebates) * 100;
  const interruptionRate = (analytics.filter(a => a.wasInterrupted).length / totalDebates) * 100;

  // Time-based metrics
  const debatesByDay: Record<string, number> = {};
  const debatesByHour: Record<number, number> = {};

  analytics.forEach(a => {
    const date = new Date(a.timestamp);
    const day = date.toISOString().split('T')[0];
    const hour = date.getHours();

    debatesByDay[day] = (debatesByDay[day] || 0) + 1;
    debatesByHour[hour] = (debatesByHour[hour] || 0) + 1;
  });

  return {
    totalDebates,
    averageDuration: totalDuration / totalDebates,
    averageRating: ratedDebates.length > 0 ? totalRating / ratedDebates.length : 0,
    totalDebateTime: totalDuration,
    modelUsage,
    modeUsage,
    advisorUsage: advisorUsageWithAvg,
    researchActivationRate,
    researchUsageCount,
    ratingDistribution: { positive, negative, neutral },
    averageMessageCount,
    averageRoundCount,
    errorRate,
    interruptionRate,
    debatesByDay,
    debatesByHour,
  };
}

/**
 * Get analytics for a specific time period
 */
export function getAnalyticsByPeriod(
  period: 'today' | 'week' | 'month' | 'all'
): DebateAnalytics[] {
  const analytics = getDebateAnalytics();
  const now = Date.now();

  const periodMs = {
    today: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    all: Infinity,
  };

  const cutoff = now - periodMs[period];
  return analytics.filter(a => a.timestamp >= cutoff);
}

/**
 * Get top advisors by usage
 */
export function getTopAdvisors(limit: number = 5): Array<{ name: string; count: number; avgRating: number }> {
  const summary = getAnalyticsSummary();
  const entries = Object.entries(summary.advisorUsage);

  return entries
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Format duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Get analytics growth compared to previous period
 */
export function getGrowth(period: 'week' | 'month'): {
  debateGrowth: number;
  durationGrowth: number;
  ratingGrowth: number;
} {
  const current = getAnalyticsByPeriod(period);
  const periodMs = period === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - periodMs;
  const previous = getDebateAnalytics().filter(a => a.timestamp >= cutoff - periodMs && a.timestamp < cutoff);

  const calcGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const currentAvgDuration = current.length > 0
    ? current.reduce((sum, a) => sum + a.duration, 0) / current.length
    : 0;

  const previousAvgDuration = previous.length > 0
    ? previous.reduce((sum, a) => sum + a.duration, 0) / previous.length
    : 0;

  const currentAvgRating = current.filter(a => a.rating).length > 0
    ? current.reduce((sum, a) => sum + (a.rating || 0), 0) / current.filter(a => a.rating).length
    : 0;

  const previousAvgRating = previous.filter(a => a.rating).length > 0
    ? previous.reduce((sum, a) => sum + (a.rating || 0), 0) / previous.filter(a => a.rating).length
    : 0;

  return {
    debateGrowth: calcGrowth(current.length, previous.length),
    durationGrowth: calcGrowth(currentAvgDuration, previousAvgDuration),
    ratingGrowth: calcGrowth(currentAvgRating, previousAvgRating),
  };
}
