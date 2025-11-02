import { Component, CachedState, CachedStateSchema, Page } from './types';

const CACHE_KEY = 'statuspage_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class CacheManager {
  /**
   * Save components to localStorage for offline access
   */
  static saveToCache(components: Component[], pageInfo?: Page): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheData: CachedState = {
        components,
        lastUpdated: new Date().toISOString(),
        pageInfo,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to save to cache:', error);
    }
  }

  /**
   * Load components from localStorage
   */
  static loadFromCache(): CachedState | null {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const parsed = CachedStateSchema.safeParse(JSON.parse(cached));
      if (!parsed.success) {
        console.error('Invalid cache data');
        return null;
      }

      // Check if cache is too old
      const cacheAge = Date.now() - new Date(parsed.data.lastUpdated).getTime();
      if (cacheAge > CACHE_DURATION) {
        return parsed.data; // Return it anyway for offline mode, but mark as stale
      }

      return parsed.data;
    } catch (error) {
      console.error('Failed to load from cache:', error);
      return null;
    }
  }

  /**
   * Clear the cache
   */
  static clearCache(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Export current state as JSON file
   */
  static exportAsJson(components: Component[], pageInfo?: Page): void {
    const data: CachedState = {
      components,
      lastUpdated: new Date().toISOString(),
      pageInfo,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statuspage-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import state from JSON file
   */
  static async importFromJson(file: File): Promise<CachedState | null> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const parsed = CachedStateSchema.safeParse(data);

      if (!parsed.success) {
        throw new Error('Invalid backup file format');
      }

      return parsed.data;
    } catch (error) {
      console.error('Failed to import backup:', error);
      throw error;
    }
  }
}
