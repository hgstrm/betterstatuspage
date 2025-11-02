'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { LoginPrompt } from '@/components/LoginPrompt';
import { IncidentCard } from '@/components/IncidentCard';
import { CreateIncidentModal } from '@/components/CreateIncidentModal';
import { Banner } from '@/components/Banner';
import { Badge } from '@/components/ui/badge';
import { TestModeBanner } from '@/components/TestModeBanner';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Component, ComponentStatus, Incident, IncidentImpact, IncidentStatus } from '@/lib/types';
import { getAPIClient } from '@/lib/statuspage-api-client';
import { CacheManager } from '@/lib/cache';

type TabType = 'open' | 'all' | 'maintenances';

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateIncident, setShowCreateIncident] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('open');
  const [testMode, setTestMode] = useState(false);
  const apiClient = getAPIClient();

  // Load test mode state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('statuspage_test_mode');
      setTestMode(stored === 'true');
    }
  }, []);

  const toggleTestMode = (enabled: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('statuspage_test_mode', enabled ? 'true' : 'false');
      setTestMode(enabled);
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new Event('testModeChanged'));
      // Refresh data when switching modes
      window.location.reload();
    }
  };

  // Check authentication
  useEffect(() => {
    async function checkAuth() {
      const { authenticated } = await apiClient.checkSession();

      if (!authenticated) {
        // If no password is required, automatically create session
        const requiresPassword = !!process.env.NEXT_PUBLIC_BACKUP_PASSWORD || !!process.env.BACKUP_PASSWORD;
        if (!requiresPassword) {
          const result = await apiClient.createSession();
          setIsAuthenticated(result.success === true);
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(authenticated);
      }

      setIsLoading(false);
    }

    checkAuth();
  }, [apiClient]);

  // Fetch components (minimal version for CreateIncidentModal)
  const { data: components, mutate } = useSWR<Component[]>(
    isAuthenticated ? `components-${testMode}` : null,
    async () => {
      // If test mode is enabled and components are empty, initialize with production
      if (testMode) {
        try {
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
      if (response.error) {
        const cached = CacheManager.loadFromCache();
        if (cached) {
          return cached.components;
        }
        throw new Error(response.error);
      }

      if (response.data) {
        CacheManager.saveToCache(response.data);
        return response.data;
      }

      throw new Error('No data received');
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      fallbackData: CacheManager.loadFromCache()?.components,
    }
  );

  // Fetch incidents
  const { data: incidents, mutate: mutateIncidents, error: incidentsError, isLoading: incidentsLoading } = useSWR<Incident[]>(
    isAuthenticated ? `incidents-${testMode}` : null,
    async () => {
      const response = await apiClient.getIncidents(50);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || [];
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  const handleLogin = async (password?: string) => {
    const result = await apiClient.createSession(password);
    if (result.success) {
      setIsAuthenticated(true);
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  const handleCreateIncident = async (data: {
    name: string;
    status: IncidentStatus;
    impact: IncidentImpact;
    body: string;
    componentUpdates: Array<{ id: string; status: ComponentStatus }>;
    deliverNotifications: boolean;
  }) => {
    try {
      const components: Record<string, ComponentStatus> = {};
      const component_ids: string[] = [];

      // Only include non-operational components
      data.componentUpdates.forEach((cu) => {
        if (cu.status !== 'operational') {
          components[cu.id] = cu.status;
          component_ids.push(cu.id);
        }
      });

      const response = await apiClient.createIncident({
        name: data.name,
        status: data.status,
        impact: data.impact,
        body: data.body,
        components,
        component_ids,
        deliver_notifications: data.deliverNotifications,
      });

      if (response.error) {
        toast.error(`Failed to create incident: ${response.error}`);
      } else {
        setShowCreateIncident(false);
        toast.success('Incident created successfully!');
        await mutateIncidents();
        await mutate();
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 mx-auto"></div>
          <p className="mt-4 text-zinc-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Check if password is required based on environment
    const requiresPassword = !!process.env.NEXT_PUBLIC_BACKUP_PASSWORD || !!process.env.BACKUP_PASSWORD;
    return <LoginPrompt onSubmit={handleLogin} requiresPassword={requiresPassword} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 sticky top-0 z-30 bg-white/95 backdrop-blur-md backdrop-saturate-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-b from-zinc-900 to-zinc-700 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
              S
            </div>
            <h1 className="text-base font-semibold text-zinc-900">BetterStatuspage</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-muted/50 hover:bg-muted transition-colors">
              <Checkbox
                id="test-mode"
                checked={testMode}
                onCheckedChange={(checked) => toggleTestMode(checked === true)}
              />
              <label
                htmlFor="test-mode"
                className="text-sm font-medium text-foreground cursor-pointer select-none whitespace-nowrap"
              >
                Test Mode
              </label>
            </div>
            {testMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/test-mode/preview')}
                className="h-8 hidden sm:inline-flex"
              >
                Preview
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/config')}
              className="h-8"
            >
              Config
            </Button>
            
          </div>
        </div>
      </header>

      <main className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Page Header */}
          <div className="pt-8 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900">Incidents</h1>
                  {testMode && (
                    <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50/50 shrink-0">
                      Test Mode
                    </Badge>
                  )}
                </div>
                <p className="text-sm sm:text-base text-zinc-600 mt-2">
                  {testMode 
                    ? 'Practice incident workflows without affecting production'
                    : 'Manage and track status page incidents'}
                </p>
              </div>
              <Button
                onClick={() => setShowCreateIncident(true)}
                className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-2.5 font-medium shadow-sm transition-all hover:shadow-md w-full sm:w-auto"
              >
                Create incident
              </Button>
            </div>
          </div>

          {/* Banner Alert */}
          <Banner />
          <DemoModeBanner />
          <TestModeBanner />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full mt-4">
            <TabsList className="mb-6">
              <TabsTrigger value="open">
                Open
              </TabsTrigger>
              <TabsTrigger value="all">
                All Incidents
              </TabsTrigger>
              <TabsTrigger value="maintenances">
                Maintenances
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0 pb-12 space-y-6">
            {incidentsError && (
              <div className="rounded-lg border border-red-100 bg-red-50/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">Failed to load incidents</p>
                    <p className="text-xs text-red-700 mt-1">{incidentsError.message}</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => mutateIncidents()}
                      className="mt-2 text-red-600 hover:text-red-700 p-0 h-auto text-xs font-medium"
                    >
                      Try again
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {incidentsLoading && !incidents && !incidentsError && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-300 border-t-zinc-600"></div>
                <p className="mt-3 text-xs text-zinc-500">Loading incidents...</p>
              </div>
            )}

            {!incidentsError && !incidentsLoading && (() => {
              const filteredIncidents = incidents?.filter(incident => {
                if (activeTab === 'open') {
                  // Show only non-resolved incidents
                  return incident.status !== 'resolved' && incident.status !== 'postmortem';
                } else if (activeTab === 'maintenances') {
                  // Maintenances have different handling - for now show empty
                  return false;
                }
                // 'all' tab shows everything
                return true;
              }) || [];

              if (filteredIncidents.length === 0) {
                return (
                  <div className="relative rounded-lg border border-zinc-200 bg-gradient-to-b from-zinc-50/30 to-white p-16">
                    <div className="mx-auto max-w-sm text-center">
                      <svg className="mx-auto h-10 w-10 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="mt-4 text-sm font-semibold text-zinc-900">
                        {activeTab === 'open' ? 'All clear' : activeTab === 'maintenances' ? 'No maintenances' : 'No incidents'}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        {activeTab === 'open'
                          ? 'All systems operational'
                          : activeTab === 'maintenances'
                          ? 'No scheduled maintenance windows'
                          : 'Create an incident to update your status page'}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filteredIncidents.map((incident) => (
                    <IncidentCard
                      key={incident.id}
                      incident={incident}
                    />
                  ))}
                </div>
              );
            })()}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <CreateIncidentModal
        isOpen={showCreateIncident}
        components={components || []}
        onClose={() => setShowCreateIncident(false)}
        onCreate={handleCreateIncident}
      />
    </div>
  );
}
