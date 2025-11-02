'use client';

import { Component, ComponentStatus } from '@/lib/types';
import { formatDistanceToNow } from '@/lib/date-utils';
import { getUIConfig } from '@/lib/ai-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ComponentCardProps {
  component: Component;
  onUpdateStatus: (componentId: string, status: ComponentStatus) => void;
  isUpdating?: boolean;
}

export function ComponentCard({ component, onUpdateStatus, isUpdating }: ComponentCardProps) {
  const uiConfig = getUIConfig();
  const statusColors = uiConfig.colors.componentStatus as Record<ComponentStatus, string>;
  const statusLabels = uiConfig.labels.componentStatus as Record<ComponentStatus, string>;
  const statusIcons = uiConfig.icons.componentStatus as Record<ComponentStatus, string>;

  const statuses: ComponentStatus[] = [
    'operational',
    'degraded_performance',
    'partial_outage',
    'major_outage',
    'under_maintenance',
  ];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>{component.name}</CardTitle>
            {component.description && (
              <CardDescription className="mt-1">{component.description}</CardDescription>
            )}
          </div>
          <Badge className={statusColors[component.status]}>
            <span className="mr-1">{statusIcons[component.status]}</span>
            {statusLabels[component.status]}
          </Badge>
        </div>
        {component.updated_at && (
          <p className="text-xs text-zinc-500 mt-2">
            Last updated {formatDistanceToNow(new Date(component.updated_at))}
          </p>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <Button
              key={status}
              onClick={() => onUpdateStatus(component.id, status)}
              disabled={isUpdating || component.status === status}
              variant={component.status === status ? "secondary" : "outline"}
              size="sm"
              title={`Set to ${statusLabels[status]}`}
            >
              {statusIcons[status]} {statusLabels[status]}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
