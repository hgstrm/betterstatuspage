'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAPIClient } from '@/lib/statuspage-api-client';
import { toast } from 'sonner';
import { Component, ComponentStatus, Incident, IncidentImpact, IncidentStatus, IncidentUpdate } from '@/lib/types';
import { format, formatDistanceToNow } from '@/lib/date-utils';
import { checkGrammar, applySuggestion, type GrammarIssue } from '@/lib/grammar-checker';
import { checkStyleGuide } from '@/lib/style-guide';
import { isAIGatewayAvailable, improveWithAIGateway } from '@/lib/ai-gateway';
import { isChromeAIAvailable, improveIncidentMessage as improveWithChromeAI } from '@/lib/chrome-ai';
import { improveMessageLocally } from '@/lib/local-ai-improver';
import { getUIConfig } from '@/lib/ai-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TestModeBanner } from '@/components/TestModeBanner';
import { DemoModeBanner } from '@/components/DemoModeBanner';

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const uiConfig = getUIConfig();
  const impactColors = uiConfig.colors.incidentImpact as Record<IncidentImpact, string>;
  const impactLabels = uiConfig.labels.impact as Record<IncidentImpact, string>;
  const statusLabels = uiConfig.labels.incidentStatus as Record<IncidentStatus, string>;
  const statusColors = uiConfig.colors.incidentStatus as Record<IncidentStatus, string>;
  const componentStatusColors = uiConfig.colors.componentStatus as Record<ComponentStatus, string>;
  const componentStatusLabels = uiConfig.labels.componentStatus as Record<ComponentStatus, string>;
  const defaultStatus = uiConfig.defaults.incidentStatus as IncidentStatus;
  const defaultImpact = uiConfig.defaults.incidentImpact as IncidentImpact;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUpdateMessage, setNewUpdateMessage] = useState('');
  const [newUpdateStatus, setNewUpdateStatus] = useState<IncidentStatus>(defaultStatus);
  const [selectedImpact, setSelectedImpact] = useState<IncidentImpact>(defaultImpact);
  const [componentStatuses, setComponentStatuses] = useState<Record<string, ComponentStatus>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUpdateViolations, setNewUpdateViolations] = useState<Array<{ original: string; replacement?: string; explanation: string }>>([]);
  const [editUpdateViolations, setEditUpdateViolations] = useState<Array<{ original: string; replacement?: string; explanation: string }>>([]);
  const [isImprovingWithAI, setIsImprovingWithAI] = useState(false);
  const [improvingMode, setImprovingMode] = useState<'new' | 'edit' | null>(null);
  const [aiGatewayAvailable, setAIGatewayAvailable] = useState(false);
  const [chromeAIAvailable, setChromeAIAvailable] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editUpdateMessage, setEditUpdateMessage] = useState('');
  const [editUpdateDate, setEditUpdateDate] = useState('');
  const [editUpdateTime, setEditUpdateTime] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showNewUpdateConfirmation, setShowNewUpdateConfirmation] = useState(false);
  const [showEditConfirmation, setShowEditConfirmation] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveAllComponents, setResolveAllComponents] = useState(true);
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[]>([]);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
  const [grammarCheckMode, setGrammarCheckMode] = useState<'new' | 'edit' | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [deliverNotifications, setDeliverNotifications] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const isPreviewDemoMode = process.env.NEXT_PUBLIC_PREVIEW_DEMO_MODE === 'true';

  // Check if test mode is enabled
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('statuspage_test_mode');
      setTestMode(stored === 'true');
    }
  }, []);

  // Check AI availability (AI Gateway and Chrome AI)
  useEffect(() => {
    setAIGatewayAvailable(isAIGatewayAvailable());
    isChromeAIAvailable().then(setChromeAIAvailable);
  }, []);

  // Auto-check grammar as user types (with debounce)
  useEffect(() => {
    if (!newUpdateMessage.trim() || newUpdateMessage.length < 10) {
      setGrammarIssues([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsCheckingGrammar(true);
      setGrammarCheckMode('new');
      try {
        const result = await checkGrammar(newUpdateMessage);
        setGrammarIssues(result.issues);
      } catch (error) {
        console.error('Auto grammar check failed:', error);
        setGrammarIssues([]);
      } finally {
        setIsCheckingGrammar(false);
      }
    }, 1500); // Wait 1.5 seconds after user stops typing

    return () => clearTimeout(timeoutId);
  }, [newUpdateMessage]);

  useEffect(() => {
    async function loadIncident() {
      const client = getAPIClient();

      try {
        const [incidentRes, componentsRes] = await Promise.all([
          client.getIncident(id),
          client.getComponents(),
        ]);

        if (incidentRes.error || !incidentRes.data) {
          toast.error(`Failed to load incident: ${incidentRes.error || 'No data received'}`);
          router.push('/dashboard');
          return;
        }

        setIncident(incidentRes.data);
        setNewUpdateStatus(incidentRes.data.status);
        setSelectedImpact(incidentRes.data.impact);

        if (componentsRes.data) {
          setComponents(componentsRes.data);
          const statuses: Record<string, ComponentStatus> = {};
          componentsRes.data.forEach(c => {
            statuses[c.id] = c.status;
          });
          setComponentStatuses(statuses);
        }
      } catch (error) {
        console.error('Error loading incident:', error);
        toast.error('Failed to load incident');
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    }

    loadIncident();
  }, [id, router]);

  const handleImproveWithAI = async (mode: 'new' | 'edit' = 'new') => {
    const message = mode === 'new' ? newUpdateMessage : editUpdateMessage;
    if (!message.trim()) {
      toast.error('Please write a message first');
      return;
    }

    // In demo mode, only Chrome AI is available
    if (isPreviewDemoMode && !chromeAIAvailable) {
      toast.error('Demo mode only supports Chrome AI. Please use Chrome browser and enable Chrome AI in settings, or use the "Chrome" button.');
      return;
    }

    setIsImprovingWithAI(true);
    setImprovingMode(mode);
    try {
      let improved: string;

      // In demo mode, only Chrome AI is available (free)
      // Priority 1: Try Chrome AI if available (required in demo mode)
      if (chromeAIAvailable) {
        try {
          improved = await improveWithChromeAI(message);
          toast.success('Message improved with Chrome AI');
        } catch (chromeError) {
          console.error('Chrome AI failed, using local improvement:', chromeError);
          improved = improveMessageLocally(message);
          toast.success('Message improved');
        }
      }
      // Priority 2: Try AI Gateway if not in demo mode and Chrome AI not available
      else if (aiGatewayAvailable) {
        try {
          improved = await improveWithAIGateway(message);
          toast.success('Message improved with AI');
        } catch (aiError) {
          console.error('AI Gateway failed, using local improvement:', aiError);
          improved = improveMessageLocally(message);
          toast.success('Message improved');
        }
      }
      // Priority 3: Use local rule-based improvement
      else {
        improved = improveMessageLocally(message);
        toast.success('Message improved');
      }

      if (mode === 'new') {
        setNewUpdateMessage(improved);
        setNewUpdateViolations(checkStyleGuide(improved));
      } else {
        setEditUpdateMessage(improved);
        setEditUpdateViolations(checkStyleGuide(improved));
      }
    } catch (error) {
      toast.error('Failed to improve message');
      console.error('All improvement methods failed:', error);
    } finally {
      setIsImprovingWithAI(false);
      setImprovingMode(null);
    }
  };

  const handleImproveWithChromeAI = async (mode: 'new' | 'edit' = 'new') => {
    const message = mode === 'new' ? newUpdateMessage : editUpdateMessage;
    if (!message.trim()) {
      toast.error('Please write a message first');
      return;
    }

    if (!chromeAIAvailable) {
      toast.error('Chrome AI is not available. Please enable it in Chrome settings.');
      return;
    }

    setIsImprovingWithAI(true);
    setImprovingMode(mode);
    try {
      const improved = await improveWithChromeAI(message);
      if (mode === 'new') {
        setNewUpdateMessage(improved);
        setNewUpdateViolations(checkStyleGuide(improved));
      } else {
        setEditUpdateMessage(improved);
        setEditUpdateViolations(checkStyleGuide(improved));
      }
      toast.success('Message improved with Chrome AI');
    } catch (error) {
      console.error('Chrome AI failed:', error);
      toast.error('Chrome AI failed. Try the main button for automatic fallback.');
    } finally {
      setIsImprovingWithAI(false);
      setImprovingMode(null);
    }
  };


  const handleApplySuggestion = (issue: GrammarIssue, replacementIndex: number) => {
    if (grammarCheckMode === 'new') {
      const newText = applySuggestion(newUpdateMessage, issue, replacementIndex);
      setNewUpdateMessage(newText);
    } else if (grammarCheckMode === 'edit') {
      const newText = applySuggestion(editUpdateMessage, issue, replacementIndex);
      setEditUpdateMessage(newText);
    }
    // Remove this issue from the list
    setGrammarIssues(prev => prev.filter(i => i !== issue));
  };

  const handleDismissIssue = (issue: GrammarIssue) => {
    setGrammarIssues(prev => prev.filter(i => i !== issue));
  };

  const handleDismissAllGrammar = () => {
    setGrammarIssues([]);
    setGrammarCheckMode(null);
  };

  const handleEditTitle = () => {
    setEditedTitle(incident?.name || '');
    setIsEditingTitle(true);
  };

  const handleCancelTitleEdit = () => {
    setIsEditingTitle(false);
    setEditedTitle('');
  };

  const handleSaveTitle = async () => {
    if (!incident || !editedTitle.trim()) return;

    const client = getAPIClient();
    if (!client) return;

    setIsSavingTitle(true);

    try {
      const response = await client.updateIncident(incident.id, { name: editedTitle.trim() });

      if (response.error) {
        toast.error(`Failed to update incident title: ${response.error}`);
      } else if (response.data) {
        setIncident(response.data);
        setIsEditingTitle(false);
        setEditedTitle('');
        toast.success('Incident title updated successfully');
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleCopyLink = async () => {
    if (!incident?.shortlink) return;

    try {
      await navigator.clipboard.writeText(incident.shortlink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link to clipboard');
    }
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUpdateMessage.trim()) {
      toast.warning('Please enter an update message');
      return;
    }

    // If marking as resolved and there are any non-operational components, show resolve modal
    const hasAffectedComponents = components?.some(c => c.status !== 'operational');
    if (newUpdateStatus === 'resolved' && hasAffectedComponents) {
      setShowResolveModal(true);
      return;
    }

    // Show confirmation dialog instead of submitting directly
    setShowNewUpdateConfirmation(true);
  };

  const handleResolveConfirm = () => {
    // If user wants to resolve all components, set them all to operational
    if (resolveAllComponents && incident?.components && Array.isArray(incident.components)) {
      const updatedStatuses: Record<string, ComponentStatus> = {};
      incident.components.forEach(component => {
        updatedStatuses[component.id] = 'operational';
      });
      // Important: Set the component statuses so they're sent with the resolution update
      setComponentStatuses(updatedStatuses);
    }

    setShowResolveModal(false);
    setShowNewUpdateConfirmation(true);
  };

  const confirmNewUpdate = async () => {
    const client = getAPIClient();
    if (!client || !incident) return;

    setIsSubmitting(true);
    setShowNewUpdateConfirmation(false);

    try {
      const componentsToSend: Record<string, ComponentStatus> = {};
      const component_ids: string[] = [];

      // When resolving, include ALL currently affected components as operational
      if (newUpdateStatus === 'resolved') {
        // If we have the "resolve all components" flag set, find ALL non-operational components
        if (resolveAllComponents && components) {
          // Include ALL components that are currently not operational
          components.forEach(component => {
            if (component.status !== 'operational') {
              componentsToSend[component.id] = 'operational';
              component_ids.push(component.id);
            }
          });
        }

        // Also include any manually set component statuses (overrides the above)
        Object.entries(componentStatuses).forEach(([id, status]) => {
          componentsToSend[id] = status;
          if (!component_ids.includes(id)) {
            component_ids.push(id);
          }
        });
      } else {
        // For non-resolution updates, only include non-operational components
        Object.entries(componentStatuses).forEach(([id, status]) => {
          if (status !== 'operational') {
            componentsToSend[id] = status;
            component_ids.push(id);
          }
        });
      }

      const response = await client.updateIncident(incident.id, {
        status: newUpdateStatus,
        body: newUpdateMessage.trim(),
        impact: selectedImpact,
        components: componentsToSend,
        component_ids,
        deliver_notifications: deliverNotifications,
      });

      if (response.error) {
        toast.error(`Failed to post update: ${response.error}`);
      } else {
        setNewUpdateMessage('');
        setComponentStatuses({});
        // Reload incident
        const refreshed = await client.getIncident(id);
        if (refreshed.data) {
          setIncident(refreshed.data);
        }
        toast.success('Update posted successfully!');
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateImpact = async (newImpact: IncidentImpact) => {
    const client = getAPIClient();
    if (!client || !incident) return;

    // Update local state optimistically
    setSelectedImpact(newImpact);

    // Try to update via API
    try {
      console.log('Updating impact to:', newImpact);
      const response = await client.updateIncidentImpact(incident.id, newImpact);
      console.log('Update response:', response);
      console.log('Response data impact:', response.data?.impact);

      if (response.error) {
        console.error('Failed to update impact:', response.error);
        toast.error(`Failed to update impact: ${response.error}`);
      } else if (response.data) {
        console.log('Impact updated to:', response.data.impact);
        setIncident(response.data);
        // Sync with server response
        setSelectedImpact(response.data.impact);
        toast.success('Impact level updated successfully');
      }
    } catch (error) {
      console.error('Error updating impact:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditUpdate = (update: IncidentUpdate) => {
    setEditingUpdateId(update.id);
    setEditUpdateMessage(update.body);
    setEditUpdateViolations(checkStyleGuide(update.body));

    // Parse the display_at timestamp
    const displayDate = new Date(update.display_at);
    const dateStr = displayDate.toISOString().split('T')[0];
    const timeStr = displayDate.toISOString().split('T')[1].substring(0, 5);
    setEditUpdateDate(dateStr);
    setEditUpdateTime(timeStr);
  };

  const handleCancelEdit = () => {
    setEditingUpdateId(null);
    setEditUpdateMessage('');
    setEditUpdateDate('');
    setEditUpdateTime('');
    setEditUpdateViolations([]);
  };

  const handleSaveEdit = async () => {
    if (!editingUpdateId || !incident) return;

    // Show confirmation dialog instead of saving directly
    setShowEditConfirmation(true);
  };

  const confirmEditUpdate = async () => {
    if (!editingUpdateId || !incident) return;

    const client = getAPIClient();
    if (!client) return;

    setIsSavingEdit(true);
    setShowEditConfirmation(false);

    try {
      // Combine date and time into ISO format
      const displayAt = new Date(`${editUpdateDate}T${editUpdateTime}:00Z`).toISOString();

      const response = await client.updateIncidentUpdate(
        incident.id,
        editingUpdateId,
        editUpdateMessage,
        displayAt
      );

      if (response.error) {
        toast.error(`Failed to update incident update: ${response.error}`);
      } else if (response.data) {
        // Refresh the incident data
        setIncident(response.data);
        handleCancelEdit();
        toast.success('Update saved successfully!');
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== 'yes delete') {
      toast.warning('Please type "yes delete" to confirm');
      return;
    }

    const client = getAPIClient();
    if (!client || !incident) return;

    try {
      const response = await client.deleteIncident(incident.id);
      if (response.error) {
        toast.error(`Failed to delete incident: ${response.error}`);
      } else {
        toast.success('Incident deleted successfully');
        router.push('/dashboard');
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-300 border-t-zinc-600 mx-auto"></div>
          <p className="mt-3 text-xs text-zinc-500">Loading incident...</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 sticky top-0 z-30 bg-white/95 backdrop-blur-md backdrop-saturate-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-b from-zinc-900 to-zinc-700 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                S
              </div>
              <h1 className="text-base font-semibold text-zinc-900">BetterStatuspage</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Secondary toolbar with Back button */}
      <div className="border-b border-zinc-100 bg-zinc-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-14 flex items-center justify-between">
            <Button
              onClick={() => router.push('/dashboard')}
              variant="ghost"
              className="text-zinc-600 hover:text-zinc-900"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <span>Impact:</span>
              <select
                value={selectedImpact}
                onChange={(e) => handleUpdateImpact(e.target.value as IncidentImpact)}
                className={`px-3 py-1.5 font-medium border rounded-lg ${impactColors[selectedImpact]} bg-white hover:border-zinc-400 transition-colors text-sm`}
              >
                {(Object.keys(impactLabels) as IncidentImpact[]).map((impact) => (
                  <option key={impact} value={impact}>
                    {impactLabels[impact]}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => setShowDeleteModal(true)}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-50"
            >
              Delete Incident
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <DemoModeBanner />
        <TestModeBanner />
        {/* Incident Title */}
        {isEditingTitle ? (
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="flex-1 text-3xl sm:text-4xl font-bold text-zinc-900 border-b-2 border-zinc-300 focus:border-zinc-900 focus:outline-none bg-transparent transition-colors"
                autoFocus
              />
              <Button
                onClick={handleSaveTitle}
                disabled={isSavingTitle || !editedTitle.trim()}
                className="bg-zinc-900 hover:bg-zinc-800"
              >
                {isSavingTitle ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={handleCancelTitleEdit}
                disabled={isSavingTitle}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="flex items-start gap-3 group mb-3">
              <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900">{incident.name}</h1>
              <button
                onClick={handleEditTitle}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-600 mt-2"
                title="Edit title"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
            {incident.shortlink && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800"
                >
                  <a
                    href={incident.shortlink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View on Statuspage
                  </a>
                </Button>
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  title="Copy link"
                >
                  {linkCopied ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </Button>
              </div>
            )}
            {testMode && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <Link href={`/test-mode/preview#incident-${incident.id}`}>
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View on Test Status Page
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Update History */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Update History</h2>

          <div className="space-y-3">
            {incident.incident_updates && incident.incident_updates.length > 0 ? (
              incident.incident_updates.map((update) => (
                <div key={update.id} className="bg-white rounded-lg border border-zinc-200 p-4 relative" style={editingUpdateId === update.id ? { minHeight: '450px' } : {}}>
                  {editingUpdateId === update.id && (
                    <div className="absolute inset-0 border-4 border-dashed border-zinc-400 rounded-lg bg-white p-6 z-10 flex flex-col">
                      <div className="flex-1">
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-zinc-700 mb-2">
                            Time (Timezone: UTC)
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type="date"
                                value={editUpdateDate}
                                onChange={(e) => setEditUpdateDate(e.target.value)}
                                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 bg-white"
                              />
                            </div>
                            <input
                              type="time"
                              value={editUpdateTime}
                              onChange={(e) => setEditUpdateTime(e.target.value)}
                              className="px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 bg-white"
                            />
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-semibold text-zinc-900">
                              Message
                            </label>
                            <div className="flex gap-2 items-center flex-wrap">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleImproveWithAI('edit')}
                                  disabled={isImprovingWithAI || !editUpdateMessage.trim()}
                                  className="text-sm font-medium text-black hover:text-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed flex items-center gap-2 px-4 py-2 rounded-md bg-white hover:bg-zinc-50 border border-zinc-300 transition-colors"
                                  title={isPreviewDemoMode 
                                    ? 'Demo mode: Only Chrome AI available (free, on-device)' 
                                    : chromeAIAvailable 
                                      ? 'Using Chrome AI (free, on-device)' 
                                      : aiGatewayAvailable 
                                        ? 'Using AI Gateway' 
                                        : 'Using local rules'}
                                >
                                  {isImprovingWithAI && improvingMode === 'edit' ? (
                                    <>
                                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin">
                                        <path d="M7 1V3M7 11V13M13 7H11M3 7H1M11.5 11.5L10.086 10.086M3.914 3.914L2.5 2.5M11.5 2.5L10.086 3.914M3.914 10.086L2.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                      Fixing...
                                    </>
                                  ) : (
                                    <>
                                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M7 0L8.854 5.146L14 7L8.854 8.854L7 14L5.146 8.854L0 7L5.146 5.146L7 0Z" fill="currentColor"/>
                                      </svg>
                                      Fix with AI
                                    </>
                                  )}
                                </button>
                                {chromeAIAvailable && (
                                  <button
                                    type="button"
                                    onClick={() => handleImproveWithChromeAI('edit')}
                                    disabled={isImprovingWithAI || !editUpdateMessage.trim()}
                                    className="text-xs font-medium text-zinc-600 hover:text-zinc-900 disabled:text-zinc-400 disabled:cursor-not-allowed flex items-center gap-1.5 px-3 py-2 rounded-md bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition-colors"
                                    title="Use Chrome AI directly (on-device)"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M6 0L7.732 4.268L12 6L7.732 7.732L6 12L4.268 7.732L0 6L4.268 4.268L6 0Z" fill="currentColor"/>
                                    </svg>
                                    Chrome
                                  </button>
                                )}
                              </div>
                              {isCheckingGrammar && grammarCheckMode === 'edit' ? (
                                <span className="text-xs font-medium text-zinc-500">Checking grammar...</span>
                              ) : grammarIssues.length > 0 && grammarCheckMode === 'edit' ? (
                                <span className="text-xs font-medium text-orange-600">⚠ {grammarIssues.length} grammar issue{grammarIssues.length !== 1 ? 's' : ''}</span>
                              ) : editUpdateMessage.length >= 10 && grammarCheckMode === 'edit' ? (
                                <span className="text-xs font-medium text-green-600">✓ No grammar issues</span>
                              ) : null}
                            </div>
                          </div>
                          <textarea
                            value={editUpdateMessage}
                            onChange={(e) => {
                              setEditUpdateMessage(e.target.value);
                              setEditUpdateViolations(checkStyleGuide(e.target.value));
                            }}
                            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 bg-white"
                            rows={3}
                          />

                          {/* Style Guide Violations for Edit */}
                          {editUpdateViolations.length > 0 && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-300 rounded-lg space-y-2">
                              {editUpdateViolations.map((violation, index) => (
                                <div key={index} className="text-sm text-red-800">
                                  <strong>⚠️ Avoid &quot;{violation.original}&quot;</strong>
                                  {violation.replacement && (
                                    <span> - Use: {violation.replacement}</span>
                                  )}
                                  {violation.explanation && (
                                    <div className="text-xs text-red-700 mt-1">{violation.explanation}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Grammar Issues for Edit */}
                          {grammarCheckMode === 'edit' && grammarIssues.length > 0 && (
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg max-h-60 overflow-y-auto">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-yellow-900">
                                  {grammarIssues.length} issue{grammarIssues.length !== 1 ? 's' : ''} found
                                </h4>
                                <button
                                  type="button"
                                  onClick={handleDismissAllGrammar}
                                  className="text-xs text-yellow-700 hover:text-yellow-900"
                                >
                                  Dismiss all
                                </button>
                              </div>
                              <div className="space-y-2">
                                {grammarIssues.map((issue, idx) => (
                                  <div key={idx} className="bg-white p-2 rounded border border-yellow-300">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="text-xs font-medium text-zinc-900 mb-1">{issue.message}</div>
                                        {issue.replacements.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {issue.replacements.map((replacement, repIdx) => (
                                              <button
                                                key={repIdx}
                                                type="button"
                                                onClick={() => handleApplySuggestion(issue, repIdx)}
                                                className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                              >
                                                {replacement}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDismissIssue(issue)}
                                        className="ml-2 text-zinc-400 hover:text-zinc-600 text-sm"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {grammarCheckMode === 'edit' && grammarIssues.length === 0 && isCheckingGrammar === false && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-xs text-green-800">✓ No grammar or spelling issues found!</p>
                            </div>
                          )}
                        </div>

                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                          <strong>Note:</strong> Component statuses cannot be edited in historical updates. To change component statuses, create a new incident update.
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-auto pt-4">
                        <div className="text-xs text-zinc-500">
                          Notifications were not sent
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCancelEdit}
                            disabled={isSavingEdit}
                            className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            disabled={isSavingEdit}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-black rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                          >
                            {isSavingEdit ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {editingUpdateId !== update.id && (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-sm text-zinc-600">
                          {formatDistanceToNow(new Date(update.created_at)).toUpperCase()}{' '}
                          ({format(new Date(update.created_at), 'HH:mm \'UTC\'')})
                        </div>
                        <button
                          onClick={() => handleEditUpdate(update)}
                          className="text-zinc-400 hover:text-zinc-600"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>

                      <Badge variant="outline" className={`mb-3 ${statusColors[update.status]} border`}>
                        {statusLabels[update.status]}
                      </Badge>

                      <p className="text-zinc-800 mb-4 whitespace-pre-wrap">{update.body}</p>

                      {update.affected_components && update.affected_components.length > 0 && (() => {
                        const affectedComponents = update.affected_components.filter(ac => ac.new_status !== 'operational');
                        return affectedComponents.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {affectedComponents.map((ac) => (
                              <Badge key={ac.code} variant="outline" className={`gap-1.5 ${componentStatusColors[ac.new_status]}`}>
                                <span className="w-2 h-2 rounded-full bg-current"></span>
                                {ac.name}
                              </Badge>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </>
                  )}
                </div>
              ))
            ) : (
              <p className="text-zinc-500">No updates yet</p>
            )}
          </div>
        </section>

        {/* Add New Update */}
        <section className="bg-white rounded-lg border border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-6">Add New Update</h2>

          <form onSubmit={handleSubmitUpdate}>
            {/* Incident Status Tabs */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-zinc-900 mb-4">
                Incident status
              </label>
              <div className="grid grid-cols-5 gap-2 p-1 bg-zinc-100 rounded-lg">
                {(Object.keys(statusLabels) as IncidentStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setNewUpdateStatus(status)}
                    className={`px-4 py-2.5 text-sm font-medium rounded-md transition-all ${
                      newUpdateStatus === status
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="message" className="block text-sm font-semibold text-zinc-900">
                  Message
                </label>
                <div className="flex gap-2 items-center flex-wrap">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => handleImproveWithAI('new')}
                      disabled={isImprovingWithAI || !newUpdateMessage.trim()}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      title={aiGatewayAvailable ? 'Using AI Gateway' : chromeAIAvailable ? 'Using Chrome AI' : 'Using local rules'}
                    >
                      {isImprovingWithAI && improvingMode === 'new' ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin">
                            <path d="M7 1V3M7 11V13M13 7H11M3 7H1M11.5 11.5L10.086 10.086M3.914 3.914L2.5 2.5M11.5 2.5L10.086 3.914M3.914 10.086L2.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Fixing...
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 0L8.854 5.146L14 7L8.854 8.854L7 14L5.146 8.854L0 7L5.146 5.146L7 0Z" fill="currentColor"/>
                          </svg>
                          Fix with AI
                        </>
                      )}
                    </Button>
                    {chromeAIAvailable && (
                      <button
                        type="button"
                        onClick={() => handleImproveWithChromeAI('new')}
                        disabled={isImprovingWithAI || !newUpdateMessage.trim()}
                        className="text-xs font-medium text-zinc-600 hover:text-zinc-900 disabled:text-zinc-400 disabled:cursor-not-allowed flex items-center gap-1.5 px-3 py-2 rounded-md bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition-colors"
                        title="Use Chrome AI directly (on-device)"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 0L7.732 4.268L12 6L7.732 7.732L6 12L4.268 7.732L0 6L4.268 4.268L6 0Z" fill="currentColor"/>
                        </svg>
                        Chrome
                      </button>
                    )}
                  </div>
                  {isCheckingGrammar && grammarCheckMode === 'new' ? (
                    <span className="text-xs font-medium text-zinc-500">Checking grammar...</span>
                  ) : grammarIssues.length > 0 && grammarCheckMode === 'new' ? (
                    <span className="text-xs font-medium text-orange-600">⚠ {grammarIssues.length} grammar issue{grammarIssues.length !== 1 ? 's' : ''}</span>
                  ) : newUpdateMessage.length >= 10 && grammarCheckMode === 'new' ? (
                    <span className="text-xs font-medium text-green-600">✓ No grammar issues</span>
                  ) : null}
                </div>
              </div>
              <textarea
                id="message"
                value={newUpdateMessage}
                onChange={(e) => {
                  setNewUpdateMessage(e.target.value);
                  setNewUpdateViolations(checkStyleGuide(e.target.value));
                }}
                placeholder="Provide an update on this incident..."
                className="w-full px-4 py-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-zinc-900 bg-white transition-all font-medium resize-none"
                rows={6}
                required
              />

              {/* Style Guide Violations */}
              {newUpdateViolations.length > 0 && (
                <div className="mt-2 p-3 bg-red-50 border border-red-300 rounded-lg space-y-2">
                  {newUpdateViolations.map((violation, index) => (
                    <div key={index} className="text-sm text-red-800">
                      <strong>⚠️ Avoid &quot;{violation.original}&quot;</strong>
                      {violation.replacement && (
                        <span> - Use: {violation.replacement}</span>
                      )}
                      {violation.explanation && (
                        <div className="text-xs text-red-700 mt-1">{violation.explanation}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Grammar Issues */}
              {grammarCheckMode === 'new' && grammarIssues.length > 0 && (
                <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-yellow-900">
                      {grammarIssues.length} issue{grammarIssues.length !== 1 ? 's' : ''} found
                    </h4>
                    <button
                      type="button"
                      onClick={handleDismissAllGrammar}
                      className="text-xs text-yellow-700 hover:text-yellow-900"
                    >
                      Dismiss all
                    </button>
                  </div>
                  <div className="space-y-3">
                    {grammarIssues.map((issue, idx) => (
                      <div key={idx} className="bg-white p-3 rounded border border-yellow-300">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-zinc-900 mb-1">{issue.message}</div>
                            <div className="text-xs text-zinc-600 mb-2">
                              <span className="font-mono bg-zinc-100 px-1 py-0.5 rounded">
                                ...{issue.context.text.substring(issue.context.offset, issue.context.offset + issue.context.length)}...
                              </span>
                            </div>
                            {issue.replacements.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {issue.replacements.map((replacement, repIdx) => (
                                  <button
                                    key={repIdx}
                                    type="button"
                                    onClick={() => handleApplySuggestion(issue, repIdx)}
                                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                  >
                                    {replacement}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDismissIssue(issue)}
                            className="ml-2 text-zinc-400 hover:text-zinc-600"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {grammarCheckMode === 'new' && grammarIssues.length === 0 && isCheckingGrammar === false && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">✓ No grammar or spelling issues found!</p>
                </div>
              )}
            </div>

            {/* Components */}
            {components.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-700 mb-3">
                  Components affected
                </label>
                <div className="space-y-4">
                  {(() => {
                    // Build map of incident component statuses
                    const incidentComponentStatuses = new Map<string, ComponentStatus>();
                    if (incident?.components && Array.isArray(incident.components)) {
                      incident.components.forEach(c => {
                        incidentComponentStatuses.set(c.id, c.status);
                      });
                    }

                    const groups = components.filter(c => c.group === true);
                    const ungrouped = components.filter(c => !c.group && !c.group_id);

                    return (
                      <>
                        {/* Render component groups */}
                        {groups.map((group) => {
                          const groupComponents = components.filter(c => c.group_id === group.id && !c.group);
                          if (groupComponents.length === 0) return null;

                          return (
                            <div key={group.id} className="space-y-2">
                              <div className="text-sm font-semibold text-zinc-700 border-b pb-1">
                                {group.name}
                              </div>
                              {groupComponents.map((component) => {
                                // Use incident component status if affected, otherwise use component's own status
                                const defaultStatus = incidentComponentStatuses.get(component.id) || component.status;
                                return (
                                  <div key={component.id} className="flex items-center justify-between py-2 border-b border-zinc-100 pl-3">
                                    <span className="text-sm text-zinc-900">{component.name}</span>
                                    <select
                                      value={componentStatuses[component.id] || defaultStatus}
                                      onChange={(e) => setComponentStatuses(prev => ({
                                        ...prev,
                                        [component.id]: e.target.value as ComponentStatus
                                      }))}
                                      className="px-3 py-1.5 border border-zinc-300 rounded text-sm focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 min-w-[200px] text-zinc-900 bg-white"
                                    >
                                      {(Object.keys(componentStatusLabels) as ComponentStatus[]).map((s) => (
                                        <option key={s} value={s}>
                                          {componentStatusLabels[s]}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}

                        {/* Render ungrouped components */}
                        {ungrouped.length > 0 && (
                          <div className="space-y-2">
                            {groups.some(g => components.filter(c => c.group_id === g.id && !c.group).length > 0) && (
                              <div className="text-sm font-semibold text-zinc-700 border-b pb-1">
                                Other Components
                              </div>
                            )}
                            {ungrouped.map((component) => {
                              // Use incident component status if affected, otherwise use component's own status
                              const defaultStatus = incidentComponentStatuses.get(component.id) || component.status;
                              return (
                                <div key={component.id} className="flex items-center justify-between py-2 border-b border-zinc-100">
                                  <span className="text-sm text-zinc-900">{component.name}</span>
                                  <select
                                    value={componentStatuses[component.id] || defaultStatus}
                                    onChange={(e) => setComponentStatuses(prev => ({
                                      ...prev,
                                      [component.id]: e.target.value as ComponentStatus
                                    }))}
                                    className="px-3 py-1.5 border border-zinc-300 rounded text-sm focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 min-w-[200px] text-zinc-900 bg-white"
                                  >
                                    {(Object.keys(componentStatusLabels) as ComponentStatus[]).map((s) => (
                                      <option key={s} value={s}>
                                        {componentStatusLabels[s]}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Notification Settings */}
            <div className="space-y-3 border-t border-zinc-200 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deliverNotifications}
                  onChange={(e) => setDeliverNotifications(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-zinc-900"
                />
                <span className="text-sm font-medium text-zinc-700">Send notifications to subscribers</span>
              </label>

              {deliverNotifications && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    <strong>⚠️ Warning:</strong> {testMode 
                      ? 'This update will only affect test data and will not be published to your production status page.'
                      : 'This update will be posted publicly and all subscribers will be notified.'}
                  </p>
                </div>
              )}

              {!deliverNotifications && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>ℹ️ Info:</strong> {testMode 
                      ? 'This update will only affect test data and will not be published to your production status page.'
                      : 'This update will be posted without sending notifications.'}
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end mt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                size="default"
                className="bg-zinc-900 hover:bg-zinc-800"
              >
                {isSubmitting ? 'Posting...' : 'Post Update'}
              </Button>
            </div>
          </form>
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Delete Incident</h3>
            <p className="text-sm text-zinc-600 mb-4">
              This will permanently delete this incident. This action cannot be undone.
            </p>
            <p className="text-sm text-zinc-600 mb-4">
              Type <span className="font-mono font-semibold">yes delete</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg mb-4 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-zinc-900"
              placeholder="yes delete"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmation !== 'yes delete'}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Update Confirmation Modal */}
      {showNewUpdateConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Confirm Update</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Review your changes before posting:
            </p>

            <div className="space-y-4 mb-6">
              {/* Status Change */}
              <div className="bg-zinc-50 rounded-lg p-4">
                <div className="text-sm font-medium text-zinc-700 mb-2">Status</div>
                <div className="flex items-center gap-3">
                  {incident?.status !== newUpdateStatus && (
                    <>
                      <span className={`px-3 py-1 rounded text-sm font-semibold ${statusColors[incident?.status || defaultStatus]}`}>
                        {statusLabels[incident?.status || defaultStatus]}
                      </span>
                      <span className="text-zinc-400">→</span>
                    </>
                  )}
                  <span className={`px-3 py-1 rounded text-sm font-semibold ${statusColors[newUpdateStatus]}`}>
                    {statusLabels[newUpdateStatus]}
                  </span>
                </div>
              </div>

              {/* Message */}
              <div className="bg-zinc-50 rounded-lg p-4">
                <div className="text-sm font-medium text-zinc-700 mb-2">Message</div>
                <div className="text-sm text-zinc-900 whitespace-pre-wrap">{newUpdateMessage}</div>
              </div>

              {/* Component Status Changes */}
              {(() => {
                const changedComponents = components.filter(
                  c => componentStatuses[c.id] && componentStatuses[c.id] !== c.status
                );
                return changedComponents.length > 0 && (
                  <div className="bg-zinc-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-zinc-700 mb-3">Component Status Changes</div>
                    <div className="space-y-2">
                      {changedComponents.map(component => (
                        <div key={component.id} className="flex items-center justify-between">
                          <span className="text-sm text-zinc-900">{component.name}</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${componentStatusColors[component.status]}`}>
                              {componentStatusLabels[component.status]}
                            </span>
                            <span className="text-zinc-400">→</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${componentStatusColors[componentStatuses[component.id]]}`}>
                              {componentStatusLabels[componentStatuses[component.id]]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Notification Status */}
            {deliverNotifications ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-orange-800">
                  <strong>📧 Notifications:</strong> All subscribers will be notified about this update.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ No Notifications:</strong> This update will be posted without sending notifications.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewUpdateConfirmation(false)}
                className="px-6 py-2.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={confirmNewUpdate}
                className="px-8 py-2.5 text-sm font-semibold text-white bg-black rounded-lg hover:bg-zinc-800 transition-all shadow-sm"
              >
                Post Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Update Confirmation Modal */}
      {showEditConfirmation && editingUpdateId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Confirm Edit</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Review your changes before saving:
            </p>

            <div className="space-y-4 mb-6">
              {/* Timestamp Change */}
              {(() => {
                const originalUpdate = incident?.incident_updates?.find(u => u.id === editingUpdateId);
                const originalDate = originalUpdate ? new Date(originalUpdate.display_at) : null;
                const newDate = new Date(`${editUpdateDate}T${editUpdateTime}:00Z`);
                const hasTimeChanged = originalDate && originalDate.getTime() !== newDate.getTime();

                return hasTimeChanged && (
                  <div className="bg-zinc-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-zinc-700 mb-2">Timestamp</div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-zinc-900">
                        {originalDate && format(originalDate, 'MMM d, yyyy HH:mm')} UTC
                      </span>
                      <span className="text-zinc-400">→</span>
                      <span className="text-zinc-900">
                        {format(newDate, 'MMM d, yyyy HH:mm')} UTC
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Message Change */}
              {(() => {
                const originalUpdate = incident?.incident_updates?.find(u => u.id === editingUpdateId);
                const hasMessageChanged = originalUpdate && originalUpdate.body !== editUpdateMessage;

                return (
                  <div className="bg-zinc-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-zinc-700 mb-2">Message</div>
                    {hasMessageChanged && (
                      <>
                        <div className="text-sm text-zinc-500 mb-2 line-through">{originalUpdate?.body}</div>
                        <div className="text-sm text-zinc-900 whitespace-pre-wrap font-medium">{editUpdateMessage}</div>
                      </>
                    )}
                    {!hasMessageChanged && (
                      <div className="text-sm text-zinc-900 whitespace-pre-wrap">{editUpdateMessage}</div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Notifications will not be sent for this edit.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEditConfirmation(false)}
                className="px-6 py-2.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={confirmEditUpdate}
                className="px-8 py-2.5 text-sm font-semibold text-white bg-black rounded-lg hover:bg-zinc-800 transition-all shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Incident Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-8 shadow-2xl">
            <h3 className="text-2xl font-bold text-zinc-900 mb-4">Resolve Incident</h3>
            {(() => {
              const affectedComponentCount = components?.filter(c => c.status !== 'operational').length || 0;
              return (
                <>
                  <p className="text-zinc-600 mb-6">
                    You&apos;re marking this incident as <strong>resolved</strong>. There {affectedComponentCount === 1 ? 'is' : 'are'} currently {affectedComponentCount} affected component{affectedComponentCount !== 1 ? 's' : ''}.
            </p>

            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={resolveAllComponents}
                  onChange={(e) => setResolveAllComponents(e.target.checked)}
                  className="mt-1 h-5 w-5 text-black border-zinc-300 rounded focus:ring-black"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-zinc-900 block mb-1">
                    Also mark all components as operational
                  </span>
                  <span className="text-sm text-zinc-600">
                    All {affectedComponentCount} affected component{affectedComponentCount !== 1 ? 's' : ''} will be automatically set to operational status
                  </span>
                </div>
              </label>
            </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowResolveModal(false)}
                      className="px-6 py-2.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleResolveConfirm}
                      className="px-8 py-2.5 text-sm font-semibold text-white bg-black rounded-lg hover:bg-zinc-800 transition-all shadow-sm"
                    >
                      Continue
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
