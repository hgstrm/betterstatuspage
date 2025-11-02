import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isDemoMode } from '@/lib/demo-tracker';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';

const STATUSPAGE_API_KEY = process.env.STATUSPAGE_API_KEY;
const STATUSPAGE_PAGE_ID = process.env.STATUSPAGE_PAGE_ID;
const API_BASE_URL = 'https://api.statuspage.io/v1';

async function validateAuth(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('statuspage_session');
  const authHeader = request.headers.get('authorization');

  return sessionToken || authHeader?.startsWith('Bearer ');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!STATUSPAGE_API_KEY || !STATUSPAGE_PAGE_ID) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { id } = await params;

  try {
    const response = await fetch(`${API_BASE_URL}/pages/${STATUSPAGE_PAGE_ID}/incidents/${id}`, {
      headers: {
        'Authorization': `OAuth ${STATUSPAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching incident:', error);
    return NextResponse.json({ error: 'Failed to fetch incident' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting in demo mode
  if (isDemoMode()) {
    const rateLimit = checkRateLimit({ headers: request.headers });
    const headers = getRateLimitHeaders({ headers: request.headers });
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          message: 'Too many requests. Please wait before making more requests.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers,
        }
      );
    }
  }

  if (!STATUSPAGE_API_KEY || !STATUSPAGE_PAGE_ID) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/pages/${STATUSPAGE_PAGE_ID}/incidents/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `OAuth ${STATUSPAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        incident: body
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    
    const responseHeaders = new Headers();
    if (isDemoMode()) {
      Object.entries(getRateLimitHeaders({ headers: request.headers })).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });
    }
    
    return NextResponse.json(data, { headers: responseHeaders });
  } catch (error) {
    console.error('Error updating incident:', error);
    return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!STATUSPAGE_API_KEY || !STATUSPAGE_PAGE_ID) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { id } = await params;

  try {
    const response = await fetch(`${API_BASE_URL}/pages/${STATUSPAGE_PAGE_ID}/incidents/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `OAuth ${STATUSPAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting incident:', error);
    return NextResponse.json({ error: 'Failed to delete incident' }, { status: 500 });
  }
}