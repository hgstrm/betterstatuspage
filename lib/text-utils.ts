/**
 * Converts a string to Title Case
 * Example: "hello world" -> "Hello World"
 * Special handling for common acronyms and small words
 */
export function toTitleCase(str: string): string {
  // Words that should remain lowercase unless they're the first word
  const smallWords = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in',
    'into', 'nor', 'of', 'on', 'or', 'the', 'to', 'with'
  ]);

  // Common tech acronyms that should stay uppercase
  const acronyms = new Set([
    'api', 'sdk', 'sql', 'cpu', 'gpu', 'ram', 'dns', 'http', 'https',
    'ftp', 'ssh', 'ssl', 'tls', 'url', 'uri', 'html', 'css', 'json',
    'xml', 'csv', 'pdf', 'aws', 'gcp', 'db', 'id', 'ui', 'ux', 'ios',
    'vpc', 'cdn', 'ddos', 'dos', 'iam', 'iad', 'iad1', 'bbq'
  ]);

  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Keep empty strings empty
      if (!word) return word;

      // Check if it's an acronym
      if (acronyms.has(word.toLowerCase())) {
        return word.toUpperCase();
      }

      // First word or not a small word - capitalize first letter
      if (index === 0 || !smallWords.has(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }

      // It's a small word in the middle - keep lowercase
      return word;
    })
    .join(' ');
}
