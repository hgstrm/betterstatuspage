/**
 * Grammar and spell checking using LanguageTool API
 */

export interface GrammarIssue {
  message: string;
  shortMessage: string;
  offset: number;
  length: number;
  replacements: string[];
  ruleId: string;
  category: string;
  context: {
    text: string;
    offset: number;
    length: number;
  };
}

export interface GrammarCheckResult {
  issues: GrammarIssue[];
  language: string;
}

interface LanguageToolMatch {
  message: string;
  shortMessage?: string;
  offset: number;
  length: number;
  replacements: Array<{ value: string }>;
  rule: {
    id: string;
    category: {
      name: string;
    };
  };
  context: {
    text: string;
    offset: number;
    length: number;
  };
}

interface LanguageToolResponse {
  matches: LanguageToolMatch[];
  language: {
    name: string;
  };
}

/**
 * Basic client-side spell checker for common issues
 */
function performBasicSpellCheck(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];

  // Common misspellings and their corrections
  const commonErrors: Record<string, { suggestion: string; message: string }> = {
    'nows': { suggestion: 'now', message: 'Possible spelling mistake found.' },
    'recieve': { suggestion: 'receive', message: 'Possible spelling mistake found.' },
    'occured': { suggestion: 'occurred', message: 'Possible spelling mistake found.' },
    'seperate': { suggestion: 'separate', message: 'Possible spelling mistake found.' },
    'definately': { suggestion: 'definitely', message: 'Possible spelling mistake found.' },
    'occassion': { suggestion: 'occasion', message: 'Possible spelling mistake found.' },
    'untill': { suggestion: 'until', message: 'Possible spelling mistake found.' },
    'sucessful': { suggestion: 'successful', message: 'Possible spelling mistake found.' },
    'sucessfully': { suggestion: 'successfully', message: 'Possible spelling mistake found.' },
    'thier': { suggestion: 'their', message: 'Possible spelling mistake found.' },
    'recieved': { suggestion: 'received', message: 'Possible spelling mistake found.' },
  };

  // Check each word
  const words = text.split(/\b/);
  let offset = 0;

  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (commonErrors[lowerWord]) {
      const error = commonErrors[lowerWord];
      issues.push({
        message: error.message,
        shortMessage: error.message,
        offset,
        length: word.length,
        replacements: [error.suggestion],
        ruleId: 'BASIC_SPELL_CHECK',
        category: 'Spelling',
        context: {
          text: text.substring(Math.max(0, offset - 20), Math.min(text.length, offset + word.length + 20)),
          offset: Math.min(20, offset),
          length: word.length,
        },
      });
    }
    offset += word.length;
  }

  return issues;
}

/**
 * Check text for grammar and spelling issues using LanguageTool API
 */
export async function checkGrammar(text: string): Promise<GrammarCheckResult> {
  try {
    // Always run basic spell check first
    const basicIssues = performBasicSpellCheck(text);

    const response = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        text,
        language: 'en-US',
        enabledOnly: 'false',
      }),
    });

    if (!response.ok) {
      console.warn('LanguageTool API error, using basic check only');
      return {
        issues: basicIssues,
        language: 'English (US)',
      };
    }

    const data = await response.json() as LanguageToolResponse;

    const apiIssues: GrammarIssue[] = data.matches.map((match) => ({
      message: match.message,
      shortMessage: match.shortMessage || match.message,
      offset: match.offset,
      length: match.length,
      replacements: match.replacements.slice(0, 3).map((r) => r.value),
      ruleId: match.rule.id,
      category: match.rule.category.name,
      context: {
        text: match.context.text,
        offset: match.context.offset,
        length: match.context.length,
      },
    }));

    // Merge basic issues with API issues, removing duplicates
    const allIssues = [...basicIssues];
    for (const apiIssue of apiIssues) {
      const isDuplicate = basicIssues.some(
        (basic) => Math.abs(basic.offset - apiIssue.offset) < 3
      );
      if (!isDuplicate) {
        allIssues.push(apiIssue);
      }
    }

    // Sort by offset
    allIssues.sort((a, b) => a.offset - b.offset);

    return {
      issues: allIssues,
      language: data.language.name,
    };
  } catch (error) {
    console.error('Grammar check failed:', error);
    // Return basic issues as fallback
    return {
      issues: performBasicSpellCheck(text),
      language: 'English (US)',
    };
  }
}

/**
 * Apply a suggestion to text
 */
export function applySuggestion(
  text: string,
  issue: GrammarIssue,
  replacementIndex: number = 0
): string {
  const replacement = issue.replacements[replacementIndex];
  if (!replacement) return text;

  return (
    text.substring(0, issue.offset) +
    replacement +
    text.substring(issue.offset + issue.length)
  );
}
