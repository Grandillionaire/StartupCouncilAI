'use client';

import React, { useState, useMemo } from 'react';
import {
  getAnalyticsSummary,
  getAnalyticsByPeriod,
  getTopAdvisors,
  formatDuration,
  formatPercentage,
  getGrowth,
  type DebateAnalytics,
} from '@/lib/utils/analytics';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Star,
  Brain,
  Zap,
  Users,
  Search,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Award,
  Target,
  Activity,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnalyticsDashboard({ isOpen, onClose }: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');

  const summary = useMemo(() => getAnalyticsSummary(), []);
  const periodData = useMemo(() => getAnalyticsByPeriod(period), [period]);
  const topAdvisors = useMemo(() => getTopAdvisors(5), []);
  const growth = useMemo(() => period !== 'today' && period !== 'all' ? getGrowth(period as 'week' | 'month') : null, [period]);

  if (!isOpen) return null;

  const StatCard = ({ icon: Icon, label, value, subtext, color, trend }: any) => (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
            trend > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            <TrendingUp className={cn("w-3 h-3", trend < 0 && "rotate-180")} />
            {Math.abs(Math.round(trend))}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-xs text-muted uppercase tracking-wide font-semibold">{label}</div>
      {subtext && <div className="text-xs text-muted mt-1">{subtext}</div>}
    </div>
  );

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Dashboard */}
      <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
        <div className="h-full flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-slide-in">
            {/* Header */}
            <div className="bg-surface border-b border-muted px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-primary" />
                  Analytics Dashboard
                </h2>
                <p className="text-xs text-muted mt-1">Insights from your AI council debates</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Period Selector */}
                <div className="flex items-center gap-1 bg-background rounded-lg p-1">
                  {(['today', 'week', 'month', 'all'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-md transition-colors font-medium",
                        period === p
                          ? "bg-primary text-white"
                          : "text-muted hover:text-foreground"
                      )}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-muted/20 text-muted hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              {summary.totalDebates === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/10 flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-muted" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Analytics Yet</h3>
                  <p className="text-sm text-muted max-w-md mx-auto">
                    Start using the AI Council to see your debate analytics and insights here.
                  </p>
                </div>
              ) : (
                <>
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      icon={Activity}
                      label="Total Debates"
                      value={summary.totalDebates}
                      color="bg-primary"
                      trend={growth?.debateGrowth}
                    />
                    <StatCard
                      icon={Clock}
                      label="Avg Duration"
                      value={formatDuration(summary.averageDuration)}
                      subtext={`${formatDuration(summary.totalDebateTime)} total`}
                      color="bg-blue-500"
                      trend={growth?.durationGrowth}
                    />
                    <StatCard
                      icon={Star}
                      label="Avg Rating"
                      value={summary.averageRating > 0 ? (summary.averageRating > 0 ? '👍' : '👎') : '-'}
                      subtext={`${summary.ratingDistribution.positive} positive`}
                      color="bg-green-500"
                      trend={growth?.ratingGrowth}
                    />
                    <StatCard
                      icon={Search}
                      label="Research Used"
                      value={formatPercentage(summary.researchActivationRate)}
                      subtext={`${summary.researchUsageCount} debates`}
                      color="bg-purple-500"
                    />
                  </div>

                  {/* Model & Mode Usage */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Model Usage */}
                    <div className="card p-6">
                      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-primary" />
                        Model Usage
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(summary.modelUsage).map(([model, count]) => {
                          const percentage = (count / summary.totalDebates) * 100;
                          const modelName = model.includes('opus') ? 'Opus 4.5' : model.includes('sonnet') ? 'Sonnet 4.5' : 'Haiku 4';
                          return (
                            <div key={model}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-medium text-foreground">{modelName}</span>
                                <span className="text-muted">{count} ({Math.round(percentage)}%)</span>
                              </div>
                              <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-primary h-full rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mode Usage */}
                    <div className="card p-6">
                      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        Mode Usage
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(summary.modeUsage).map(([mode, count]) => {
                          const percentage = (count / summary.totalDebates) * 100;
                          const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
                          return (
                            <div key={mode}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-medium text-foreground">{modeLabel}</span>
                                <span className="text-muted">{count} ({Math.round(percentage)}%)</span>
                              </div>
                              <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-blue-500 h-full rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Top Advisors */}
                  <div className="card p-6">
                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary" />
                      Top Advisors
                    </h3>
                    <div className="space-y-3">
                      {topAdvisors.map((advisor, index) => (
                        <div key={advisor.name} className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                            index === 0 ? "bg-yellow-100 text-yellow-700" :
                            index === 1 ? "bg-gray-100 text-gray-700" :
                            index === 2 ? "bg-orange-100 text-orange-700" :
                            "bg-muted/20 text-muted"
                          )}>
                            #{index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-foreground text-sm capitalize">{advisor.name}</span>
                              <div className="flex items-center gap-2 text-xs text-muted">
                                <span>{advisor.count} debates</span>
                                {advisor.avgRating > 0 && (
                                  <span className="flex items-center gap-1">
                                    <ThumbsUp className="w-3 h-3 text-green-600" />
                                    {advisor.avgRating.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="w-full bg-muted/20 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-primary h-full rounded-full transition-all"
                                style={{ width: `${(advisor.count / summary.totalDebates) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quality Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-muted" />
                        <span className="text-xs font-semibold text-muted uppercase">Avg Messages</span>
                      </div>
                      <div className="text-xl font-bold text-foreground">
                        {Math.round(summary.averageMessageCount)}
                      </div>
                    </div>

                    <div className="card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-muted" />
                        <span className="text-xs font-semibold text-muted uppercase">Avg Rounds</span>
                      </div>
                      <div className="text-xl font-bold text-foreground">
                        {summary.averageRoundCount.toFixed(1)}
                      </div>
                    </div>

                    <div className="card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-muted" />
                        <span className="text-xs font-semibold text-muted uppercase">Error Rate</span>
                      </div>
                      <div className="text-xl font-bold text-foreground">
                        {formatPercentage(summary.errorRate)}
                      </div>
                    </div>

                    <div className="card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-muted" />
                        <span className="text-xs font-semibold text-muted uppercase">Interruptions</span>
                      </div>
                      <div className="text-xl font-bold text-foreground">
                        {formatPercentage(summary.interruptionRate)}
                      </div>
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  <div className="card p-6">
                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Star className="w-4 h-4 text-primary" />
                      Rating Distribution
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                        <ThumbsUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-700">{summary.ratingDistribution.positive}</div>
                        <div className="text-xs text-green-600 mt-1">Positive</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="w-6 h-6 mx-auto mb-2 flex items-center justify-center text-gray-400">—</div>
                        <div className="text-2xl font-bold text-gray-700">{summary.ratingDistribution.neutral}</div>
                        <div className="text-xs text-gray-600 mt-1">Not Rated</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                        <ThumbsDown className="w-6 h-6 text-red-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-red-700">{summary.ratingDistribution.negative}</div>
                        <div className="text-xs text-red-600 mt-1">Negative</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
