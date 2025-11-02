'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export function DemoModeBanner() {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDemoMode(process.env.NEXT_PUBLIC_PREVIEW_DEMO_MODE === 'true');
    }
  }, []);

  if (!isDemoMode) return null;

  return (
    <Alert variant="warning" className="mb-6">
      <svg
        className="h-4 w-4 text-orange-600 shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50/50 font-medium w-fit shrink-0">
          Demo Mode
        </Badge>
        <div className="flex-1">
          <span className="text-sm text-orange-900">
            This is a public demo instance. All changes are real but automatically cleaned up every 5 minutes.
          </span>
          <div className="text-xs text-orange-700 mt-1">
            • Only Chrome AI available • Items auto-deleted every 5 minutes
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

