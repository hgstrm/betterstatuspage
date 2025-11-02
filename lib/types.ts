import { z } from 'zod';

// Component status enum
export const ComponentStatus = z.enum([
  'operational',
  'degraded_performance',
  'partial_outage',
  'major_outage',
  'under_maintenance',
]);

export type ComponentStatus = z.infer<typeof ComponentStatus>;

// Component schema
export const ComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  status: ComponentStatus,
  position: z.number().optional(),
  showcase: z.boolean().optional(),
  only_show_if_degraded: z.boolean().optional(),
  group_id: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  group: z.boolean().optional(),
  start_date: z.string().nullable().optional(),
});

export type Component = z.infer<typeof ComponentSchema>;

// Component list response
export const ComponentListSchema = z.array(ComponentSchema);

// Incident status enum
export const IncidentStatus = z.enum([
  'investigating',
  'identified',
  'monitoring',
  'resolved',
  'postmortem',
]);

export type IncidentStatus = z.infer<typeof IncidentStatus>;

// Incident impact enum
export const IncidentImpact = z.enum([
  'none',
  'minor',
  'major',
  'critical',
]);

export type IncidentImpact = z.infer<typeof IncidentImpact>;

// Incident update schema
export const IncidentUpdateSchema = z.object({
  id: z.string(),
  status: IncidentStatus,
  body: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  display_at: z.string(),
  affected_components: z.array(z.object({
    code: z.string(),
    name: z.string(),
    old_status: ComponentStatus,
    new_status: ComponentStatus,
  })).optional(),
});

export type IncidentUpdate = z.infer<typeof IncidentUpdateSchema>;

// Incident schema
export const IncidentSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: IncidentStatus,
  impact: IncidentImpact,
  created_at: z.string(),
  updated_at: z.string(),
  monitoring_at: z.string().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
  shortlink: z.string().optional(),
  incident_updates: z.array(IncidentUpdateSchema).optional(),
  components: z.array(ComponentSchema).optional(),
});

export type Incident = z.infer<typeof IncidentSchema>;

// Page info schema
export const PageSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  time_zone: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Page = z.infer<typeof PageSchema>;

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Update component request
export interface UpdateComponentRequest {
  status: ComponentStatus;
  description?: string;
}

// Create incident request
export interface CreateIncidentRequest {
  name: string;
  status: IncidentStatus;
  impact: IncidentImpact;
  body: string;
  component_ids?: string[];
  components?: Record<string, ComponentStatus>;
  deliver_notifications?: boolean;
  wants_twitter_update?: boolean;
}

// Update incident request
export interface UpdateIncidentRequest {
  status: IncidentStatus;
  body: string;
  impact?: IncidentImpact;
  component_ids?: string[];
  components?: Record<string, ComponentStatus>;
  deliver_notifications?: boolean;
  wants_twitter_update?: boolean;
}

// Local cache schema for offline mode
export const CachedStateSchema = z.object({
  components: ComponentListSchema,
  lastUpdated: z.string(),
  pageInfo: PageSchema.optional(),
});

export type CachedState = z.infer<typeof CachedStateSchema>;
