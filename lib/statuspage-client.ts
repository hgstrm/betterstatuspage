import {
  Component,
  ComponentListSchema,
  ComponentStatus,
  Incident,
  IncidentImpact,
  Page,
  PageSchema,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  ApiResponse,
} from './types';

const BASE_URL = 'https://api.statuspage.io/v1';

export class StatuspageClient {
  private apiKey: string;
  private pageId: string;

  constructor(apiKey: string, pageId: string) {
    this.apiKey = apiKey;
    this.pageId = pageId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${BASE_URL}/pages/${this.pageId}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `OAuth ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          error: `API Error (${response.status}): ${errorText}`,
        };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Get page information
  async getPage(): Promise<ApiResponse<Page>> {
    const response = await this.request<Page>('');
    if (response.data) {
      const parsed = PageSchema.safeParse(response.data);
      if (!parsed.success) {
        return { error: 'Invalid page data received' };
      }
      return { data: parsed.data };
    }
    return response;
  }

  // Get all components
  async getComponents(): Promise<ApiResponse<Component[]>> {
    const response = await this.request<Component[]>('/components');
    if (response.data) {
      const parsed = ComponentListSchema.safeParse(response.data);
      if (!parsed.success) {
        return { error: 'Invalid component data received' };
      }
      return { data: parsed.data };
    }
    return response;
  }

  // Get single component
  async getComponent(componentId: string): Promise<ApiResponse<Component>> {
    const response = await this.request<{ component: Component }>(`/components/${componentId}`);
    if (response.data) {
      return { data: response.data.component };
    }
    return { error: response.error || 'No component data received' };
  }

  /**
   * Update component status WITHOUT creating an incident
   * This is the key method that allows silent status updates
   */
  async updateComponentSilent(
    componentId: string,
    status: ComponentStatus
  ): Promise<ApiResponse<Component>> {
    const response = await this.request<Component>(`/components/${componentId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        component: { status },
      }),
    });
    return response;
  }

  /**
   * Batch update multiple components silently
   */
  async updateComponentsBatch(
    updates: Array<{ id: string; status: ComponentStatus }>
  ): Promise<ApiResponse<Component[]>> {
    try {
      const results = await Promise.all(
        updates.map(({ id, status }) => this.updateComponentSilent(id, status))
      );

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        return {
          error: `Failed to update ${errors.length} component(s): ${errors.map(e => e.error).join(', ')}`,
        };
      }

      const components = results.map(r => r.data).filter((c): c is Component => c !== undefined);
      return { data: components };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Batch update failed',
      };
    }
  }

  // Get all incidents
  async getIncidents(limit = 100): Promise<ApiResponse<Incident[]>> {
    // Include components in the response
    const response = await this.request<Incident[] | { incidents: Incident[] }>(`/incidents?limit=${limit}&components=true`);
    if (response.error) {
      return { error: response.error };
    }

    if (response.data) {
      // The API might return incidents directly or wrapped
      const incidents = Array.isArray(response.data)
        ? response.data
        : response.data.incidents || [];

      return { data: incidents };
    }

    return { data: [] };
  }

  // Get single incident
  async getIncident(incidentId: string): Promise<ApiResponse<Incident>> {
    // Include components in the response
    const response = await this.request<Incident | { incident: Incident }>(`/incidents/${incidentId}?components=true`);

    if (response.error) {
      return { error: response.error };
    }

    if (response.data) {
      // The API might return the incident directly or wrapped
      const incident = 'incident' in response.data ? response.data.incident : response.data;
      return { data: incident };
    }

    return { error: 'No incident data received' };
  }

  /**
   * Create an incident (this WILL post a public update)
   */
  async createIncident(
    incident: CreateIncidentRequest
  ): Promise<ApiResponse<Incident>> {
    const requestData: Record<string, unknown> = {
      name: incident.name,
      status: incident.status,
      body: incident.body,
      wants_twitter_update: incident.wants_twitter_update ? 't' : 'f',
      deliver_notifications: incident.deliver_notifications,
    };

    // Use impact_override to manually set the impact level
    if (incident.impact !== undefined) {
      requestData.impact_override = incident.impact;
    }

    // Add component updates if provided
    if (incident.components !== undefined) {
      requestData.components = incident.components;
    }
    if (incident.component_ids !== undefined) {
      requestData.component_ids = incident.component_ids;
    }

    const response = await this.request<Incident>('/incidents', {
      method: 'POST',
      body: JSON.stringify({ incident: requestData }),
    });

    if (response.data) {
      return { data: response.data };
    }
    return { error: response.error || 'Failed to create incident' };
  }

  /**
   * Update an existing incident (this WILL post a public update)
   */
  async updateIncident(
    incidentId: string,
    update: UpdateIncidentRequest
  ): Promise<ApiResponse<Incident>> {
    const incidentData: Record<string, unknown> = {
      status: update.status,
      body: update.body,
      deliver_notifications: update.deliver_notifications,
      wants_twitter_update: update.wants_twitter_update ? 't' : 'f',
    };

    // Only include optional fields if provided
    if (update.impact !== undefined) {
      incidentData.impact = update.impact;
    }
    if (update.component_ids !== undefined) {
      incidentData.component_ids = update.component_ids;
    }
    if (update.components !== undefined) {
      incidentData.components = update.components;
    }

    const response = await this.request<{ incident: Incident }>(`/incidents/${incidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        incident: incidentData,
      }),
    });
    if (response.data) {
      return { data: response.data.incident };
    }
    return { error: response.error || 'Failed to update incident' };
  }

  /**
   * Update incident metadata (impact) without posting an update
   * Uses impact_override to manually set the impact level
   */
  async updateIncidentMetadata(
    incidentId: string,
    impact: IncidentImpact
  ): Promise<ApiResponse<Incident>> {
    const response = await this.request<Incident | { incident: Incident }>(`/incidents/${incidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        incident: {
          impact_override: impact,
        },
      }),
    });
    if (response.error) {
      return { error: response.error };
    }

    if (response.data) {
      // Handle both wrapped and direct responses
      const incident = 'incident' in response.data ? response.data.incident : response.data;
      return { data: incident };
    }
    return { error: 'Failed to update incident metadata' };
  }

  /**
   * Update incident name/title
   */
  async updateIncidentName(
    incidentId: string,
    name: string
  ): Promise<ApiResponse<Incident>> {
    const response = await this.request<Incident | { incident: Incident }>(`/incidents/${incidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        incident: {
          name,
        },
      }),
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.data) {
      const incident = 'incident' in response.data ? response.data.incident : response.data;
      return { data: incident };
    }
    return { error: 'Failed to update incident name' };
  }

  /**
   * Update an incident update
   * Note: Component statuses cannot be changed via incident update PATCH.
   * Only body and display_at can be updated.
   */
  async updateIncidentUpdate(
    incidentId: string,
    incidentUpdateId: string,
    body: string,
    displayAt: string
  ): Promise<ApiResponse<Incident>> {
    const response = await this.request<Incident | { incident: Incident }>(`/incidents/${incidentId}/incident_updates/${incidentUpdateId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        incident_update: {
          body,
          display_at: displayAt,
        },
      }),
    });

    if (response.error) {
      return { error: response.error };
    }

    if (response.data) {
      const incident = 'incident' in response.data ? response.data.incident : response.data;
      return { data: incident };
    }
    return { error: 'Failed to update incident update' };
  }

  /**
   * Delete an incident (unpublishes it)
   */
  async deleteIncident(incidentId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/incidents/${incidentId}`, {
      method: 'DELETE',
    });
  }
}

// Singleton instance for client-side usage
let clientInstance: StatuspageClient | null = null;

export function createStatuspageClient(apiKey: string, pageId: string): StatuspageClient {
  clientInstance = new StatuspageClient(apiKey, pageId);
  return clientInstance;
}

export function getStatuspageClient(): StatuspageClient | null {
  return clientInstance;
}
