/**
 * Share Utilities
 * Handles encoding/decoding conversations for sharing via URL
 */

import { ShareableConversationSchema } from './security';
import { z } from 'zod';

// Type inferred from Zod schema for type safety
type ShareableConversation = z.infer<typeof ShareableConversationSchema>;

// Export the type for other modules
export type { ShareableConversation };

/**
 * Encode a conversation into a shareable URL-safe string
 */
export function encodeConversation(conversation: ShareableConversation): string {
  try {
    const json = JSON.stringify(conversation);
    const base64 = btoa(json);
    // Make URL-safe by replacing characters
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (error) {
    console.error('Failed to encode conversation:', error);
    throw new Error('Failed to encode conversation');
  }
}

/**
 * Decode a shareable string back into a conversation
 * Now includes validation to prevent injection attacks
 */
export function decodeConversation(encoded: string): ShareableConversation {
  try {
    // Input validation: check length and format
    if (!encoded || encoded.length > 50000) {
      throw new Error('Invalid encoded data: length out of bounds');
    }

    // Only allow valid base64url characters
    if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
      throw new Error('Invalid encoded data: invalid characters');
    }

    // Reverse URL-safe replacements
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    const padded = base64 + '==='.slice((base64.length + 3) % 4);

    // Decode base64
    const json = atob(padded);

    // Parse JSON
    const data = JSON.parse(json);

    // CRITICAL: Validate against schema to prevent prototype pollution and injection
    const validated = ShareableConversationSchema.parse(data);

    return validated;
  } catch (error) {
    console.error('Failed to decode conversation:', error);

    // Don't expose internal error details
    if (error instanceof z.ZodError) {
      throw new Error('Invalid conversation format');
    }

    throw new Error('Failed to decode conversation');
  }
}

/**
 * Generate a shareable URL for the current origin
 */
export function generateShareUrl(conversation: ShareableConversation): string {
  const encoded = encodeConversation(conversation);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/share?data=${encoded}`;
}

/**
 * Copy shareable URL to clipboard
 */
export async function copyShareUrl(conversation: ShareableConversation): Promise<string> {
  const url = generateShareUrl(conversation);

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(url);
  }

  return url;
}

/**
 * Check if a conversation is too large to share via URL
 * URL max length is ~2000 characters (safe limit)
 */
export function isConversationTooLarge(conversation: ShareableConversation): boolean {
  try {
    const encoded = encodeConversation(conversation);
    // Safe URL length is 2000 chars, encoded conversation shouldn't exceed 1800
    return encoded.length > 1800;
  } catch {
    return true;
  }
}

/**
 * Truncate conversation to make it shareable
 * Keeps only essential messages
 */
export function truncateConversation(conversation: ShareableConversation): ShareableConversation {
  const { messages, ...rest } = conversation;

  // Keep only user questions, final answer, and up to 3 advisor responses
  const userMessages = messages.filter(m => m.type === 'user');
  const finalMessages = messages.filter(m => m.type === 'final');
  const agentMessages = messages
    .filter(m => m.type === 'agent')
    .slice(0, 3); // Keep first 3 agent responses

  return {
    ...rest,
    messages: [...userMessages, ...agentMessages, ...finalMessages],
  };
}

/**
 * Export conversation as Markdown text
 */
export function exportAsMarkdown(conversation: ShareableConversation): string {
  const { title, question, messages, model, mode, advisors, timestamp } = conversation;
  const date = new Date(timestamp).toLocaleString();

  let markdown = `# ${title}\n\n`;
  markdown += `**Date:** ${date}\n`;
  markdown += `**Model:** ${model}\n`;
  markdown += `**Mode:** ${mode}\n`;
  markdown += `**Advisors:** ${advisors.join(', ')}\n\n`;
  markdown += `---\n\n`;
  markdown += `## Question\n\n${question}\n\n`;
  markdown += `---\n\n`;
  markdown += `## Conversation\n\n`;

  messages.forEach(msg => {
    if (msg.type === 'user') {
      markdown += `### You\n\n${msg.content}\n\n`;
    } else if (msg.type === 'agent' && msg.agent) {
      markdown += `### ${msg.agent}\n\n${msg.content}\n\n`;
      if (msg.sources && msg.sources.length > 0) {
        markdown += `**Sources:**\n`;
        msg.sources.forEach((source: any) => {
          markdown += `- [${source.title}](${source.url})\n`;
        });
        markdown += `\n`;
      }
    } else if (msg.type === 'moderator') {
      markdown += `### Moderator\n\n${msg.content}\n\n`;
    } else if (msg.type === 'final') {
      markdown += `## Final Answer\n\n${msg.content}\n\n`;
    }
  });

  markdown += `---\n\n`;
  markdown += `*Generated by SelfStarterSuite AI Council*\n`;

  return markdown;
}

/**
 * Download text as a file
 */
export function downloadText(content: string, filename: string, mimeType: string = 'text/plain'): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export conversation as Markdown file
 */
export function downloadMarkdown(conversation: ShareableConversation): void {
  const markdown = exportAsMarkdown(conversation);
  const filename = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
  downloadText(markdown, filename, 'text/markdown');
}

/**
 * Export conversation as JSON file
 */
export function downloadJSON(conversation: ShareableConversation): void {
  const json = JSON.stringify(conversation, null, 2);
  const filename = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
  downloadText(json, filename, 'application/json');
}
