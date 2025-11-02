'use client';

import { Incident, IncidentStatus, IncidentImpact, ComponentStatus } from '@/lib/types';
import { formatDistanceToNow, format } from '@/lib/date-utils';
import { getUIConfig } from '@/lib/ai-config';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface IncidentCardProps {
  incident: Incident;
}

export function IncidentCard({ incident }: IncidentCardProps) {
  const uiConfig = getUIConfig();
  const statusLabels = uiConfig.labels.incidentStatus as Record<IncidentStatus, string>;
  const statusColors = uiConfig.colors.incidentStatus as Record<IncidentStatus, string>;
  const impactLabels = uiConfig.labels.impact as Record<IncidentImpact, string>;
  const impactHeaderColors = uiConfig.colors.incidentImpactHeader as Record<IncidentImpact, string>;
  const componentStatusDotColors = uiConfig.colors.componentStatusDot as Record<ComponentStatus, string>;

  const createdAt = new Date(incident.created_at);
  const updatedAt = new Date(incident.updated_at);
  const createdTimeAgo = formatDistanceToNow(createdAt);
  const updatedTimeAgo = formatDistanceToNow(updatedAt);
  const createdFormatted = format(createdAt, 'HH:mm \'UTC\'');
  const updatedFormatted = format(updatedAt, 'HH:mm \'UTC\'');

  return (
    <Link href={`/incidents/${incident.id}`} className="block group">
      <div className="border border-zinc-200 rounded-lg p-5 hover:border-zinc-300 hover:shadow-md transition-all bg-white relative overflow-hidden">
        {/* Subtle left border for impact */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${impactHeaderColors[incident.impact]}`} />

        <div className="flex items-start justify-between gap-4 ml-3">
          <div className="flex-1 min-w-0">
            {/* Incident Title */}
            <h3 className="text-lg font-semibold text-zinc-900 mb-2 group-hover:text-black transition-colors line-clamp-2">
              {incident.name}
            </h3>

            {/* Timestamps */}
            <div className="flex items-center gap-4 mb-3 text-sm text-zinc-600">
              <span>
                Opened {createdTimeAgo} <span className="text-zinc-400">({createdFormatted})</span>
              </span>
              <span className="text-zinc-300">•</span>
              <span>
                Updated {updatedTimeAgo} <span className="text-zinc-400">({updatedFormatted})</span>
              </span>
            </div>

            {/* Status and Impact */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge variant="outline" className={`${statusColors[incident.status]}`}>
                {statusLabels[incident.status]}
              </Badge>
              <Badge variant="secondary">
                {impactLabels[incident.impact]}
              </Badge>
            </div>

            {/* Component Status Indicators - Only show non-operational components */}
            {incident.components && incident.components.length > 0 && (() => {
              const affectedComponents = incident.components.filter(c => c.status !== 'operational');
              return affectedComponents.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {affectedComponents.map((component) => (
                    <Badge key={component.id} variant="secondary" className="gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${componentStatusDotColors[component.status]}`}
                        aria-label={component.status}
                      />
                      {component.name}
                    </Badge>
                  ))}
                </div>
              ) : null;
            })()}
          </div>

          {/* Arrow indicator */}
          <div className="shrink-0 mt-1">
            <svg className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
