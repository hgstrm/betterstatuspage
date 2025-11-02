/**
 * Centralized AI configuration loader
 * Reads from config.json to keep all AI instructions and style rules in one place
 */

import configData from '../config.json';
import { styleRules } from './style-guide';

interface AIConfig {
  systemPrompt: string;
  styleGuidelines: string[];
  examples: Array<{ input: string; output: string }>;
  bannedWords: Array<{ word: string; replacement: string }>;
  productNames: Array<{ incorrect: string[]; correct: string }>;
  training?: {
    referenceStatuspageUrl?: string;
    referenceStatuspageId?: string;
    enabled?: boolean;
    maxExamples?: number;
  };
}

interface StyleGuideConfig {
  description: string;
  rules: Array<{
    original: string;
    replacement?: string;
    explanation: string;
    caseSensitive: boolean;
  }>;
}

interface AIGatewayConfig {
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  training: {
    enabled: boolean;
    statuspageUrl: string;
    maxExamples: number;
  };
}

interface ChromeAIConfig {
  temperature: number;
  suggestTemperature: number;
  topK: number;
  maxStyleRules: number;
  maxStyleGuidelines: number;
  training: {
    enabled: boolean;
    statuspageUrl: string;
    maxExamples: number;
  };
}

interface LocalAIConfig {
  wordReplacements: Array<{ pattern: string; replacement: string; flags: string }>;
  phraseReplacements: Array<{ pattern: string; replacement: string; flags: string }>;
  minMessageLength: number;
  improvementSuggestions: {
    outage: string;
    contractions: string;
    context: string;
    detail: string;
    punctuation: string;
  };
}

interface UIConfig {
  defaults: {
    incidentStatus: string;
    incidentImpact: string;
  };
  labels: {
    impact: Record<string, string>;
    incidentStatus: Record<string, string>;
    componentStatus: Record<string, string>;
  };
  colors: {
    incidentStatus: Record<string, string>;
    incidentImpact: Record<string, string>;
    incidentImpactHeader: Record<string, string>;
    componentStatus: Record<string, string>;
    componentStatusDot: Record<string, string>;
  };
  icons: {
    componentStatus: Record<string, string>;
  };
}

export const aiConfig: AIConfig = configData.ai;
export const styleGuideConfig: StyleGuideConfig = configData.styleGuide;
export const aiGatewayConfig: AIGatewayConfig = configData.aiGateway;
export const chromeAIConfig: ChromeAIConfig = configData.chromeAI;
export const localAIConfig: LocalAIConfig = configData.localAI;
export const uiConfig: UIConfig = configData.ui;

/**
 * Build the full system prompt for AI models
 * Optionally includes training examples from a reference Statuspage
 */
export async function buildSystemPrompt(): Promise<string> {
  const guidelines = aiConfig.styleGuidelines.map(g => `- ${g}`).join('\n');
  const examples = aiConfig.examples.map((ex, i) =>
    `Example ${i + 1}:\nInput: "${ex.input}"\nOutput: "${ex.output}"`
  ).join('\n\n');

  // Add critical style rules from the comprehensive style guide
  // Focus on the most important rules with explanations
  const criticalRules = styleRules
    .filter(r => r.explanation && r.explanation.length > 0)
    .slice(0, 25) // Top 25 most important rules
    .map(r => {
      if (r.replacement) {
        return `- "${r.original}" → "${r.replacement}"${r.explanation ? ` (${r.explanation})` : ''}`;
      }
      return `- Avoid "${r.original}"${r.explanation ? ` (${r.explanation})` : ''}`;
    })
    .join('\n');

  // Add product name capitalizations (if any configured)
  const productRules = styleRules
    .filter(r => r.explanation && r.explanation.includes('product'))
    .map(r => `- "${r.original}" → "${r.replacement}"`)
    .join('\n');

  // Add training examples if enabled
  let trainingExamples = '';
  if (aiConfig.training?.enabled && aiConfig.training.referenceStatuspageId) {
    try {
      const { fetchTrainingExamples, buildTrainingExamplesText } = await import('./ai-training');
      const examples = await fetchTrainingExamples(
        aiConfig.training.referenceStatuspageId,
        aiConfig.training.maxExamples || 10
      );
      trainingExamples = buildTrainingExamplesText(examples);
    } catch (error) {
      console.error('Failed to load training examples:', error);
    }
  }

  return `${aiConfig.systemPrompt}

STYLE GUIDELINES:
${guidelines}

CRITICAL WORD REPLACEMENTS (MUST FOLLOW):
${criticalRules}

PRODUCT NAME CAPITALIZATIONS:
${productRules}

EXAMPLES:
${examples}${trainingExamples}

Return ONLY the improved message text - no explanations, no meta-commentary, just the polished version.`;
}

/**
 * Get all banned words with their replacements
 */
export function getBannedWords(): Array<{ word: string; replacement: string }> {
  return aiConfig.bannedWords;
}

/**
 * Get all product name corrections
 */
export function getProductNames(): Array<{ incorrect: string[]; correct: string }> {
  return aiConfig.productNames;
}

/**
 * Get AI Gateway configuration
 */
export function getAIGatewayConfig(): AIGatewayConfig {
  return aiGatewayConfig;
}

/**
 * Get Chrome AI configuration
 */
export function getChromeAIConfig(): ChromeAIConfig {
  return chromeAIConfig;
}

/**
 * Get Local AI configuration
 */
export function getLocalAIConfig(): LocalAIConfig {
  return localAIConfig;
}

/**
 * Get UI configuration
 */
export function getUIConfig(): UIConfig {
  return uiConfig;
}
