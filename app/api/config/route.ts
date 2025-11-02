import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { promises as fs } from 'fs';
import { join } from 'path';

// Validate authentication
async function validateAuth(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('statuspage_session');
  const authHeader = request.headers.get('authorization');

  return sessionToken || authHeader?.startsWith('Bearer ');
}

// Check if filesystem is writable (works locally, not in serverless)
async function isFilesystemWritable(): Promise<boolean> {
  try {
    const testPath = join(process.cwd(), '.writable-test');
    await fs.writeFile(testPath, 'test');
    await fs.unlink(testPath);
    return true;
  } catch {
    return false;
  }
}

// GET - Read current config
export async function GET(request: NextRequest) {
  if (!await validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const configPath = join(process.cwd(), 'config.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    const writable = await isFilesystemWritable();

    return NextResponse.json({ config, writable });
  } catch (error) {
    console.error('Error reading config:', error);
    return NextResponse.json(
      { error: 'Failed to read config file' },
      { status: 500 }
    );
  }
}

// POST - Write new config (only works if filesystem is writable)
export async function POST(request: NextRequest) {
  if (!await validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json({ error: 'Config is required' }, { status: 400 });
    }

    // Validate JSON structure
    JSON.parse(JSON.stringify(config));

    // Check if filesystem is writable
    const writable = await isFilesystemWritable();
    if (!writable) {
      return NextResponse.json(
        { 
          error: 'Filesystem is not writable',
          message: 'In production/serverless environments, config.json is read-only. Please download the config and commit it to git.',
          writable: false
        },
        { status: 423 } // 423 Locked - indicates resource is read-only
      );
    }

    const configPath = join(process.cwd(), 'config.json');
    const configContent = JSON.stringify(config, null, 2);
    await fs.writeFile(configPath, configContent, 'utf-8');

    return NextResponse.json({ success: true, message: 'Config saved successfully', writable: true });
  } catch (error) {
    console.error('Error writing config:', error);
    return NextResponse.json(
      { error: 'Failed to write config file' },
      { status: 500 }
    );
  }
}

