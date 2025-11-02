import { redirect } from 'next/navigation';

export default function Home() {
  // Check if demo mode requires authentication
  const isDemoMode = process.env.NEXT_PUBLIC_PREVIEW_DEMO_MODE === 'true';
  const demoKey = process.env.DEMO_ACCESS_KEY;
  
  // In demo mode with key, redirect to login if not authenticated
  if (isDemoMode && demoKey) {
    // If demo key is set, authentication is handled by middleware
    // Just redirect to dashboard - middleware will handle auth check
    redirect('/dashboard');
  }
  
  // Normal redirect
  redirect('/dashboard');
}
