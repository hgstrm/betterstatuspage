/**
 * Lightweight date formatting utilities (replaces date-fns)
 */

/**
 * Format relative time like "5 minutes ago", "2 hours ago", etc.
 */
export function formatDistanceToNow(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}

/**
 * Format date as "MMM d, yyyy 'at' h:mm a" (e.g., "Jan 15, 2025 at 3:45 PM")
 * or "HH:mm 'UTC'" (e.g., "15:30 UTC")
 */
export function format(date: Date | string, formatStr: string): string {
  const d = new Date(date);

  // Format: "MMM d, yyyy 'at' h:mm a"
  if (formatStr === "MMM d, yyyy 'at' h:mm a") {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    const minutes = d.getMinutes().toString().padStart(2, '0');

    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${hour12}:${minutes} ${ampm}`;
  }

  // Format: "HH:mm 'UTC'"
  if (formatStr === "HH:mm 'UTC'") {
    const hours = d.getUTCHours().toString().padStart(2, '0');
    const minutes = d.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes} UTC`;
  }

  // Fallback to ISO string
  return d.toISOString();
}
