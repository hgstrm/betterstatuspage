/**
 * AI Gateway client for message improvement
 * Uses AI Gateway API with support for hundreds of models
 */

import { getAIGatewayConfig } from './ai-config';

/**
 * Check if AI Gateway is available
 * In demo mode, AI Gateway is disabled - only Chrome AI is available
 */
export function isAIGatewayAvailable(): boolean {
  // Disable AI Gateway in demo mode (only Chrome AI allowed)
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_PREVIEW_DEMO_MODE === 'true') {
    return false;
  }
  // AI Gateway is available if configured in environment
  return true;
}

/**
 * Improve a message using the AI Gateway
 * Models can be specified in the format "provider/model-name"
 * Examples: "openai/gpt-3.5-turbo", "anthropic/claude-3-haiku-20240307", "meta/llama-3-8b"
 */
export async function improveWithAIGateway(
  message: string,
  model?: string
): Promise<string> {
  const gatewayConfig = getAIGatewayConfig();
  const modelToUse = model || gatewayConfig.defaultModel;

  try {
    const response = await fetch('/api/ai/gateway', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        model: modelToUse,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      
      // Handle demo mode blocking
      if (response.status === 403 && errorData?.demoMode) {
        throw new Error(errorData.message || 'AI Gateway is disabled in demo mode. Only Chrome AI is available.');
      }
      
      throw new Error(`AI Gateway error: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle demo mode blocking in response
    if (data.demoMode && data.error) {
      throw new Error(data.message || 'AI Gateway is disabled in demo mode. Only Chrome AI is available.');
    }

    if (data.improved) {
      console.log(`Message improved using ${data.source}`);
      return data.improved;
    }

    // Fallback to original if no improvement
    return message;
  } catch (error) {
    console.error('Error using AI Gateway:', error);
    throw error;
  }
}