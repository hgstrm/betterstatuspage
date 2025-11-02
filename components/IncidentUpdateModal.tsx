'use client';

import { useState } from 'react';
import { Component, ComponentStatus, Incident, IncidentStatus } from '@/lib/types';
import { checkStyleGuide } from '@/lib/style-guide';
import { getUIConfig } from '@/lib/ai-config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

interface IncidentUpdateModalProps {
  isOpen: boolean;
  incident: Incident | null;
  components: Component[];
  onClose: () => void;
  onUpdate: (incidentId: string, status: IncidentStatus, message: string, componentUpdates?: Record<string, ComponentStatus>) => void;
  mode: 'status' | 'message';
}

export function IncidentUpdateModal({
  isOpen,
  incident,
  components,
  onClose,
  onUpdate,
  mode,
}: IncidentUpdateModalProps) {
  const uiConfig = getUIConfig();
  const statusLabels = uiConfig.labels.incidentStatus as Record<IncidentStatus, string>;
  const componentStatusLabels = uiConfig.labels.componentStatus as Record<ComponentStatus, string>;
  const defaultStatus = uiConfig.defaults.incidentStatus as IncidentStatus;

  const [status, setStatus] = useState<IncidentStatus>(incident?.status || defaultStatus);
  const [message, setMessage] = useState('');
  const [sendNotifications, setSendNotifications] = useState(true);
  const [error, setError] = useState('');
  const [messageViolations, setMessageViolations] = useState<Array<{ original: string; replacement?: string; explanation: string }>>([]);
  const [componentStatuses, setComponentStatuses] = useState<Record<string, ComponentStatus>>(() => {
    const initial: Record<string, ComponentStatus> = {};
    components.forEach(c => {
      initial[c.id] = c.status;
    });
    return initial;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!incident) return;

    if (!message.trim()) {
      setError('Please provide an update message');
      return;
    }
    setError('');

    onUpdate(incident.id, status, message.trim(), componentStatuses);
    setMessage('');
  };

  const handleClose = () => {
    setMessage('');
    if (incident) {
      setStatus(incident.status);
    }
    onClose();
  };

  const handleComponentStatusChange = (componentId: string, newStatus: ComponentStatus) => {
    setComponentStatuses((prev) => ({
      ...prev,
      [componentId]: newStatus,
    }));
  };

  if (!incident) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{incident.name}</DialogTitle>
          <DialogDescription>
            {mode === 'status' ? 'Update incident status' : 'Post an update'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Message */}
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError('');
                const violations = checkStyleGuide(e.target.value);
                console.log('Style violations found:', violations);
                setMessageViolations(violations);
              }}
              placeholder="We are continuing to investigate this issue."
              rows={4}
              required
            />
            {messageViolations.length > 0 && (
              <div className="mt-2 p-3 bg-red-50 border border-red-300 rounded-lg space-y-2">
                {messageViolations.map((violation, index) => (
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

          {/* Components affected */}
          <div>
            <Label className="mb-3">Components affected</Label>
            <div className="space-y-2 bg-zinc-50 rounded-lg p-4 border border-zinc-200">
              {components.map((component) => (
                <div key={component.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-zinc-900">{component.name}</span>
                  <Select
                    value={componentStatuses[component.id] || component.status}
                    onValueChange={(value) => handleComponentStatusChange(component.id, value as ComponentStatus)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(componentStatusLabels) as ComponentStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {componentStatusLabels[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Status selection for status mode */}
          {mode === 'status' && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Incident Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as IncidentStatus)}
                className="w-full px-3 py-2 border border-zinc-300 rounded focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
              >
                {(Object.keys(statusLabels) as IncidentStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notifications */}
          <div className="border-t pt-6">
            <Label className="mb-3">Notifications</Label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={sendNotifications}
                onCheckedChange={(checked) => setSendNotifications(checked === true)}
              />
              <span className="text-sm text-zinc-700">Send notifications</span>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <DialogFooter className="pt-6 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              Update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
