'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function DemoLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    // Check if already authenticated by checking cookie
    if (typeof document !== 'undefined') {
      // Cookie is httpOnly, so we can't check it client-side
      // Just proceed - middleware will handle auth check
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Redirect with demo key as query parameter
      const url = new URL(redirectPath, window.location.origin);
      url.searchParams.set('demo', key);
      window.location.href = url.toString();
    } catch {
      setError('Invalid access key');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Demo Access</CardTitle>
          <CardDescription>
            Enter the demo access key to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Demo access key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={!key.trim() || isLoading}
            >
              {isLoading ? 'Verifying...' : 'Access Demo'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DemoLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-300 border-t-zinc-600 mx-auto"></div>
          <p className="mt-3 text-xs text-zinc-500">Loading...</p>
        </div>
      </div>
    }>
      <DemoLoginForm />
    </Suspense>
  );
}

