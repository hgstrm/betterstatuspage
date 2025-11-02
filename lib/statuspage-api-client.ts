// Client-side API wrapper that calls our Next.js API routes
// This keeps API keys on the server and adds authentication

import { Component, ComponentStatus, Incident, IncidentImpact, IncidentStatus } from './types';

export interface StatuspageAPIClient {
  // Authentication
  createSession(password?: string): Promise<{ success?: boolean; error?: string }>;
  checkSession(): Promise<{ authenticated: boolean }>;
  logout(): Promise<{ success: boolean }>;

  // Components
  getComponents(): Promise<{ data?: Component[]; error?: string }>;
  updateComponentSilent(componentId: string, status: ComponentStatus): Promise<{ data?: Component; error?: string }>;

  // Templates
  getTemplates(): Promise<{ data?: Array<{ id: string; name: string; body: string; [key: string]: unknown }>; error?: string }>;
  createTemplate(template: {
    name: string;
    title?: string;
    body: string;
    update_status?: string;
    should_tweet?: boolean;
    should_send_notifications?: boolean;
    component_ids?: string[];
  }): Promise<{ data?: { id: string; name: string; body: string; [key: string]: unknown }; error?: string }>;
  updateTemplate(templateId: string, template: {
    name?: string;
    title?: string;
    body?: string;
    update_status?: string;
    should_tweet?: boolean;
    should_send_notifications?: boolean;
    component_ids?: string[];
  }): Promise<{ data?: { id: string; name: string; body: string; [key: string]: unknown }; error?: string }>;
  deleteTemplate(templateId: string): Promise<{ success?: boolean; error?: string }>;

  // Incidents
  getIncidents(limit?: number): Promise<{ data?: Incident[]; error?: string }>;
  getIncident(incidentId: string): Promise<{ data?: Incident; error?: string }>;
  createIncident(params: {
    name: string;
    status: IncidentStatus;
    impact: IncidentImpact;
    body: string;
    components?: Record<string, ComponentStatus>;
    component_ids?: string[];
    deliver_notifications?: boolean;
  }): Promise<{ data?: Incident; error?: string }>;
  updateIncident(incidentId: string, updates: Record<string, unknown>): Promise<{ data?: Incident; error?: string }>;
  deleteIncident(incidentId: string): Promise<{ success?: boolean; error?: string }>;
  updateIncidentImpact(incidentId: string, impact: IncidentImpact): Promise<{ data?: Incident; error?: string }>;
  updateIncidentUpdate(incidentId: string, updateId: string, body: string, displayAt?: string): Promise<{ data?: Incident; error?: string }>;
}

class APIClient implements StatuspageAPIClient {
  private baseUrl = '/api';

  private isTestMode(): boolean {
    if (typeof window === 'undefined') return false;
    // In preview demo mode, use real API (not test mode)
    if (process.env.NEXT_PUBLIC_PREVIEW_DEMO_MODE === 'true') {
      return false;
    }
    return localStorage.getItem('statuspage_test_mode') === 'true';
  }

  private isDemoMode(): boolean {
    if (typeof window === 'undefined') return false;
    return process.env.NEXT_PUBLIC_PREVIEW_DEMO_MODE === 'true';
  }

  private async fetchAPI(path: string, options: RequestInit = {}) {
    // Route to test mode API if test mode is enabled (but NOT in demo mode)
    const testMode = this.isTestMode();
    
    // Parse the path to determine resource type
    let resource = '';
    let testUrl = `${this.baseUrl}/test-mode`;
    
    if (testMode && path.startsWith('/statuspage/')) {
      if (path.includes('/components')) {
        resource = 'components';
        if (path.includes('/components/')) {
          const id = path.split('/components/')[1];
          testUrl = `${this.baseUrl}/test-mode?resource=${resource}&id=${id}`;
        } else {
          testUrl = `${this.baseUrl}/test-mode?resource=${resource}`;
        }
      } else if (path.includes('/incidents')) {
        resource = 'incidents';
        if (path.includes('/incidents/')) {
          const id = path.split('/incidents/')[1];
          testUrl = `${this.baseUrl}/test-mode?resource=${resource}&id=${id}`;
        } else {
          const limit = new URLSearchParams(path.split('?')[1] || '').get('limit') || '50';
          testUrl = `${this.baseUrl}/test-mode?resource=${resource}&limit=${limit}`;
        }
      } else if (path.includes('/templates')) {
        resource = 'templates';
        if (path.includes('/templates/')) {
          const id = path.split('/templates/')[1];
          testUrl = `${this.baseUrl}/test-mode?resource=${resource}&id=${id}`;
        } else {
          testUrl = `${this.baseUrl}/test-mode?resource=${resource}`;
        }
      }
    }

    // In demo mode, always use real API (not test mode)
    const targetUrl = testMode && resource ? testUrl : `${this.baseUrl}${path}`;
    
    const response = await fetch(targetUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok && response.status !== 401) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return response;
  }

