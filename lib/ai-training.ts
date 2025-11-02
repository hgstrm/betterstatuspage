/**
 * Fetch training examples from a reference Statuspage
 * Uses the public Statuspage API to get recent incident updates
 */

interface TrainingExample {
  text: string;
  status: string;
  impact: string;
}

/**
 * Extract API base URL from statuspage URL
 * Supports:
 * - statuspage.io format: https://example.statuspage.io
 * - Custom domains: https://status.example.com
 * - Full API URLs: https://example.statuspage.io/api/v2/incidents.json
 */
export function extractStatuspageApiBase(url: string): string | null {
  if (!url) return null;

  try {
    // Remove protocol if present
    let clean = url.replace(/^https?:\/\//, '');
    
    // Remove www
    clean = clean.replace(/^www\./, '');
    
    // Remove API path if present
    clean = clean.replace(/\/api\/v2\/.*$/, '');
    clean = clean.replace(/\/api\/.*$/, '');
    clean = clean.replace(/\/$/, '');
    
    // Handle statuspage.io format: example.statuspage.io
    if (clean.endsWith('.statuspage.io')) {
      return `https://${clean}/api/v2`;
    }
    
    // Handle custom domain format: status.example.com
    // Try to construct API endpoint (may need to try different patterns)
    if (clean.includes('.')) {
      // For custom domains, try common patterns
      // First try the standard statuspage.io API pattern if we can extract ID
      const statuspageMatch = clean.match(/^([^.]+)\.statuspage\.io$/);
      if (statuspageMatch) {
        return `https://${clean}/api/v2`;
      }
      
      // For custom domains, try to use the domain directly
      // Note: Custom domains may have different API endpoints
      // Try the standard pattern first
      return `https://${clean}/api/v2`;
    }
    
    // If it's just an ID, assume statuspage.io
    if (!clean.includes('.')) {
      return `https://${clean}.statuspage.io/api/v2`;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting statuspage API base:', error);
    return null;
  }
}

/**
 * Fetch training examples from a reference Statuspage
 * Accepts full statuspage URLs (e.g., https://example.statuspage.io or https://status.example.com)
 */
export async function fetchTrainingExamples(
  statuspageUrl: string,
  maxExamples: number = 10
): Promise<TrainingExample[]> {
  if (!statuspageUrl) return [];

  try {
    const apiBase = extractStatuspageApiBase(statuspageUrl);
    if (!apiBase) {
      console.error('Could not extract API base from URL:', statuspageUrl);
      return [];
    }

    // Fetch incidents list
    const response = await fetch(
      `${apiBase}/incidents.json?limit=10`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch training examples:', response.statusText);
      return [];
    }

    const data = await response.json();
    const incidents = data.incidents || [];

    const examples: TrainingExample[] = [];

    for (const incident of incidents.slice(0, Math.min(incidents.length, 5))) {
      // Get incident updates
      const updatesResponse = await fetch(
        `${apiBase}/incidents/${incident.id}.json`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!updatesResponse.ok) continue;

      const incidentData = await updatesResponse.json();
      const updates = incidentData.incident?.incident_updates || [];

      // Collect updates from this incident
      for (const update of updates.slice(0, 2)) {
        if (update.body && examples.length < maxExamples) {
          examples.push({
            text: update.body,
            status: incident.status || 'investigating',
            impact: incident.impact || 'minor',
          });
        }
      }
    }

    return examples.slice(0, maxExamples);
  } catch (error) {
    console.error('Error fetching training examples:', error);
    return [];
  }
}

/**
 * Build training examples text for AI prompts
 */
export function buildTrainingExamplesText(examples: TrainingExample[]): string {
  if (examples.length === 0) return '';

  return `\n\nREFERENCE EXAMPLES FROM STATUSPAGE:\n${examples
    .map((ex, i) => `Example ${i + 1} (${ex.status}, ${ex.impact}):\n"${ex.text}"`)
    .join('\n\n')}\n\nStudy these examples to match the writing style, tone, and structure.`;
}

