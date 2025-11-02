'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAPIClient } from '@/lib/statuspage-api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Banner } from '@/components/Banner';
import { TestModeBanner } from '@/components/TestModeBanner';
import { DemoModeBanner } from '@/components/DemoModeBanner';

interface ConfigData {
  ai: {
    systemPrompt: string;
    styleGuidelines: string[];
    examples: Array<{ input: string; output: string }>;
    bannedWords: Array<{ word: string; replacement: string }>;
    productNames: Array<{ incorrect: string[]; correct: string }>;
  };
  styleGuide: {
    description: string;
    rules: Array<{
      original: string;
      replacement?: string;
      explanation: string;
      caseSensitive: boolean;
    }>;
  };
  banner: {
    enabled: boolean;
    message: string;
    variant: string;
  };
  aiGateway: {
    defaultModel: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    training: {
      enabled: boolean;
      statuspageUrl: string;
      maxExamples: number;
    };
  };
  chromeAI: {
    temperature: number;
    suggestTemperature: number;
    topK: number;
    maxStyleRules: number;
    maxStyleGuidelines: number;
    training: {
      enabled: boolean;
      statuspageUrl: string;
      maxExamples: number;
    };
  };
  localAI: {
    wordReplacements: Array<{ pattern: string; replacement: string; flags: string }>;
    phraseReplacements: Array<{ pattern: string; replacement: string; flags: string }>;
    minMessageLength: number;
    improvementSuggestions: {
      outage: string;
      contractions: string;
      context: string;
      detail: string;
      punctuation: string;
    };
  };
  ui: {
    defaults: {
      incidentStatus: string;
      incidentImpact: string;
    };
    labels: {
      impact: Record<string, string>;
      incidentStatus: Record<string, string>;
      componentStatus: Record<string, string>;
    };
    colors: {
      incidentStatus: Record<string, string>;
      incidentImpact: Record<string, string>;
      incidentImpactHeader: Record<string, string>;
      componentStatus: Record<string, string>;
      componentStatusDot: Record<string, string>;
    };
    icons: {
      componentStatus: Record<string, string>;
    };
  };
}

interface Template {
  id?: string;
  template_id?: string;
  name: string;
  body: string;
  status?: string;
  [key: string]: unknown;
}

