'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export function TestModeBanner() {
  const [testMode, setTestMode] = useState(false);

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
      // Also listen to custom events for same-tab updates
      window.addEventListener('testModeChanged', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('testModeChanged', handleStorageChange);
      };
    }
  }, []);

  if (!testMode) return null;

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
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50/50 font-medium w-fit shrink-0">
          Test Mode
        </Badge>
        <span className="text-sm text-orange-900">
          All changes will only affect test data and will not be published to your production status page.
        </span>
      </AlertDescription>
    </Alert>
  );
}

