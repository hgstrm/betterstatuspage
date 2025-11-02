import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// In production, use a proper session store (Redis, database, etc.)
// For now, we'll use a simple in-memory store
const sessions = new Map<string, { userId: string; createdAt: Date }>();

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Check if password protection is enabled
    const requiredPassword = process.env.BACKUP_PASSWORD;

    // If no password is set, allow access (for development)
    // In production, you should always require authentication
    if (!requiredPassword || password === requiredPassword) {
      const sessionToken = generateSessionToken();
      const sessionData = {
        userId: 'user',
        createdAt: new Date(),
      };

      sessions.set(sessionToken, sessionData);

      // Clean up old sessions (older than 24 hours)
      for (const [token, data] of sessions.entries()) {
        if (Date.now() - data.createdAt.getTime() > 24 * 60 * 60 * 1000) {
          sessions.delete(token);
        }
      }

      const cookieStore = await cookies();
      cookieStore.set('statuspage_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('statuspage_session');

  if (!sessionToken) {
    return NextResponse.json({ authenticated: false });
  }

  const session = sessions.get(sessionToken.value);

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  // Check if session is still valid (24 hours)
  if (Date.now() - session.createdAt.getTime() > 24 * 60 * 60 * 1000) {
    sessions.delete(sessionToken.value);
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({ authenticated: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('statuspage_session');

  if (sessionToken) {
    sessions.delete(sessionToken.value);
    cookieStore.delete('statuspage_session');
  }

  return NextResponse.json({ success: true });
}