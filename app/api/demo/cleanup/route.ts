/**
 * Demo Mode Cleanup Cron Job
 * Deletes all tracked items created in demo mode
 * Should be called every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTrackedItems, removeTrackedIncident, removeTrackedTemplate } from '@/lib/demo-tracker';

const STATUSPAGE_API_KEY = process.env.STATUSPAGE_API_KEY;
const STATUSPAGE_PAGE_ID = process.env.STATUSPAGE_PAGE_ID;
const API_BASE_URL = 'https://api.statuspage.io/v1';

// Only allow if demo mode is enabled
function isDemoModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PREVIEW_DEMO_MODE === 'true';
}

// Optional: Add a secret token for cron job security
const CRON_SECRET = process.env.CRON_SECRET;

async function validateCronRequest(request: NextRequest): Promise<boolean> {
  // If CRON_SECRET is set, require it
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    return authHeader === `Bearer ${CRON_SECRET}`;
  }
  
  // Otherwise, allow if demo mode is enabled (for internal calls)
  return isDemoModeEnabled();
}

export async function GET(request: NextRequest) {
  // Only run if demo mode is enabled
  if (!isDemoModeEnabled()) {
    return NextResponse.json({ error: 'Demo mode not enabled' }, { status: 403 });
  }

  // Validate request (optional secret check)
  if (!await validateCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!STATUSPAGE_API_KEY || !STATUSPAGE_PAGE_ID) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const tracker = await getTrackedItems();
    const deleted: string[] = [];
    const errors: string[] = [];

    // Delete tracked incidents
    for (const incidentId of tracker.incidents) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/pages/${STATUSPAGE_PAGE_ID}/incidents/${incidentId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `OAuth ${STATUSPAGE_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok || response.status === 404) {
          await removeTrackedIncident(incidentId);
          deleted.push(`incident:${incidentId}`);
        } else {
          const errorText = await response.text();
          errors.push(`incident:${incidentId} - ${errorText}`);
        }
      } catch (error) {
        errors.push(`incident:${incidentId} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Delete tracked templates
    for (const templateId of tracker.templates) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/pages/${STATUSPAGE_PAGE_ID}/incident_templates/${templateId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `OAuth ${STATUSPAGE_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok || response.status === 404) {
          await removeTrackedTemplate(templateId);
          deleted.push(`template:${templateId}`);
        } else {
          const errorText = await response.text();
          errors.push(`template:${templateId} - ${errorText}`);
        }
      } catch (error) {
        errors.push(`template:${templateId} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Note: Components are typically not deleted, only updated
    // If you want to track component status changes and revert them, that would be separate logic
    // For now, we just track component creation (which is rare - components are usually pre-existing)

    return NextResponse.json({
      success: true,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error running cleanup cron:', error);
    return NextResponse.json({
      error: 'Failed to run cleanup',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}

