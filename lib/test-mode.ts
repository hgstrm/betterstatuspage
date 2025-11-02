/**
 * Test Mode Storage
 * Stores test/staging data separately from production
 * Uses localStorage to persist test incidents, components, and templates
 */

import { Component, Incident } from './types';

const TEST_MODE_KEY = 'statuspage_test_mode';
const TEST_COMPONENTS_KEY = 'statuspage_test_components';
const TEST_INCIDENTS_KEY = 'statuspage_test_incidents';
const TEST_TEMPLATES_KEY = 'statuspage_test_templates';

export function isTestMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TEST_MODE_KEY) === 'true';
}

export function setTestMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TEST_MODE_KEY, enabled ? 'true' : 'false');
}

export function getTestComponents(): Component[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(TEST_COMPONENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function setTestComponents(components: Component[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TEST_COMPONENTS_KEY, JSON.stringify(components));
}

export function getTestIncidents(): Incident[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(TEST_INCIDENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function setTestIncidents(incidents: Incident[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TEST_INCIDENTS_KEY, JSON.stringify(incidents));
}

export function getTestTemplates(): Array<{ id: string; name: string; body: string; [key: string]: unknown }> {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(TEST_TEMPLATES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function setTestTemplates(templates: Array<{ id: string; name: string; body: string; [key: string]: unknown }>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TEST_TEMPLATES_KEY, JSON.stringify(templates));
}

export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function clearTestData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TEST_COMPONENTS_KEY);
  localStorage.removeItem(TEST_INCIDENTS_KEY);
  localStorage.removeItem(TEST_TEMPLATES_KEY);
}

