'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LoginPromptProps {
  onSubmit: (password?: string) => void;
  requiresPassword?: boolean;
}

export function LoginPrompt({ onSubmit, requiresPassword = false }: LoginPromptProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requiresPassword) {
      onSubmit(password.trim());
    } else {
      onSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl">BetterStatuspage</CardTitle>
          <CardDescription>
            {requiresPassword
              ? 'This instance is password protected. Please enter the password to continue.'
              : 'Welcome to BetterStatuspage. Your API keys are securely stored on the server.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {requiresPassword ? (
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-600 space-y-2">
                <p>✅ API keys are stored securely on the server</p>
                <p>✅ No sensitive data is exposed to the browser</p>
                <p>✅ All API calls are proxied through secure endpoints</p>
              </div>
            )}

            <Button type="submit" className="w-full">
              {requiresPassword ? 'Sign In' : 'Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}