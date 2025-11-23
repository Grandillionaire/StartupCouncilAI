/**
 * API Key Setup Modal
 * Allows users to input their API keys directly in the browser
 * Keys are stored in localStorage (browser-side only)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Check, AlertCircle, ExternalLink } from 'lucide-react';

interface ApiKeySetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: { anthropic: string; tavily?: string }) => void;
  initialKeys?: { anthropic?: string; tavily?: string };
}

export default function ApiKeySetup({ isOpen, onClose, onSave, initialKeys }: ApiKeySetupProps) {
  const [anthropicKey, setAnthropicKey] = useState(initialKeys?.anthropic || '');
  const [tavilyKey, setTavilyKey] = useState(initialKeys?.tavily || '');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTavilyInput, setShowTavilyInput] = useState(false);

  useEffect(() => {
    if (initialKeys?.anthropic) setAnthropicKey(initialKeys.anthropic);
    if (initialKeys?.tavily) {
      setTavilyKey(initialKeys.tavily);
      setShowTavilyInput(true);
    }
  }, [initialKeys]);

  const validateAndSave = async () => {
    setError(null);

    // Basic validation
    if (!anthropicKey.trim()) {
      setError('Anthropic API key is required');
      return;
    }

    if (!anthropicKey.startsWith('sk-ant-')) {
      setError('Anthropic API key should start with "sk-ant-"');
      return;
    }

    if (tavilyKey && !tavilyKey.startsWith('tvly-')) {
      setError('Tavily API key should start with "tvly-"');
      return;
    }

    setIsValidating(true);

    // Test the Anthropic key by making a simple request
    try {
      const response = await fetch('/api/council/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anthropicKey: anthropicKey.trim(),
          tavilyKey: tavilyKey.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!result.valid) {
        setError(result.error || 'Invalid API key. Please check and try again.');
        setIsValidating(false);
        return;
      }

      // Keys are valid, save them
      onSave({
        anthropic: anthropicKey.trim(),
        tavily: tavilyKey.trim() || undefined,
      });

      onClose();
    } catch (err) {
      setError('Failed to validate API keys. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Key className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Setup API Keys</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Your API keys are stored locally in your browser and never sent to our servers.
              They're only used to make direct API calls to Anthropic and Tavily.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
            </div>
          )}

          {/* Anthropic API Key */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold">
                Anthropic Claude API Key <span className="text-red-500">*</span>
              </label>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Required to use the AI Council. Get yours from{' '}
              <a
                href="https://console.anthropic.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                console.anthropic.com
              </a>
            </p>
          </div>

          {/* Tavily API Key (Optional) */}
          {!showTavilyInput ? (
            <button
              onClick={() => setShowTavilyInput(true)}
              className="text-sm text-primary hover:underline"
            >
              + Add Tavily API Key (optional - enables web research)
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold">
                  Tavily API Key <span className="text-gray-400">(Optional)</span>
                </label>
                <a
                  href="https://tavily.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Get API Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                value={tavilyKey}
                onChange={(e) => setTavilyKey(e.target.value)}
                placeholder="tvly-..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Enables web research feature. Without this, advisors will use their training data only.
              </p>
            </div>
          )}

          {/* How it works */}
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-gray-700 dark:text-gray-300 hover:text-primary">
              How does this work?
            </summary>
            <div className="mt-3 space-y-2 text-gray-600 dark:text-gray-400">
              <p>1. Your API keys are stored in your browser's localStorage</p>
              <p>2. When you ask a question, keys are sent directly to AI APIs</p>
              <p>3. No keys are ever stored on our servers</p>
              <p>4. You can update or remove keys anytime in Settings</p>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={validateAndSave}
            disabled={isValidating || !anthropicKey.trim()}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isValidating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Keys
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
