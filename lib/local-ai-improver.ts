// Local text improvement without requiring external AI
// Uses rule-based transformations to improve incident messages

import { getLocalAIConfig, getProductNames } from './ai-config';

interface ReplacementRule {
  pattern: RegExp;
  replacement: string | ((match: string) => string);
}

/**
 * Build replacement rules from config
 */
function buildReplacementRules(): { wordReplacements: ReplacementRule[]; phraseReplacements: ReplacementRule[] } {
  const localConfig = getLocalAIConfig();
  const productNames = getProductNames();

  // Convert config word replacements to RegExp
  const wordReplacements: ReplacementRule[] = localConfig.wordReplacements.map(rule => ({
    pattern: new RegExp(rule.pattern, rule.flags),
    replacement: rule.replacement
  }));

  // Add product name replacements
  productNames.forEach(product => {
    product.incorrect.forEach(incorrect => {
      wordReplacements.push({
        pattern: new RegExp(`\\b${incorrect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
        replacement: product.correct
      });
    });
  });

  // Convert config phrase replacements to RegExp
  const phraseReplacements: ReplacementRule[] = localConfig.phraseReplacements.map(rule => ({
    pattern: new RegExp(rule.pattern, rule.flags),
    replacement: rule.replacement
  }));

  return { wordReplacements, phraseReplacements };
}

const { wordReplacements, phraseReplacements } = buildReplacementRules();

export function improveMessageLocally(message: string): string {
  if (!message.trim()) return message;

  const localConfig = getLocalAIConfig();
  let improved = message;

  // Apply word replacements
  for (const rule of wordReplacements) {
    improved = improved.replace(rule.pattern, rule.replacement as string);
  }

  // Apply phrase replacements
  for (const rule of phraseReplacements) {
    improved = improved.replace(rule.pattern, rule.replacement as string);
  }

  // Ensure first letter is capitalized
  improved = improved.charAt(0).toUpperCase() + improved.slice(1);

  // Ensure it ends with proper punctuation
  if (!/[.!?]$/.test(improved.trim())) {
    improved = improved.trim() + '.';
  }

  // Add context if message is very short and lacks it
  if (improved.length < localConfig.minMessageLength && !improved.match(/\b(we are|we're|our team|currently)\b/gi)) {
    // If it starts with a problem description, add "We are experiencing"
    if (improved.match(/^(service|api|database|system|application)/gi)) {
      improved = 'We are experiencing issues with ' + improved.charAt(0).toLowerCase() + improved.slice(1);
    }
  }

  // Clean up multiple spaces
  improved = improved.replace(/\s+/g, ' ').trim();

  return improved;
}

export function suggestProfessionalTemplate(): string {
  // Templates are now managed via Statuspage API
  // Return a default message instead of config-based template
  return 'We are working to resolve this issue.';
}

// Get improvement suggestions without modifying the text
export function getImprovementSuggestions(message: string): string[] {
  const localConfig = getLocalAIConfig();
  const suggestions: string[] = [];

  if (/\boutage\b/gi.test(message)) {
    suggestions.push(localConfig.improvementSuggestions.outage);
  }

  if (/\bthere'?s|we'?re|it'?s|can'?t/gi.test(message)) {
    suggestions.push(localConfig.improvementSuggestions.contractions);
  }

  if (!/\b(we are|our team|currently|investigating|working)\b/gi.test(message)) {
    suggestions.push(localConfig.improvementSuggestions.context);
  }

  if (message.length < 40) {
    suggestions.push(localConfig.improvementSuggestions.detail);
  }

  if (!/[.!?]$/.test(message.trim())) {
    suggestions.push(localConfig.improvementSuggestions.punctuation);
  }

  return suggestions;
}
