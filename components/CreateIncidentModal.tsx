'use client';

import { useState, useEffect } from 'react';
import { Component, ComponentStatus, IncidentImpact, IncidentStatus } from '@/lib/types';
import { checkStyleGuide } from '@/lib/style-guide';
import { isAIGatewayAvailable, improveWithAIGateway } from '@/lib/ai-gateway';
import { isChromeAIAvailable, improveIncidentMessage as improveWithChromeAI } from '@/lib/chrome-ai';
import { improveMessageLocally } from '@/lib/local-ai-improver';
import { getUIConfig } from '@/lib/ai-config';
import { getAPIClient } from '@/lib/statuspage-api-client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TestModeBanner } from '@/components/TestModeBanner';

interface CreateIncidentModalProps {
  isOpen: boolean;
  components: Component[];
  onClose: () => void;
  onCreate: (data: {
    name: string;
    status: IncidentStatus;
    impact: IncidentImpact;
    body: string;
    componentUpdates: Array<{ id: string; status: ComponentStatus }>;
    deliverNotifications: boolean;
  }) => void;
}

// Helper function to group components
function groupComponents(components: Component[]): { groups: Component[], ungrouped: Component[] } {
  const groups = components.filter(c => c.group === true);
  const ungrouped = components.filter(c => !c.group && !c.group_id);
  return { groups, ungrouped };
}

function getComponentsByGroupId(components: Component[], groupId: string): Component[] {
  return components.filter(c => c.group_id === groupId && !c.group);
}

