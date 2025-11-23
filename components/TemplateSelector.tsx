'use client';

import React, { useState } from 'react';
import { X, Lightbulb, Filter } from 'lucide-react';
import { PROMPT_TEMPLATES, TEMPLATE_CATEGORIES, type PromptTemplate } from '@/lib/utils/prompt-templates';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: PromptTemplate) => void;
}

export default function TemplateSelector({ isOpen, onClose, onSelectTemplate }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredTemplates = PROMPT_TEMPLATES.filter(template => {
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-background rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-muted">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Prompt Templates</h2>
              <p className="text-sm text-muted">Start with a proven question format</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="p-6 border-b border-muted space-y-4">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted" />
            {TEMPLATE_CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  selectedCategory === category
                    ? "bg-primary text-white"
                    : "bg-surface text-muted hover:text-foreground hover:bg-muted/50"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => {
                  onSelectTemplate(template);
                  onClose();
                }}
                className="text-left p-4 rounded-lg border-2 border-muted hover:border-primary transition-all bg-surface group"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">{template.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                      {template.title}
                    </h3>
                    <p className="text-xs text-muted mb-2 line-clamp-2">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-muted/30 text-muted">
                        {template.category}
                      </span>
                      {template.mode && (
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded",
                          template.mode === 'quick' && "bg-green-100 text-green-700",
                          template.mode === 'standard' && "bg-blue-100 text-blue-700",
                          template.mode === 'deep' && "bg-purple-100 text-purple-700"
                        )}>
                          {template.mode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-muted">
              <p>No templates found matching your criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
