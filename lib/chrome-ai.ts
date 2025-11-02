// Chrome built-in AI integration
// Requires Chrome 138+ with Prompt API enabled
// See: https://developer.chrome.com/docs/ai/prompt-api

import { aiConfig, getChromeAIConfig } from './ai-config';
import { styleRules } from './style-guide';
import { fetchTrainingExamples, buildTrainingExamplesText } from './ai-training';

interface LanguageModelSession {
  prompt: (text: string) => Promise<string>;
  promptStreaming: (text: string) => ReadableStream;
  append: (prompt: { role: 'system' | 'user' | 'assistant'; content: string }) => Promise<void>;
  clone: () => Promise<LanguageModelSession>;
  destroy: () => void;
}

interface LanguageModelCreateOptions {
  initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  topK?: number;
  expectedInputs?: Array<{ type: 'text'; languages?: string[] }>;
  expectedOutputs?: Array<{ type: 'text'; languages?: string[] }>;
}

interface LanguageModelAPI {
  availability: () => Promise<'unavailable' | 'downloadable' | 'downloading'>;
  create: (options?: LanguageModelCreateOptions) => Promise<LanguageModelSession>;
  params: () => Promise<{ defaultTemperature: number; defaultTopK: number; maxTopK: number }>;
}

declare global {
  interface Window {
    ai?: {
      languageModel: LanguageModelAPI;
    };
    LanguageModel?: LanguageModelAPI;
  }
}

export async function isChromeAIAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // Try both window.ai.languageModel and window.LanguageModel (Chrome 138+)
    const languageModel = window.LanguageModel || window.ai?.languageModel;
    if (!languageModel) return false;

    const availability = await languageModel.availability();
    // Model is available if it's ready to use (not 'unavailable')
    return availability !== 'unavailable';
  } catch (error) {
    console.error('Error checking Chrome AI availability:', error);
    return false;
  }
}

export async function improveIncidentMessage(message: string): Promise<string> {
  const languageModel = window.LanguageModel || window.ai?.languageModel;
  if (!languageModel) {
    throw new Error('Chrome AI is not available');
  }

  const chromeConfig = getChromeAIConfig();
  // Build simpler prompt for Chrome AI (it has more limited context)
  const guidelines = aiConfig.styleGuidelines.slice(0, chromeConfig.maxStyleGuidelines).map((g, i) => `${i + 1}. ${g}`).join('\n');
  const example = aiConfig.examples[0];

  // Add top style rules
  const topRules = styleRules
    .filter(r => r.explanation && r.explanation.length > 0)
    .slice(0, chromeConfig.maxStyleRules)
    .map((r, i) => `${i + 1}. "${r.original}" → "${r.replacement}"`)
    .join('\n');

  // Add training examples if enabled
  let trainingExamples = '';
  if (chromeConfig.training.enabled && chromeConfig.training.statuspageUrl) {
    try {
      const examples = await fetchTrainingExamples(
        chromeConfig.training.statuspageUrl,
        chromeConfig.training.maxExamples
      );
      if (examples.length > 0) {
        trainingExamples = `\n\n${buildTrainingExamplesText(examples)}`;
      }
    } catch (error) {
      console.error('Failed to fetch training examples:', error);
      // Continue without training examples if fetch fails
    }
  }

  const systemPrompt = `You are a helpful assistant that improves incident status update messages for a status page.

Rules:
${guidelines}

Word Replacements:
${topRules}

Example:
Input: "${example.input}"
Output: "${example.output}"${trainingExamples}

Return ONLY the improved message text, no explanations.`;

  try {
    const session = await languageModel.create({
      initialPrompts: [
        { role: 'system', content: systemPrompt }
      ],
      temperature: chromeConfig.temperature,
      topK: chromeConfig.topK,
      // Specify expected input/output languages for content safety
      expectedInputs: [{ type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    });

    const improved = await session.prompt(`Improve this incident message:\n\n${message}`);
    session.destroy();

    return improved.trim();
  } catch (error) {
    console.error('Error improving message with Chrome AI:', error);
    throw error;
  }
}

export async function suggestIncidentMessage(context: {
  status: string;
  impact: string;
  components?: string[];
}): Promise<string> {
  const languageModel = window.LanguageModel || window.ai?.languageModel;
  if (!languageModel) {
    throw new Error('Chrome AI is not available');
  }

  const chromeConfig = getChromeAIConfig();

  const systemPrompt = `You are a helpful assistant that drafts incident status update messages for a status page.

Rules:
1. Keep messages professional and clear
2. Never use the word "outage" - use "service interruption", "degraded performance", or "elevated error rates" instead
3. Be concise (1-2 sentences)
4. Use active voice
5. Focus on what's happening and what we're doing about it
7. Return ONLY the message text, no explanations`;

  try {
    const session = await languageModel.create({
      initialPrompts: [
        { role: 'system', content: systemPrompt }
      ],
      temperature: chromeConfig.suggestTemperature,
      topK: chromeConfig.topK,
      // Specify expected input/output languages for content safety
      expectedInputs: [{ type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    });

    const componentsText = context.components?.length
      ? ` affecting ${context.components.join(', ')}`
      : '';

    const prompt = `Draft a ${context.status} incident message with ${context.impact} impact${componentsText}.`;
    const suggestion = await session.prompt(prompt);
    session.destroy();

    return suggestion.trim();
  } catch (error) {
    console.error('Error suggesting message with Chrome AI:', error);
    throw error;
  }
}
