'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getAPIClient } from '@/lib/statuspage-api-client';
import { Component, Incident, ComponentStatus } from '@/lib/types';
import { formatDistanceToNow, format } from '@/lib/date-utils';
import { getUIConfig } from '@/lib/ai-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function TestModePreviewPage() {
  const router = useRouter();
  const apiClient = getAPIClient();
  const uiConfig = getUIConfig();
  const componentStatusColors = uiConfig.colors.componentStatus as Record<ComponentStatus, string>;
  const componentStatusLabels = uiConfig.labels.componentStatus as Record<ComponentStatus, string>;
  const componentStatusIcons = uiConfig.icons.componentStatus as Record<ComponentStatus, string>;
  const statusLabels = uiConfig.labels.incidentStatus as Record<string, string>;
  const statusColors = uiConfig.colors.incidentStatus as Record<string, string>;
  const impactLabels = uiConfig.labels.impact as Record<string, string>;

  // Check if preview demo mode is locked via environment variable
  const isPreviewDemoMode = process.env.NEXT_PUBLIC_PREVIEW_DEMO_MODE === 'true';
  
  // Check if test mode is enabled
  const [testMode, setTestMode] = useState(false);
  const [highlightIncidentId, setHighlightIncidentId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // If preview demo mode is enabled via env var, always use test mode
      if (isPreviewDemoMode) {
        setTestMode(true);
      } else {
        // Otherwise, check localStorage as before
        const stored = localStorage.getItem('statuspage_test_mode');
        setTestMode(stored === 'true');
        if (stored !== 'true') {
          router.push('/dashboard');
          return;
        }
      }
      
      // Check for incident ID in URL hash
      const hash = window.location.hash;
      if (hash.startsWith('#incident-')) {
        const incidentId = hash.replace('#incident-', '');
        setHighlightIncidentId(incidentId);
        // Scroll to incident after a short delay
        setTimeout(() => {
          const element = document.getElementById(`incident-${incidentId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Highlight briefly
            element.classList.add('ring-2', 'ring-orange-500', 'ring-offset-2');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-orange-500', 'ring-offset-2');
            }, 2000);
          }
        }, 500);
      }
      
      // Listen for storage changes to detect test mode toggle (only if not in preview demo mode)
      if (!isPreviewDemoMode) {
        const handleStorageChange = (e: StorageEvent) => {
          if (e.key === 'statuspage_test_mode') {
            setTestMode(e.newValue === 'true');
          }
        };
        window.addEventListener('storage', handleStorageChange);
        
        return () => {
          window.removeEventListener('storage', handleStorageChange);
        };
      }
    }
  }, [router, isPreviewDemoMode]);

  // Fetch test mode components
  const { data: components, mutate: mutateComponents } = useSWR<Component[]>(
    testMode ? 'test-components-preview' : null,
    async () => {
      // If test mode is enabled, ensure components are initialized
      if (testMode) {
        try {
          // First try to initialize if empty
          const initResponse = await fetch('/api/test-mode?resource=components&initialize=true');
          if (initResponse.ok) {
            const initialized = await initResponse.json();
            if (Array.isArray(initialized) && initialized.length > 0) {
              return initialized;
            }
          }
        } catch (error) {
          console.error('Error initializing test components:', error);
        }
      }

      const response = await apiClient.getComponents();
      return response.data || [];
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // Fetch test mode incidents
  const { data: incidents, mutate: mutateIncidents } = useSWR<Incident[]>(
    testMode ? 'test-incidents-preview' : null,
    async () => {
      const response = await apiClient.getIncidents(10);
      return response.data || [];
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  if (!testMode) {
    return null;
  }

  // Sync component statuses from open incidents
  const syncedComponents = components ? components.map(component => {
    // Find if this component is affected by any open incident
    const openIncidents = incidents?.filter(inc => 
      inc.status !== 'resolved' && inc.status !== 'postmortem'
    ) || [];
    
    let componentStatus = component.status;
    
    // Check all open incidents for this component
    for (const incident of openIncidents) {
      if (incident.components && Array.isArray(incident.components)) {
        const incidentComponent = incident.components.find(c => c.id === component.id);
        if (incidentComponent && incidentComponent.status && incidentComponent.status !== 'operational') {
          componentStatus = incidentComponent.status;
          break; // Use the first non-operational status found
        }
      }
    }
    
    return {
      ...component,
      status: componentStatus,
    };
  }) : [];

  // Group components
  const groups = syncedComponents.filter(c => c.group === true) || [];
  const ungrouped = syncedComponents.filter(c => !c.group && !c.group_id) || [];

  const getComponentsByGroupId = (groupId: string) => {
    return syncedComponents.filter(c => c.group_id === groupId && !c.group) || [];
  };

  // Calculate overall status
  const hasIssues = syncedComponents.some(c => c.status !== 'operational') || false;
  const allOperational = syncedComponents.every(c => c.status === 'operational') || false;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Test Status Page</h1>
              <p className="text-sm text-zinc-600 mt-1">Preview of your test mode incidents and components</p>
              {isPreviewDemoMode && (
                <p className="text-xs text-orange-600 mt-1 font-medium">
                  ⚠️ Demo mode: Only Chrome AI available (free, on-device) - AI Gateway disabled in demo mode
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  mutateComponents();
                  mutateIncidents();
                }}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                Refresh
              </Button>
              {!isPreviewDemoMode && (
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                >
                  Back to Dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Overall Status Banner */}
        <div className={`rounded-lg p-6 mb-8 ${hasIssues ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`text-2xl ${hasIssues ? 'text-yellow-600' : 'text-green-600'}`}>
              {hasIssues ? '⚠️' : '✓'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                {allOperational ? 'All Systems Operational' : 'Some Systems Experiencing Issues'}
              </h2>
              <p className="text-sm text-zinc-600 mt-1">
                {allOperational 
                  ? 'All services are operating normally'
                  : 'Some components may be experiencing issues'}
              </p>
            </div>
          </div>
        </div>

        {/* Components Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">Component Status</h2>
          <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
            {/* Component Groups */}
            {groups.map((group) => {
              const groupComponents = getComponentsByGroupId(group.id);
              if (groupComponents.length === 0) return null;

              return (
                <div key={group.id} className="border-b border-zinc-200 last:border-b-0">
                  <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200">
                    <h3 className="font-semibold text-zinc-900">{group.name}</h3>
                  </div>
                  <div className="divide-y divide-zinc-200">
                    {groupComponents.map((component) => (
                      <div key={component.id} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{componentStatusIcons[component.status]}</span>
                          <div>
                            <div className="font-medium text-zinc-900">{component.name}</div>
                            {component.description && (
                              <div className="text-sm text-zinc-600 mt-0.5">{component.description}</div>
                            )}
                          </div>
                        </div>
                        <Badge className={componentStatusColors[component.status]}>
                          {componentStatusLabels[component.status]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Ungrouped Components */}
            {ungrouped.length > 0 && (
              <div className="border-b border-zinc-200 last:border-b-0">
                {groups.length > 0 && (
                  <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200">
                    <h3 className="font-semibold text-zinc-900">Other Components</h3>
                  </div>
                )}
                <div className="divide-y divide-zinc-200">
                  {ungrouped.map((component) => (
                    <div key={component.id} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{componentStatusIcons[component.status]}</span>
                        <div>
                          <div className="font-medium text-zinc-900">{component.name}</div>
                          {component.description && (
                            <div className="text-sm text-zinc-600 mt-0.5">{component.description}</div>
                          )}
                        </div>
                      </div>
                      <Badge className={componentStatusColors[component.status]}>
                        {componentStatusLabels[component.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!syncedComponents || syncedComponents.length === 0) && (
              <div className="px-6 py-12 text-center text-zinc-500">
                No components available in test mode
              </div>
            )}
          </div>
        </section>

        {/* Incidents Section */}
        <section>
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">Recent Incidents</h2>
          {incidents && incidents.length > 0 ? (
            <div className="space-y-4">
              {incidents.map((incident) => {
                const createdAt = new Date(incident.created_at);
                const updatedAt = new Date(incident.updated_at);
                const latestUpdate = incident.incident_updates?.[incident.incident_updates.length - 1];
                const isHighlighted = highlightIncidentId === incident.id;
                
                return (
                  <div
                    key={incident.id}
                    id={`incident-${incident.id}`}
                    className={`bg-white rounded-lg border border-zinc-200 p-6 hover:shadow-md transition-shadow ${isHighlighted ? 'ring-2 ring-orange-500 ring-offset-2' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-zinc-900">{incident.name}</h3>
                          <Badge variant="outline" className={statusColors[incident.status]}>
                            {statusLabels[incident.status]}
                          </Badge>
                          <Badge variant="secondary">{impactLabels[incident.impact]}</Badge>
                        </div>

                        {latestUpdate && (
                          <p className="text-zinc-700 mb-3 whitespace-pre-wrap">{latestUpdate.body}</p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-zinc-600">
                          <span>
                            Created {formatDistanceToNow(createdAt)} ({format(createdAt, 'MMM d, yyyy HH:mm')})
                          </span>
                          <span className="text-zinc-300">•</span>
                          <span>
                            Updated {formatDistanceToNow(updatedAt)} ({format(updatedAt, 'MMM d, yyyy HH:mm')})
                          </span>
                        </div>

                        {/* Affected Components */}
                        {incident.components && Array.isArray(incident.components) && incident.components.length > 0 && (() => {
                          const affected = incident.components.filter(c => c.status !== 'operational');
                          return affected.length > 0 ? (
                            <div className="mt-3 pt-3 border-t border-zinc-200">
                              <div className="text-sm font-medium text-zinc-700 mb-2">Affected Components:</div>
                              <div className="flex flex-wrap gap-2">
                                {affected.map((component) => (
                                  <Badge key={component.id} variant="secondary" className="gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${componentStatusColors[component.status]}`} />
                                    {component.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center">
              <p className="text-zinc-500">No incidents in test mode yet</p>
              <p className="text-sm text-zinc-400 mt-2">Create an incident in test mode to see it here</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
