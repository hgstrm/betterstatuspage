'use client';

import { ComponentStatus } from '@/lib/types';
import { useState } from 'react';
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

interface UpdateModalProps {
  isOpen: boolean;
  componentName: string;
  currentStatus: ComponentStatus;
  newStatus: ComponentStatus;
  onConfirm: (createIncident: boolean, incidentMessage?: string) => void;
  onCancel: () => void;
}

export function UpdateModal({
  isOpen,
  componentName,
  currentStatus,
  newStatus,
  onConfirm,
  onCancel,
}: UpdateModalProps) {
  const uiConfig = getUIConfig();
  const statusLabels = uiConfig.labels.componentStatus as Record<ComponentStatus, string>;

  const [updateType, setUpdateType] = useState<'silent' | 'incident'>('silent');
  const [incidentMessage, setIncidentMessage] = useState('');
  const [error, setError] = useState('');
  const [messageViolations, setMessageViolations] = useState<Array<{ original: string; replacement?: string; explanation: string }>>([]);

  const handleConfirm = () => {
    if (updateType === 'incident') {
      if (!incidentMessage.trim()) {
        setError('Please provide an incident message');
        return;
      }
      onConfirm(true, incidentMessage);
    } else {
      onConfirm(false);
    }
    setError('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Component Status</DialogTitle>
          <DialogDescription asChild>
            <div className="p-3 bg-zinc-50 rounded-lg mt-2">
              <p className="text-sm text-zinc-600">Component: <span className="font-semibold text-zinc-900">{componentName}</span></p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-zinc-600">Status:</span>
                <span className="font-medium text-zinc-700">{statusLabels[currentStatus]}</span>
                <span className="text-zinc-400">→</span>
                <span className="font-medium text-zinc-900">{statusLabels[newStatus]}</span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Label className="font-medium text-zinc-900">How would you like to update this?</Label>

          <label className="flex items-start p-3 border-2 rounded-lg cursor-pointer hover:bg-zinc-50 transition-colors">
            <input
              type="radio"
              name="updateType"
              value="silent"
              checked={updateType === 'silent'}
              onChange={(e) => setUpdateType(e.target.value as 'silent')}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-zinc-900">Silent Update</div>
              <div className="text-sm text-zinc-600">
                Update component status without posting a public announcement. No incident will be
                created.
              </div>
              <div className="text-xs text-green-600 font-medium mt-1">
                ✓ Recommended for internal tracking
              </div>
            </div>
          </label>

          <label className="flex items-start p-3 border-2 rounded-lg cursor-pointer hover:bg-zinc-50 transition-colors">
            <input
              type="radio"
              name="updateType"
              value="incident"
              checked={updateType === 'incident'}
              onChange={(e) => setUpdateType(e.target.value as 'incident')}
              className="mt-1 mr-3"
            />
            <div className="flex-1">
              <div className="font-medium text-zinc-900">Create Incident</div>
              <div className="text-sm text-zinc-600 mb-2">
                Post a public update and create an incident. This will notify subscribers.
              </div>
              <div className="text-xs text-orange-600 font-medium mb-2">
                ⚠ This will send public notifications
              </div>

              {updateType === 'incident' && (
                <>
                  <Textarea
                    value={incidentMessage}
                    onChange={(e) => {
                      setIncidentMessage(e.target.value);
                      setError('');
                      setMessageViolations(checkStyleGuide(e.target.value));
                    }}
                    placeholder="Describe what's happening..."
                    className="mt-2"
                    rows={3}
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
                </>
              )}
            </div>
          </label>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
