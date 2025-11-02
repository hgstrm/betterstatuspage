/**
 * Demo Mode Tracker
 * Tracks items created in demo mode so they can be automatically cleaned up
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const DEMO_DATA_DIR = join(process.cwd(), '.demo-data');
const DEMO_TRACKER_FILE = join(DEMO_DATA_DIR, 'demo-tracker.json');

export interface DemoTracker {
  incidents: string[]; // Incident IDs
  components: string[]; // Component IDs that were created (not updated)
  templates: string[]; // Template IDs
  lastCleanup: string | null; // ISO timestamp of last cleanup
}

async function getDemoTracker(): Promise<DemoTracker> {
  try {
    if (!existsSync(DEMO_TRACKER_FILE)) {
      return { incidents: [], components: [], templates: [], lastCleanup: null };
    }
    const data = await readFile(DEMO_TRACKER_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { incidents: [], components: [], templates: [], lastCleanup: null };
  }
}

async function saveDemoTracker(tracker: DemoTracker): Promise<void> {
  try {
    if (!existsSync(DEMO_DATA_DIR)) {
      await mkdir(DEMO_DATA_DIR, { recursive: true });
    }
    await writeFile(DEMO_TRACKER_FILE, JSON.stringify(tracker, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving demo tracker:', error);
  }
}

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_PREVIEW_DEMO_MODE === 'true';
}

/**
 * Track a created incident
 */
export async function trackIncident(incidentId: string): Promise<void> {
  if (!isDemoMode()) return;
  
  const tracker = await getDemoTracker();
  if (!tracker.incidents.includes(incidentId)) {
    tracker.incidents.push(incidentId);
    await saveDemoTracker(tracker);
  }
}

/**
 * Track a created component
 */
export async function trackComponent(componentId: string): Promise<void> {
  if (!isDemoMode()) return;
  
  const tracker = await getDemoTracker();
  if (!tracker.components.includes(componentId)) {
    tracker.components.push(componentId);
    await saveDemoTracker(tracker);
  }
}

/**
 * Track a created template
 */
export async function trackTemplate(templateId: string): Promise<void> {
  if (!isDemoMode()) return;
  
  const tracker = await getDemoTracker();
  if (!tracker.templates.includes(templateId)) {
    tracker.templates.push(templateId);
    await saveDemoTracker(tracker);
  }
}

/**
 * Get all tracked items
 */
export async function getTrackedItems(): Promise<DemoTracker> {
  return getDemoTracker();
}

/**
 * Clear tracked items after cleanup
 */
export async function clearTrackedItems(): Promise<void> {
  const tracker = await getDemoTracker();
  tracker.incidents = [];
  tracker.components = [];
  tracker.templates = [];
  tracker.lastCleanup = new Date().toISOString();
  await saveDemoTracker(tracker);
}

/**
 * Remove specific items from tracker (after deletion)
 */
export async function removeTrackedIncident(incidentId: string): Promise<void> {
  const tracker = await getDemoTracker();
  tracker.incidents = tracker.incidents.filter(id => id !== incidentId);
  await saveDemoTracker(tracker);
}

export async function removeTrackedComponent(componentId: string): Promise<void> {
  const tracker = await getDemoTracker();
  tracker.components = tracker.components.filter(id => id !== componentId);
  await saveDemoTracker(tracker);
}

export async function removeTrackedTemplate(templateId: string): Promise<void> {
  const tracker = await getDemoTracker();
  tracker.templates = tracker.templates.filter(id => id !== templateId);
  await saveDemoTracker(tracker);
}

