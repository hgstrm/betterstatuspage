import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAIGatewayConfig } from '@/lib/ai-config';
import { fetchTrainingExamples, buildTrainingExamplesText } from '@/lib/ai-training';
import { isDemoMode } from '@/lib/demo-tracker';

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1/chat/completions';

// Validate authentication
async function validateAuth(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('statuspage_session');
  const authHeader = request.headers.get('authorization');

  return sessionToken || authHeader?.startsWith('Bearer ');
}

export async function POST(request: NextRequest) {
  // Validate authentication
  if (!await validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Block AI Gateway in demo mode - only Chrome AI is allowed
  if (isDemoMode()) {
    return NextResponse.json({
      improved: '',
      source: 'blocked',
      error: 'AI Gateway is disabled in demo mode',
      message: 'Demo mode only supports Chrome AI (free, on-device). Please use Chrome browser and enable Chrome AI in settings, or use the "Chrome" button instead.',
      demoMode: true,
    }, { status: 403 });
  }

  let message = '';

  try {
    const body = await request.json();
    message = body.message;
    const gatewayConfig = getAIGatewayConfig();
    const model = body.model || gatewayConfig.defaultModel;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // If no AI Gateway API key, use local improvement
    if (!AI_GATEWAY_API_KEY) {
      console.log('AI Gateway API key not configured');
      return NextResponse.json({
        improved: message,
        source: 'original',
        message: 'AI Gateway not configured'
      });
    }

    console.log(`Using AI Gateway with model: ${model}`);

    // Build system prompt with training examples if enabled
    let systemPrompt = gatewayConfig.systemPrompt;
    if (gatewayConfig.training.enabled && gatewayConfig.training.statuspageUrl) {
      try {
        const examples = await fetchTrainingExamples(
          gatewayConfig.training.statuspageUrl,
          gatewayConfig.training.maxExamples
        );
        if (examples.length > 0) {
          const trainingText = buildTrainingExamplesText(examples);
          systemPrompt = `${systemPrompt}\n\n${trainingText}`;
        }
      } catch (error) {
        console.error('Failed to fetch training examples:', error);
        // Continue without training examples if fetch fails
      }
    }

    const requestBody = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Rewrite the following status page update to be clear and professional. Provide ONLY the improved message without quotes, explanations, or any additional text:\n\n${message}` }
      ],
      temperature: gatewayConfig.temperature,
      max_tokens: gatewayConfig.maxTokens,
      stream: false
    };

    const response = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI Gateway error:', error);
      return NextResponse.json({
        improved: message,
        source: 'original',
        error: `AI Gateway error: ${error}`
      });
    }

    const data = await response.json();
    let improvedText = data.choices?.[0]?.message?.content || message;

    // Clean up the response - remove any quotes that might wrap the message
    improvedText = improvedText.trim();
    if (improvedText.startsWith('"') && improvedText.endsWith('"')) {
      improvedText = improvedText.slice(1, -1);
    }
    if (improvedText.startsWith("'") && improvedText.endsWith("'")) {
      improvedText = improvedText.slice(1, -1);
    }

    return NextResponse.json({
      improved: improvedText,
      source: model,
    });

  } catch (error) {
    console.error('Error with AI Gateway:', error);
    return NextResponse.json({
      improved: message,
      source: 'original',
      error: 'AI improvement failed, returning original text'
    });
  }
}