  async createSession(password?: string) {
    try {
      const response = await this.fetchAPI('/auth/session', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      return await response.json();
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to create session' };
    }
  }

  async checkSession() {
    try {
      const response = await this.fetchAPI('/auth/session');
      return await response.json();
    } catch {
      return { authenticated: false };
    }
  }

  async logout() {
    try {
      const response = await this.fetchAPI('/auth/session', {
        method: 'DELETE',
      });
      return await response.json();
    } catch {
      return { success: false };
    }
  }

  async getComponents() {
    try {
      const response = await this.fetchAPI('/statuspage/components');
      const data = await response.json();

      if (response.status === 401) {
        return { error: 'Unauthorized. Please log in again.' };
      }

      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch components' };
    }
  }

  async updateComponentSilent(componentId: string, status: ComponentStatus) {
    try {
      const response = await this.fetchAPI('/statuspage/components', {
        method: 'PATCH',
        body: JSON.stringify({ componentId, status }),
      });

      if (response.status === 401) {
        return { error: 'Unauthorized. Please log in again.' };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to update component' };
    }
  }

  async getTemplates() {
    try {
      const response = await this.fetchAPI('/statuspage/templates');

      if (response.status === 401) {
        return { error: 'Unauthorized. Please log in again.' };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch templates' };
    }
  }

  async createTemplate(template: {
    name: string;
    title?: string;
    body: string;
    update_status?: string;
    should_tweet?: boolean;
    should_send_notifications?: boolean;
    component_ids?: string[];
  }) {
    try {
      const response = await this.fetchAPI('/statuspage/templates', {
        method: 'POST',
        body: JSON.stringify(template),
      });

      if (response.status === 401) {
        return { error: 'Unauthorized. Please log in again.' };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to create template' };
    }
  }

  async updateTemplate(templateId: string, template: {
    name?: string;
    title?: string;
    body?: string;
    update_status?: string;
    should_tweet?: boolean;
    should_send_notifications?: boolean;
    component_ids?: string[];
  }) {
    try {
      const response = await this.fetchAPI(`/statuspage/templates/${templateId}`, {
        method: 'PATCH',
        body: JSON.stringify(template),
      });

      if (response.status === 401) {
        return { error: 'Unauthorized. Please log in again.' };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to update template' };
    }
  }

  async deleteTemplate(templateId: string) {
    try {
      const response = await this.fetchAPI(`/statuspage/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.status === 401) {
        return { error: 'Unauthorized. Please log in again.' };
      }

      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to delete template' };
    }
  }

  async getIncidents(limit = 50) {
    try {
      const response = await this.fetchAPI(`/statuspage/incidents?limit=${limit}`);

      if (response.status === 401) {
        return { error: 'Unauthorized. Please log in again.' };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch incidents' };
    }
  }

  async getIncident(incidentId: string) {
    try {
      const response = await this.fetchAPI(`/statuspage/incidents/${incidentId}`);

      if (response.status === 401) {
        return { error: 'Unauthorized. Please log in again.' };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch incident' };
    }
  }

  async createIncident(params: {
    name: string;
    status: IncidentStatus;
    impact: IncidentImpact;
    body: string;
    components?: Record<string, ComponentStatus>;
    component_ids?: string[];
    deliver_notifications?: boolean;
  }) {
    try {
      const response = await this.fetchAPI('/statuspage/incidents', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      if (response.status === 401) {
        return { error: 'Unauthorized. Please log in again.' };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to create incident' };
    }
  }

  async updateIncident(incidentId: string, updates: Record<string, unknown>) {
    try {
      const response = await this.fetchAPI(`/statuspage/incidents/${incidentId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (response.status === 401) {
        return { error: 'Unauthorized. Please log in again.' };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to update incident' };
    }
  }

  async deleteIncident(incidentId: string) {
    try {
      const response = await this.fetchAPI(`/statuspage/incidents/${incidentId}`, {
        method: 'DELETE',
      });

      if (response.status === 401) {
        return { error: 'Unauthorized. Please log in again.' };
      }

      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to delete incident' };
    }
  }

  async updateIncidentImpact(incidentId: string, impact: IncidentImpact) {
    return this.updateIncident(incidentId, { impact_override: impact });
  }

  async updateIncidentUpdate(incidentId: string, updateId: string, body: string, displayAt?: string) {
    // This needs a separate API endpoint for incident updates
    // For now, we'll use the general update endpoint
    return this.updateIncident(incidentId, {
      incident_update: {
        id: updateId,
        body,
        display_at: displayAt,
      }
    });
  }
}

// Singleton instance
let apiClient: StatuspageAPIClient | null = null;

export function getAPIClient(): StatuspageAPIClient {
  if (!apiClient) {
    apiClient = new APIClient();
  }
  return apiClient;
}

// For backward compatibility with existing code
export function createStatuspageClient() {
  // No need to pass API keys anymore, they're on the server
  return getAPIClient();
}

export function getStatuspageClient(): StatuspageAPIClient {
  return getAPIClient();
}