export default function ConfigPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isWritable, setIsWritable] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editedTemplates, setEditedTemplates] = useState<Record<string, Template>>({});
  const [newTemplate, setNewTemplate] = useState<Template | null>(null);
  const apiClient = getAPIClient();

  // Check authentication
  useEffect(() => {
    async function checkAuth() {
      const { authenticated } = await apiClient.checkSession();
      if (!authenticated) {
        const requiresPassword = !!process.env.NEXT_PUBLIC_BACKUP_PASSWORD || !!process.env.BACKUP_PASSWORD;
        if (!requiresPassword) {
          const result = await apiClient.createSession();
          setIsAuthenticated(result.success === true);
        } else {
          setIsAuthenticated(false);
          router.push('/dashboard');
        }
      } else {
        setIsAuthenticated(authenticated);
      }
      setIsLoading(false);
    }
    checkAuth();
  }, [apiClient, router]);

  // Load config
  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadConfig() {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to load config');
        const data = await response.json();
        setConfig(data.config);
        setIsWritable(data.writable ?? false);
      } catch {
        toast.error('Failed to load config');
        console.error('Failed to load config');
      }
    }

    loadConfig();
  }, [isAuthenticated]);

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 423) {
          // Filesystem is read-only
          toast.error(data.message || 'Config cannot be saved in this environment');
          toast.info('Please download the config file and commit it to git');
        } else {
          throw new Error(data.error || 'Failed to save config');
        }
        return;
      }

      toast.success('Config saved successfully');
      setHasChanges(false);
      
      // Reload page to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      toast.error('Failed to save config');
      console.error('Failed to save config');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!config) return;

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updateConfig = (path: string[], value: unknown) => {
    if (!config) return;

    const newConfig = { ...config };
    let current: Record<string, unknown> = newConfig;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...(current[path[i]] as Record<string, unknown>) };
      current = current[path[i]] as Record<string, unknown>;
    }
    
    current[path[path.length - 1]] = value;
    setConfig(newConfig);
    setHasChanges(true);
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

  if (!isAuthenticated || !config) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 sticky top-0 z-30 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              ← Back to Dashboard
            </Button>
            <h1 className="text-base font-semibold text-zinc-900">Configuration Editor</h1>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-sm text-orange-600">Unsaved changes</span>
            )}
            <Button variant="outline" onClick={handleDownload} disabled={isSaving}>
              Download JSON
            </Button>
            {isWritable ? (
              <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
                {isSaving ? 'Saving...' : 'Save Config'}
              </Button>
            ) : (
              <Button onClick={handleDownload} disabled={isSaving}>
                Download & Commit
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Banner />
        <DemoModeBanner />
        <TestModeBanner />
        
        <div className="mb-6">
          {!isWritable && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> In production/serverless environments, <code className="px-1.5 py-0.5 bg-yellow-100 rounded">config.json</code> is read-only. 
                Edit your configuration below and click &quot;Download JSON&quot; to save the file. Then commit it to your repository.
              </p>
            </div>
          )}
          <p className="text-sm text-zinc-600">
            {isWritable 
              ? 'Edit your configuration below. Click &quot;Save Config&quot; to write changes to config.json.'
              : 'Edit your configuration below. When ready, download the config file and commit it to your repository.'
            }
          </p>
        </div>

        <Tabs defaultValue="ai" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="ui">UI</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="local">Local AI</TabsTrigger>
            <TabsTrigger value="banner">Banner</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Gateway Configuration</CardTitle>
                <CardDescription>Settings for AI Gateway (OpenAI/Anthropic)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="aiGateway.defaultModel">Default Model</Label>
                  <Input
                    id="aiGateway.defaultModel"
                    value={config.aiGateway?.defaultModel || ''}
                    onChange={(e) => updateConfig(['aiGateway', 'defaultModel'], e.target.value)}
                    placeholder="openai/gpt-3.5-turbo"
                  />
                </div>
                <div>
                  <Label htmlFor="aiGateway.temperature">Temperature</Label>
                  <Input
                    id="aiGateway.temperature"
                    type="number"
                    step="0.1"
                    value={config.aiGateway?.temperature || 0.7}
                    onChange={(e) => updateConfig(['aiGateway', 'temperature'], parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="aiGateway.maxTokens">Max Tokens</Label>
                  <Input
                    id="aiGateway.maxTokens"
                    type="number"
                    value={config.aiGateway?.maxTokens || 500}
                    onChange={(e) => updateConfig(['aiGateway', 'maxTokens'], parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="aiGateway.systemPrompt">System Prompt</Label>
                  <Textarea
                    id="aiGateway.systemPrompt"
                    value={config.aiGateway?.systemPrompt || ''}
                    onChange={(e) => updateConfig(['aiGateway', 'systemPrompt'], e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold mb-4">Training Configuration</h3>
                  <p className="text-sm text-zinc-600 mb-4">
                    Train the AI on a reference Statuspage to match its writing style. The AI will fetch recent incident updates from the specified Statuspage and use them as examples.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="aiGateway.training.enabled"
                        checked={config.aiGateway?.training?.enabled || false}
                        onChange={(e) => updateConfig(['aiGateway', 'training', 'enabled'], e.target.checked)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="aiGateway.training.enabled" className="cursor-pointer">
                        Enable training on reference Statuspage
                      </Label>
                    </div>
                    {config.aiGateway?.training?.enabled && (
                      <>
                        <div>
                          <Label htmlFor="aiGateway.training.statuspageUrl">Statuspage URL</Label>
                          <Input
                            id="aiGateway.training.statuspageUrl"
                            value={config.aiGateway?.training?.statuspageUrl || ''}
                            onChange={(e) => updateConfig(['aiGateway', 'training', 'statuspageUrl'], e.target.value)}
                            placeholder="https://example.statuspage.io or https://status.example.com"
                          />
                          <p className="text-xs text-zinc-500 mt-1">
                            Enter the full URL to your statuspage (e.g., https://example.statuspage.io or https://status.example.com)
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="aiGateway.training.maxExamples">Max Examples</Label>
                          <Input
                            id="aiGateway.training.maxExamples"
                            type="number"
                            value={config.aiGateway?.training?.maxExamples || 5}
                            onChange={(e) => updateConfig(['aiGateway', 'training', 'maxExamples'], parseInt(e.target.value))}
                          />
                          <p className="text-xs text-zinc-500 mt-1">
                            Number of example updates to fetch from the reference Statuspage
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Chrome AI Configuration</CardTitle>
                <CardDescription>Settings for Chrome built-in AI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="chromeAI.temperature">Temperature</Label>
                  <Input
                    id="chromeAI.temperature"
                    type="number"
                    step="0.1"
                    value={config.chromeAI?.temperature || 0.7}
                    onChange={(e) => updateConfig(['chromeAI', 'temperature'], parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="chromeAI.topK">TopK</Label>
                  <Input
                    id="chromeAI.topK"
                    type="number"
                    value={config.chromeAI?.topK || 40}
                    onChange={(e) => updateConfig(['chromeAI', 'topK'], parseInt(e.target.value))}
                  />
                </div>
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold mb-4">Training Configuration</h3>
                  <p className="text-sm text-zinc-600 mb-4">
                    Train the AI on a reference Statuspage to match its writing style. The AI will fetch recent incident updates from the specified Statuspage and use them as examples.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="chromeAI.training.enabled"
                        checked={config.chromeAI?.training?.enabled || false}
                        onChange={(e) => updateConfig(['chromeAI', 'training', 'enabled'], e.target.checked)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="chromeAI.training.enabled" className="cursor-pointer">
                        Enable training on reference Statuspage
                      </Label>
                    </div>
                    {config.chromeAI?.training?.enabled && (
                      <>
                        <div>
                          <Label htmlFor="chromeAI.training.statuspageUrl">Statuspage URL</Label>
                          <Input
                            id="chromeAI.training.statuspageUrl"
                            value={config.chromeAI?.training?.statuspageUrl || ''}
                            onChange={(e) => updateConfig(['chromeAI', 'training', 'statuspageUrl'], e.target.value)}
                            placeholder="https://example.statuspage.io or https://status.example.com"
                          />
                          <p className="text-xs text-zinc-500 mt-1">
                            Enter the full URL to your statuspage (e.g., https://example.statuspage.io or https://status.example.com)
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="chromeAI.training.maxExamples">Max Examples</Label>
                          <Input
                            id="chromeAI.training.maxExamples"
                            type="number"
                            value={config.chromeAI?.training?.maxExamples || 5}
                            onChange={(e) => updateConfig(['chromeAI', 'training', 'maxExamples'], parseInt(e.target.value))}
                          />
                          <p className="text-xs text-zinc-500 mt-1">
                            Number of example updates to fetch from the reference Statuspage
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ui" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Default Values</CardTitle>
                <CardDescription>Default selections for new incidents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="ui.defaults.incidentStatus">Default Incident Status</Label>
                  <Input
                    id="ui.defaults.incidentStatus"
                    value={config.ui?.defaults?.incidentStatus || ''}
                    onChange={(e) => updateConfig(['ui', 'defaults', 'incidentStatus'], e.target.value)}
                    placeholder="investigating"
                  />
                </div>
                <div>
                  <Label htmlFor="ui.defaults.incidentImpact">Default Incident Impact</Label>
                  <Input
                    id="ui.defaults.incidentImpact"
                    value={config.ui?.defaults?.incidentImpact || ''}
                    onChange={(e) => updateConfig(['ui', 'defaults', 'incidentImpact'], e.target.value)}
                    placeholder="minor"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Labels</CardTitle>
                <CardDescription>UI labels for statuses and impacts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Impact Labels</Label>
                  <div className="mt-2 space-y-2">
                    {Object.entries(config.ui?.labels?.impact || {}).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <Input
                          value={key}
                          disabled
                          className="w-24 font-mono text-sm"
                        />
                        <Input
                          value={value as string}
                          onChange={(e) => {
                            const newLabels = { ...config.ui.labels.impact };
                            newLabels[key] = e.target.value;
                            updateConfig(['ui', 'labels', 'impact'], newLabels);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Incident Templates</CardTitle>
                    <CardDescription>Manage templates from your Statuspage</CardDescription>
                  </div>
                  <Button
                    onClick={async () => {
                      setNewTemplate({
                        name: '',
                        body: '',
                        update_status: 'investigating',
                      });
                    }}
                  >
                    + New Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setIsLoadingTemplates(true);
                      try {
                        const result = await apiClient.getTemplates();
                        if (result.data) {
                          const templateArray = Array.isArray(result.data) 
                            ? result.data 
                            : (result.data as { incident_templates?: Template[] }).incident_templates || [];
                          setTemplates(templateArray);
                          toast.success(`Loaded ${templateArray.length} template(s)`);
                        } else if (result.error) {
                          toast.error(result.error);
                        }
                      } catch {
                        toast.error('Failed to load templates');
                      } finally {
                        setIsLoadingTemplates(false);
                      }
                    }}
                    disabled={isLoadingTemplates}
                  >
                    {isLoadingTemplates ? 'Loading...' : 'Refresh Templates'}
                  </Button>
                </div>

                {newTemplate && (
                  <Card className="mb-4 border-2 border-zinc-300">
                    <CardHeader>
                      <CardTitle className="text-lg">New Template</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                          placeholder="Template name"
                        />
                      </div>
                      <div>
                        <Label>Body</Label>
                        <Textarea
                          value={newTemplate.body}
                          onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                          rows={4}
                          placeholder="Template message body"
                        />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <select
                          value={(newTemplate?.update_status as string) || 'investigating'}
                          onChange={(e) => setNewTemplate({ ...newTemplate, update_status: e.target.value } as Template)}
                          className="w-full px-3 py-2 border border-zinc-300 rounded-md"
                        >
                          <option value="investigating">Investigating</option>
                          <option value="identified">Identified</option>
                          <option value="monitoring">Monitoring</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={async () => {
                            if (!newTemplate.name || !newTemplate.body) {
                              toast.error('Name and body are required');
                              return;
                            }
                            try {
                              const result = await apiClient.createTemplate(newTemplate);
                              if (result.data) {
                                toast.success('Template created');
                                setTemplates([...templates, result.data as Template]);
                                setNewTemplate(null);
                              } else if (result.error) {
                                toast.error(result.error);
                              }
                            } catch {
                              toast.error('Failed to create template');
                            }
                          }}
                        >
                          Create Template
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setNewTemplate(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-4">
                  {templates.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-8">
                      No templates found. Click &quot;Refresh Templates&quot; to load from Statuspage or create a new one.
                    </p>
                  ) : (
                    templates.map((template: Template) => {
                      const id = template.id || (template as { template_id?: string }).template_id || '';
                      const isEditing = editingTemplateId === id;
                      const editedTemplate = editedTemplates[id] || template;

                      return (
                        <Card key={id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">
                                {template.name || (template as { title?: string }).title || `Template ${id}`}
                              </CardTitle>
                              <div className="flex gap-2">
                                {isEditing ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          const result = await apiClient.updateTemplate(id, editedTemplate);
                                          if (result.data) {
                                            toast.success('Template updated');
                                            setTemplates(templates.map(t => 
                                              (t.id || (t as { template_id?: string }).template_id) === id ? (result.data as Template) : t
                                            ).filter((t): t is Template => t !== undefined));
                                            const newEdited = { ...editedTemplates };
                                            delete newEdited[id];
                                            setEditedTemplates(newEdited);
                                            setEditingTemplateId(null);
                                          } else if (result.error) {
                                            toast.error(result.error);
                                          }
                                        } catch {
                                          toast.error('Failed to update template');
                                        }
                                      }}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const newEdited = { ...editedTemplates };
                                        delete newEdited[id];
                                        setEditedTemplates(newEdited);
                                        setEditingTemplateId(null);
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditedTemplates({ ...editedTemplates, [id]: { ...template } });
                                        setEditingTemplateId(id);
                                      }}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        if (confirm('Are you sure you want to delete this template?')) {
                                          try {
                                            const result = await apiClient.deleteTemplate(id);
                                            if (result.success) {
                                              toast.success('Template deleted');
                                              setTemplates(templates.filter(t => 
                                                (t.id || (t as { template_id?: string }).template_id) !== id
                                              ));
                                            } else if (result.error) {
                                              toast.error(result.error);
                                            }
                                          } catch {
                                            toast.error('Failed to delete template');
                                          }
                                        }
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {isEditing ? (
                              <>
                                <div>
                                  <Label>Name</Label>
                                  <Input
                                    value={editedTemplate.name || (editedTemplate as { title?: string }).title || ''}
                                    onChange={(e) => setEditedTemplates({ ...editedTemplates, [id]: { ...editedTemplate, name: e.target.value } as Template })}
                                  />
                                </div>
                                <div>
                                  <Label>Body</Label>
                                  <Textarea
                                    value={(editedTemplate.body || (editedTemplate as { message?: string; text?: string }).message || (editedTemplate as { message?: string; text?: string }).text || '') as string}
                                    onChange={(e) => setEditedTemplates({ ...editedTemplates, [id]: { ...editedTemplate, body: e.target.value } as Template })}
                                    rows={4}
                                  />
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <select
                                    value={(editedTemplate.update_status as string) || 'investigating'}
                                    onChange={(e) => setEditedTemplates({ ...editedTemplates, [id]: { ...editedTemplate, update_status: e.target.value } as Template })}
                                    className="w-full px-3 py-2 border border-zinc-300 rounded-md"
                                  >
                                    <option value="investigating">Investigating</option>
                                    <option value="identified">Identified</option>
                                    <option value="monitoring">Monitoring</option>
                                    <option value="resolved">Resolved</option>
                                  </select>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <Label className="text-xs text-zinc-500">Status</Label>
                                  <p className="text-sm capitalize">{(template.update_status as string) || (template.status as string) || 'N/A'}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-zinc-500">Body</Label>
                                  <p className="text-sm whitespace-pre-wrap">
                                    {template.body || (template as { message?: string; text?: string }).message || (template as { message?: string; text?: string }).text || 'No content'}
                                  </p>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="local">
            <Card>
              <CardHeader>
                <CardTitle>Local AI Configuration</CardTitle>
                <CardDescription>Rule-based text improvements</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-600 mb-6">
                  Local AI uses pattern matching to improve messages. Edit word and phrase replacements below.
                </p>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Word Replacements</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newReplacements = [...(config.localAI?.wordReplacements || [])];
                          newReplacements.push({ pattern: '', replacement: '', flags: 'gi' });
                          updateConfig(['localAI', 'wordReplacements'], newReplacements);
                        }}
                      >
                        + Add Word Replacement
                      </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="grid grid-cols-[2fr_2fr_100px_60px] gap-2 p-2 bg-zinc-50 border-b font-semibold text-sm text-zinc-700">
                        <div>Pattern</div>
                        <div>Replacement</div>
                        <div className="flex items-center gap-1">
                          <span>Flags</span>
                          <span className="text-xs font-normal text-zinc-500" title="g = global (all matches), i = case-insensitive">(g/i)</span>
                        </div>
                        <div></div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {(config.localAI?.wordReplacements || []).map((replacement: { pattern: string; replacement: string; flags: string }, index: number) => {
                          // Extract pattern without word boundaries for display
                          const displayPattern = replacement.pattern.replace(/^\\b|\\b$/g, '');
                          const hasWordBoundaries = replacement.pattern.startsWith('\\b') && replacement.pattern.endsWith('\\b');
                          
                          return (
                          <div key={index} className="grid grid-cols-[2fr_2fr_100px_60px] gap-2 p-2 border-b hover:bg-zinc-50 items-center">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Input
                                value={displayPattern}
                                onChange={(e) => {
                                  const newReplacements = [...(config.localAI?.wordReplacements || [])];
                                  // Re-add word boundaries if they were there before
                                  const newPattern = hasWordBoundaries 
                                    ? `\\b${e.target.value}\\b`
                                    : e.target.value;
                                  newReplacements[index].pattern = newPattern;
                                  updateConfig(['localAI', 'wordReplacements'], newReplacements);
                                }}
                                placeholder="pattern"
                                className="font-mono text-sm flex-1"
                                title="Regex pattern"
                              />
                              <label className="flex items-center gap-1 text-xs text-zinc-600 cursor-pointer whitespace-nowrap shrink-0">
                                <input
                                  type="checkbox"
                                  checked={hasWordBoundaries}
                                  onChange={(e) => {
                                    const newReplacements = [...(config.localAI?.wordReplacements || [])];
                                    const currentPattern = displayPattern;
                                    newReplacements[index].pattern = e.target.checked
                                      ? `\\b${currentPattern}\\b`
                                      : currentPattern;
                                    updateConfig(['localAI', 'wordReplacements'], newReplacements);
                                  }}
                                  className="w-3 h-3"
                                />
                                <span>WB</span>
                              </label>
                            </div>
                            <Input
                              value={replacement.replacement}
                              onChange={(e) => {
                                const newReplacements = [...(config.localAI?.wordReplacements || [])];
                                newReplacements[index].replacement = e.target.value;
                                updateConfig(['localAI', 'wordReplacements'], newReplacements);
                              }}
                              placeholder="replacement text"
                            />
                            <div className="flex flex-col gap-1">
                              <Input
                                value={replacement.flags}
                                onChange={(e) => {
                                  const newReplacements = [...(config.localAI?.wordReplacements || [])];
                                  newReplacements[index].flags = e.target.value;
                                  updateConfig(['localAI', 'wordReplacements'], newReplacements);
                                }}
                                placeholder="gi"
                                className="font-mono text-sm text-center"
                                maxLength={5}
                                title="g = global (all matches), i = case-insensitive"
                              />
                              <span className="text-xs text-zinc-500 text-center">g = all, i = ignore case</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newReplacements = [...(config.localAI?.wordReplacements || [])];
                                newReplacements.splice(index, 1);
                                updateConfig(['localAI', 'wordReplacements'], newReplacements);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Phrase Replacements</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newReplacements = [...(config.localAI?.phraseReplacements || [])];
                          newReplacements.push({ pattern: '', replacement: '', flags: 'gi' });
                          updateConfig(['localAI', 'phraseReplacements'], newReplacements);
                        }}
                      >
                        + Add Phrase Replacement
                      </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="grid grid-cols-[2fr_2fr_100px_60px] gap-2 p-2 bg-zinc-50 border-b font-semibold text-sm text-zinc-700">
                        <div>Pattern</div>
                        <div>Replacement</div>
                        <div className="flex items-center gap-1">
                          <span>Flags</span>
                          <span className="text-xs font-normal text-zinc-500" title="g = global (all matches), i = case-insensitive">(g/i)</span>
                        </div>
                        <div></div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {(config.localAI?.phraseReplacements || []).map((replacement: { pattern: string; replacement: string; flags: string }, index: number) => {
                          // Extract pattern without word boundaries for display
                          const displayPattern = replacement.pattern.replace(/^\\b|\\b$/g, '');
                          const hasWordBoundaries = replacement.pattern.startsWith('\\b') && replacement.pattern.endsWith('\\b');
                          
                          return (
                          <div key={index} className="grid grid-cols-[2fr_2fr_100px_60px] gap-2 p-2 border-b hover:bg-zinc-50 items-center">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Input
                                value={displayPattern}
                                onChange={(e) => {
                                  const newReplacements = [...(config.localAI?.phraseReplacements || [])];
                                  // Re-add word boundaries if they were there before
                                  const newPattern = hasWordBoundaries 
                                    ? `\\b${e.target.value}\\b`
                                    : e.target.value;
                                  newReplacements[index].pattern = newPattern;
                                  updateConfig(['localAI', 'phraseReplacements'], newReplacements);
                                }}
                                placeholder="pattern"
                                className="font-mono text-sm flex-1"
                                title="Regex pattern"
                              />
                              <label className="flex items-center gap-1 text-xs text-zinc-600 cursor-pointer whitespace-nowrap shrink-0">
                                <input
                                  type="checkbox"
                                  checked={hasWordBoundaries}
                                  onChange={(e) => {
                                    const newReplacements = [...(config.localAI?.phraseReplacements || [])];
                                    const currentPattern = displayPattern;
                                    newReplacements[index].pattern = e.target.checked
                                      ? `\\b${currentPattern}\\b`
                                      : currentPattern;
                                    updateConfig(['localAI', 'phraseReplacements'], newReplacements);
                                  }}
                                  className="w-3 h-3"
                                />
                                <span>WB</span>
                              </label>
                            </div>
                            <Input
                              value={replacement.replacement}
                              onChange={(e) => {
                                const newReplacements = [...(config.localAI?.phraseReplacements || [])];
                                newReplacements[index].replacement = e.target.value;
                                updateConfig(['localAI', 'phraseReplacements'], newReplacements);
                              }}
                              placeholder="replacement text"
                            />
                            <div className="flex flex-col gap-1">
                              <Input
                                value={replacement.flags}
                                onChange={(e) => {
                                  const newReplacements = [...(config.localAI?.phraseReplacements || [])];
                                  newReplacements[index].flags = e.target.value;
                                  updateConfig(['localAI', 'phraseReplacements'], newReplacements);
                                }}
                                placeholder="gi"
                                className="font-mono text-sm text-center"
                                maxLength={5}
                                title="g = global (all matches), i = case-insensitive"
                              />
                              <span className="text-xs text-zinc-500 text-center">g = all, i = ignore case</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newReplacements = [...(config.localAI?.phraseReplacements || [])];
                                newReplacements.splice(index, 1);
                                updateConfig(['localAI', 'phraseReplacements'], newReplacements);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="localAI.minMessageLength">Minimum Message Length</Label>
                    <Input
                      id="localAI.minMessageLength"
                      type="number"
                      value={config.localAI?.minMessageLength || 50}
                      onChange={(e) => updateConfig(['localAI', 'minMessageLength'], parseInt(e.target.value) || 50)}
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Messages shorter than this will have context added automatically
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="banner">
            <Card>
              <CardHeader>
                <CardTitle>Banner Configuration</CardTitle>
                <CardDescription>Top banner message settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="banner.enabled">Enabled</Label>
                  <select
                    id="banner.enabled"
                    value={config.banner?.enabled ? 'true' : 'false'}
                    onChange={(e) => updateConfig(['banner', 'enabled'], e.target.value === 'true')}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="banner.message">Message</Label>
                  <Textarea
                    id="banner.message"
                    value={config.banner?.message || ''}
                    onChange={(e) => updateConfig(['banner', 'message'], e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="banner.variant">Variant</Label>
                  <select
                    id="banner.variant"
                    value={config.banner?.variant || 'info'}
                    onChange={(e) => updateConfig(['banner', 'variant'], e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="destructive">Destructive</option>
                    <option value="success">Success</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="json">
            <Card>
              <CardHeader>
                <CardTitle>JSON View</CardTitle>
                <CardDescription>View and edit the raw JSON configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={JSON.stringify(config, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setConfig(parsed);
                      setHasChanges(true);
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  rows={30}
                  className="font-mono text-sm"
                  placeholder="Loading config..."
                />
                <p className="text-xs text-zinc-500 mt-2">
                  Edit the JSON directly. Invalid JSON will be ignored.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