export function CreateIncidentModal({ isOpen, components, onClose, onCreate }: CreateIncidentModalProps) {
  const uiConfig = getUIConfig();
  const impactLabels = uiConfig.labels.impact as Record<IncidentImpact, string>;
  const statusLabels = uiConfig.labels.incidentStatus as Record<IncidentStatus, string>;
  const defaultStatus = uiConfig.defaults.incidentStatus as IncidentStatus;
  const defaultImpact = uiConfig.defaults.incidentImpact as IncidentImpact;

  const [name, setName] = useState('');
  const [status, setStatus] = useState<IncidentStatus>(defaultStatus);
  const [impact, setImpact] = useState<IncidentImpact>(defaultImpact);
  const [body, setBody] = useState('');
  const [selectedComponents, setSelectedComponents] = useState<Record<string, ComponentStatus>>({});
  const [deliverNotifications, setDeliverNotifications] = useState(true);
  const [error, setError] = useState('');
  const [nameViolations, setNameViolations] = useState<Array<{ original: string; replacement?: string; explanation: string }>>([]);
  const [bodyViolations, setBodyViolations] = useState<Array<{ original: string; replacement?: string; explanation: string }>>([]);
  const [isImprovingWithAI, setIsImprovingWithAI] = useState(false);
  const [aiGatewayAvailable, setAIGatewayAvailable] = useState(false);
  const [chromeAIAvailable, setChromeAIAvailable] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; body: string; [key: string]: unknown }>>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [testMode, setTestMode] = useState(false);
  const isPreviewDemoMode = process.env.NEXT_PUBLIC_PREVIEW_DEMO_MODE === 'true';
  const apiClient = getAPIClient();

  // Check if test mode is enabled
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('statuspage_test_mode');
      setTestMode(stored === 'true');
      
      // Listen for changes to test mode
      const handleStorageChange = () => {
        const stored = localStorage.getItem('statuspage_test_mode');
        setTestMode(stored === 'true');
      };
      
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('testModeChanged', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('testModeChanged', handleStorageChange);
      };
    }
  }, []);

  // Check AI availability
  useEffect(() => {
    setAIGatewayAvailable(isAIGatewayAvailable());
    isChromeAIAvailable().then(setChromeAIAvailable);
  }, []);

  // Fetch templates from Statuspage API
  useEffect(() => {
    async function fetchTemplates() {
      setIsLoadingTemplates(true);
      try {
        const result = await apiClient.getTemplates();
        if (result.data) {
          // Handle different API response formats
          // API might return { incident_templates: [...] } or just [...]
          const templateArray = Array.isArray(result.data) 
            ? result.data as Array<{ id?: string; name: string; body: string; [key: string]: unknown }>
            : (result.data as { incident_templates?: Array<{ id?: string; name: string; body: string; [key: string]: unknown }> }).incident_templates || [];
          setTemplates(templateArray.map(t => ({ ...t, id: t.id || '', name: t.name, body: t.body } as { id: string; name: string; body: string; [key: string]: unknown })));
        }
      } catch {
        console.error('Failed to fetch templates from API');
        toast.error('Failed to load templates from Statuspage');
      } finally {
        setIsLoadingTemplates(false);
      }
    }
    if (isOpen) {
      fetchTemplates();
      setSelectedTemplateId(''); // Reset selection when modal opens
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !body.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');

    const componentUpdates = Object.entries(selectedComponents).map(([id, status]) => ({
      id,
      status,
    }));

    onCreate({
      name: name.trim(),
      status,
      impact,
      body: body.trim(),
      componentUpdates,
      deliverNotifications,
    });

    // Reset form
    setName('');
    setStatus(defaultStatus);
    setImpact(defaultImpact);
    setBody('');
    setSelectedComponents({});
    setDeliverNotifications(true);
  };

  const toggleComponent = (componentId: string, newStatus: ComponentStatus) => {
    setSelectedComponents((prev) => {
      const updated = { ...prev };
      if (updated[componentId] === newStatus) {
        delete updated[componentId];
      } else {
        updated[componentId] = newStatus;
      }
      return updated;
    });
  };

  const checkTextForViolations = (nameText: string, bodyText: string) => {
    setNameViolations(checkStyleGuide(nameText));
    setBodyViolations(checkStyleGuide(bodyText));
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (!templateId) {
      return;
    }

    const template = templates.find((t) => {
      const id = t.id || (t as { template_id?: string }).template_id;
      return id === templateId;
    });

    if (template) {
      // Try various possible field names for template content
      const templateText = (template.body || (template as { message?: string; text?: string; content?: string }).message || (template as { message?: string; text?: string; content?: string }).text || (template as { message?: string; text?: string; content?: string }).content || '') as string;
      
      if (templateText) {
        setBody(templateText);
        checkTextForViolations(name, templateText);
        toast.success('Template applied');
      } else {
        toast.error('Selected template has no content');
      }
    }
  };

  const handleImproveWithAI = async () => {
    if (!body.trim()) {
      toast.error('Please write a message first');
      return;
    }

    // In demo mode, only Chrome AI is available
    if (isPreviewDemoMode && !chromeAIAvailable) {
      toast.error('Demo mode only supports Chrome AI. Please use Chrome browser and enable Chrome AI in settings, or use the "Chrome" button.');
      return;
    }

    setIsImprovingWithAI(true);
    try {
      let improved: string;

      // In demo mode, only Chrome AI is available (free)
      // Priority 1: Try Chrome AI if available (required in demo mode)
      if (chromeAIAvailable) {
        try {
          improved = await improveWithChromeAI(body);
          toast.success('Message improved with Chrome AI');
        } catch (chromeError) {
          console.error('Chrome AI failed, using local improvement:', chromeError);
          improved = improveMessageLocally(body);
          toast.success('Message improved (local)');
        }
      }
      // Priority 2: Try AI Gateway if not in demo mode and Chrome AI not available
      else if (aiGatewayAvailable) {
        try {
          improved = await improveWithAIGateway(body);
          toast.success('Message improved with AI');
        } catch (aiError) {
          console.error('AI Gateway failed, using local improvement:', aiError);
          improved = improveMessageLocally(body);
          toast.success('Message improved (local)');
        }
      }
      // Priority 3: Local rules
      else {
        improved = improveMessageLocally(body);
        toast.success('Message improved (local)');
      }

      setBody(improved);
      checkTextForViolations(name, improved);
    } catch (error) {
      toast.error('Failed to improve message');
      console.error('All improvement methods failed:', error);
    } finally {
      setIsImprovingWithAI(false);
    }
  };

  const handleImproveWithChromeAI = async () => {
    if (!body.trim()) {
      toast.error('Please write a message first');
      return;
    }

    if (!chromeAIAvailable) {
      toast.error('Chrome AI is not available. Please enable it in Chrome settings.');
      return;
    }

    setIsImprovingWithAI(true);
    try {
      const improved = await improveWithChromeAI(body);
      setBody(improved);
      checkTextForViolations(name, improved);
      toast.success('Message improved with Chrome AI');
    } catch (error) {
      console.error('Chrome AI failed:', error);
      toast.error('Chrome AI failed. Try the main button for automatic fallback.');
    } finally {
      setIsImprovingWithAI(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <div className="p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-bold text-zinc-900">Create New Incident</DialogTitle>
            <p className="text-zinc-600 mt-2">Post a public status update to inform your users</p>
          </DialogHeader>
          <TestModeBanner />

          <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name" className="text-sm font-semibold text-zinc-900 mb-2 block">Incident Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
                checkTextForViolations(e.target.value, body);
              }}
              placeholder="e.g., API Service Degradation"
              className="h-11 px-4 border-zinc-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              required
            />
            {nameViolations.length > 0 && (
              <div className="mt-2 p-3 bg-red-50 border border-red-300 rounded-lg space-y-2">
                {nameViolations.map((violation, index) => (
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
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label htmlFor="status" className="text-sm font-semibold text-zinc-900 mb-2 block">Status *</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as IncidentStatus)}>
                <SelectTrigger id="status" className="h-11 border-zinc-300 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(statusLabels) as IncidentStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="impact" className="text-sm font-semibold text-zinc-900 mb-2 block">Impact *</Label>
              <Select value={impact} onValueChange={(value) => setImpact(value as IncidentImpact)}>
                <SelectTrigger id="impact" className="h-11 border-zinc-300 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(impactLabels) as IncidentImpact[]).map((i) => (
                    <SelectItem key={i} value={i}>
                      {impactLabels[i]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label htmlFor="body" className="text-sm font-semibold text-zinc-900">Initial Message *</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedTemplateId || undefined}
                  onValueChange={handleTemplateSelect}
                  disabled={isLoadingTemplates || templates.length === 0}
                >
                  <SelectTrigger className="text-sm h-8 px-3 border-zinc-300 rounded-md w-[140px]">
                    <SelectValue placeholder={isLoadingTemplates ? 'Loading...' : templates.length === 0 ? 'No templates' : 'Use Template'} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => {
                      const id = template.id || (template as { template_id?: string }).template_id || '';
                      const name = template.name || (template as { title?: string }).title || `Template ${id}`;
                      // Only render SelectItem if id is not empty
                      if (!id) return null;
                      return (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={handleImproveWithAI}
                  disabled={isImprovingWithAI || !body.trim()}
                  className="text-sm font-medium text-black hover:text-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed flex items-center gap-2 px-4 py-2 rounded-md bg-white hover:bg-zinc-50 border border-zinc-300 transition-colors"
                  title={isPreviewDemoMode 
                    ? 'Demo mode: Only Chrome AI available (free, on-device)' 
                    : chromeAIAvailable 
                      ? 'Using Chrome AI (free, on-device)' 
                      : aiGatewayAvailable 
                        ? 'Using AI Gateway' 
                        : 'Using local rules'}
                >
                  {isImprovingWithAI ? (
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
                    onClick={handleImproveWithChromeAI}
                    disabled={isImprovingWithAI || !body.trim()}
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
            </div>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setError('');
                checkTextForViolations(name, e.target.value);
              }}
              placeholder="Describe what's happening and what you're doing about it..."
              rows={5}
              className="px-4 py-3 border-zinc-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black resize-none"
              required
            />
            <p className="text-sm text-zinc-500 mt-2 font-medium">
              {testMode 
                ? 'This message will only affect test data and will not be published to your production status page'
                : 'This message will be posted publicly on your status page'}
            </p>
            {bodyViolations.length > 0 && (
              <div className="mt-2 p-3 bg-red-50 border border-red-300 rounded-lg space-y-2">
                {bodyViolations.map((violation, index) => (
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
          </div>

          <div>
            <Label className="text-sm font-semibold text-zinc-900 mb-3 block">Affected Components (Optional)</Label>
            <div className="border border-zinc-200 rounded-xl p-4 max-h-72 overflow-y-auto bg-zinc-50">
              {components.length === 0 ? (
                <p className="text-sm text-zinc-500">No components available</p>
              ) : (() => {
                const { groups, ungrouped } = groupComponents(components);

                return (
                  <div className="space-y-4">
                    {/* Render component groups */}
                    {groups.map((group) => {
                      const groupComponents = getComponentsByGroupId(components, group.id);
                      if (groupComponents.length === 0) return null;

                      return (
                        <div key={group.id} className="space-y-2">
                          <div className="text-sm font-semibold text-zinc-900 border-b border-zinc-300 pb-1">
                            {group.name}
                          </div>
                          {groupComponents.map((component) => (
                            <div key={component.id} className="flex items-center gap-2 pl-3">
                              <input
                                type="checkbox"
                                id={`component-${component.id}`}
                                checked={component.id in selectedComponents}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    toggleComponent(component.id, 'partial_outage');
                                  } else {
                                    setSelectedComponents((prev) => {
                                      const updated = { ...prev };
                                      delete updated[component.id];
                                      return updated;
                                    });
                                  }
                                }}
                                className="rounded"
                              />
                              <label htmlFor={`component-${component.id}`} className="flex-1 text-sm text-zinc-900">
                                {component.name}
                              </label>
                              {component.id in selectedComponents && (
                                <select
                                  value={selectedComponents[component.id]}
                                  onChange={(e) =>
                                    toggleComponent(component.id, e.target.value as ComponentStatus)
                                  }
                                  className="text-xs px-2 py-1 border border-zinc-300 rounded text-zinc-900 bg-white"
                                >
                                  <option value="degraded_performance">⚠️ Degraded</option>
                                  <option value="partial_outage">🟠 Partial Outage</option>
                                  <option value="major_outage">🔴 Major Outage</option>
                                  <option value="under_maintenance">🔵 Maintenance</option>
                                </select>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}

                    {/* Render ungrouped components */}
                    {ungrouped.length > 0 && (
                      <div className="space-y-2">
                        {groups.length > 0 && (
                          <div className="text-sm font-semibold text-zinc-900 border-b border-zinc-300 pb-1">
                            Other Components
                          </div>
                        )}
                        {ungrouped.map((component) => (
                          <div key={component.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`component-${component.id}`}
                              checked={component.id in selectedComponents}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  toggleComponent(component.id, 'partial_outage');
                                } else {
                                  setSelectedComponents((prev) => {
                                    const updated = { ...prev };
                                    delete updated[component.id];
                                    return updated;
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <label htmlFor={`component-${component.id}`} className="flex-1 text-sm text-zinc-900">
                              {component.name}
                            </label>
                            {component.id in selectedComponents && (
                              <select
                                value={selectedComponents[component.id]}
                                onChange={(e) =>
                                  toggleComponent(component.id, e.target.value as ComponentStatus)
                                }
                                className="text-xs px-2 py-1 border border-zinc-300 rounded text-zinc-900 bg-white"
                              >
                                <option value="degraded_performance">⚠️ Degraded</option>
                                <option value="partial_outage">🟠 Partial Outage</option>
                                <option value="major_outage">🔴 Major Outage</option>
                                <option value="under_maintenance">🔵 Maintenance</option>
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={deliverNotifications}
                onCheckedChange={(checked) => setDeliverNotifications(checked === true)}
                className="h-5 w-5"
              />
              <span className="text-sm font-medium text-zinc-900 group-hover:text-zinc-700">Send notifications to subscribers</span>
            </label>

            {deliverNotifications && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-orange-900">
                    <strong className="font-semibold">Warning:</strong> This will post a public message to your status page and notify all subscribers.
                  </p>
                </div>
              </div>
            )}

            {!deliverNotifications && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-blue-900">
                    <strong className="font-semibold">Info:</strong> This incident will be created on your status page without sending notifications.
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 mt-8">
            <Button type="button" variant="outline" onClick={onClose} className="px-6 h-11 rounded-lg">
              Cancel
            </Button>
            <Button type="submit" className="px-8 h-11 bg-black hover:bg-zinc-800 text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-all">
              Create Incident
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
