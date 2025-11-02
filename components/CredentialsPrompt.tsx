'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CredentialsPromptProps {
  onSubmit: (apiKey: string, pageId: string, rememberMe: boolean) => void;
}

export function CredentialsPrompt({ onSubmit }: CredentialsPromptProps) {
  const [apiKey, setApiKey] = useState('');
  const [pageId, setPageId] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim() && pageId.trim()) {
      onSubmit(apiKey.trim(), pageId.trim(), rememberMe);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl">BetterStatuspage</CardTitle>
          <CardDescription>
            Enter your Statuspage credentials to continue. Your credentials will only be stored
            locally in your browser if you choose to remember them.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Statuspage API key"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </Button>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Get your API key from:{' '}
              <a
                href="https://manage.statuspage.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-900 hover:underline"
              >
                manage.statuspage.io
              </a>
            </p>
          </div>

          <div>
            <Label htmlFor="pageId">Page ID</Label>
            <Input
              type="text"
              id="pageId"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              placeholder="Enter your Statuspage Page ID"
              required
            />
            <p className="text-xs text-zinc-500 mt-1">
              Find your Page ID in your statuspage URL or API
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              className="mt-1"
            />
            <label htmlFor="rememberMe" className="text-sm text-zinc-700 cursor-pointer">
              <span className="font-medium">Remember me</span>
              <span className="block text-xs text-zinc-500 mt-0.5">
                Store credentials locally (obfuscated, not encrypted). Only enable this on your
                personal device.
              </span>
            </label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>🔒 Privacy Note:</strong> This application runs entirely in your browser.
              Your credentials are never sent to any third-party servers except Statuspage&apos;s official API.
            </p>
          </div>

          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-zinc-200">
          <details className="text-sm">
            <summary className="font-medium text-zinc-700 cursor-pointer hover:text-zinc-900">
              Advanced: Using Environment Variables or 1Password CLI
            </summary>
            <div className="mt-2 text-xs text-zinc-600 space-y-2">
              <p>
                Instead of entering credentials here, you can set them in <code>.env.local</code>:
              </p>
              <pre className="bg-zinc-100 p-2 rounded overflow-x-auto">
{`NEXT_PUBLIC_STATUSPAGE_API_KEY=your_key_here
NEXT_PUBLIC_STATUSPAGE_PAGE_ID=your_page_id_here`}
              </pre>
              <p className="mt-2">
                Or populate <code>.env.local</code> using 1Password CLI:
              </p>
              <pre className="bg-zinc-100 p-2 rounded overflow-x-auto">
{`cat > .env.local <<EOF
NEXT_PUBLIC_STATUSPAGE_API_KEY=$(op read 'op://vault/item/api_key')
NEXT_PUBLIC_STATUSPAGE_PAGE_ID=$(op read 'op://vault/item/page_id')
EOF`}
              </pre>
              <p className="mt-2">
                Then restart the dev server. See <code>SETUP.md</code> for details.
              </p>
            </div>
          </details>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
