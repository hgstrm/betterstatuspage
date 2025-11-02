'use client';

import configData from '../config.json';

/**
 * Configuration manager that supports multiple methods for API key retrieval:
 * 1. Environment variables (NEXT_PUBLIC_* - for hosting platforms or local .env.local)
 * 2. Runtime prompt with localStorage (for local use without files)
 *
 * Note: Use 1Password CLI to populate .env.local, not at runtime
 */

interface Config {
  apiKey: string | null;
  pageId: string | null;
  password: string | null;
}

interface BannerConfig {
  enabled: boolean;
  message: string;
  variant?: 'default' | 'destructive' | 'warning' | 'info' | 'success';
}

const CONFIG_STORAGE_KEY = 'statuspage_config';

export class ConfigManager {
  private static config: Config | null = null;

  /**
   * Get API key - checks environment variables first, then localStorage
   */
  static async getApiKey(): Promise<string | null> {
    // Method 1: Environment variables (hosting platform or .env.local populated by 1Password CLI)
    const envKey = process.env.NEXT_PUBLIC_STATUSPAGE_API_KEY;
    if (envKey && envKey !== '' && !envKey.includes('your_api_key')) {
      return envKey;
    }

    // Method 2: localStorage (browser only, set via runtime prompt)
    if (typeof window !== 'undefined') {
      const stored = this.getStoredConfig();
      if (stored?.apiKey) return stored.apiKey;
    }

    return null;
  }

  /**
   * Get Page ID - checks environment variables first, then localStorage
   */
  static async getPageId(): Promise<string | null> {
    // Method 1: Environment variables
    const envPageId = process.env.NEXT_PUBLIC_STATUSPAGE_PAGE_ID;
    if (envPageId && envPageId !== '' && !envPageId.includes('your_page_id')) {
      return envPageId;
    }

    // Method 2: localStorage
    if (typeof window !== 'undefined') {
      const stored = this.getStoredConfig();
      if (stored?.pageId) return stored.pageId;
    }

    return null;
  }

  /**
   * Store config in browser localStorage (obfuscated, not encrypted)
   * Note: This is NOT secure, just less visible in casual inspection
   */
  static storeConfig(apiKey: string, pageId: string): void {
    if (typeof window === 'undefined') return;

    try {
      // Base64 encode for basic obfuscation (NOT encryption!)
      const encoded = btoa(JSON.stringify({ apiKey, pageId }));
      localStorage.setItem(CONFIG_STORAGE_KEY, encoded);
    } catch (error) {
      console.error('Failed to store config:', error);
    }
  }

  /**
   * Get stored config from localStorage
   */
  static getStoredConfig(): Config | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!stored) return null;

      // Decode from base64
      const decoded = atob(stored);
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  /**
   * Clear stored config
   */
  static clearStoredConfig(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  }

  /**
   * Prompt user for credentials (browser only)
   */
  static promptForCredentials(): { apiKey: string; pageId: string } | null {
    if (typeof window === 'undefined') return null;

    const apiKey = window.prompt(
      'Enter your Statuspage API Key:\n\n' +
      'Get it from: https://manage.statuspage.io/organizations/[org]/api\n\n' +
      'This will be stored locally in your browser (obfuscated but not encrypted).'
    );

    if (!apiKey) return null;

    const pageId = window.prompt(
      'Enter your Statuspage Page ID:\n\n' +
      'Find it in your statuspage URL or API responses.'
    );

    if (!pageId) return null;

    return { apiKey: apiKey.trim(), pageId: pageId.trim() };
  }

  /**
   * Get banner configuration from config.json
   */
  static getBannerConfig(): BannerConfig {
    const config = configData as { banner?: BannerConfig };
    return {
      enabled: config.banner?.enabled || false,
      message: config.banner?.message || '',
      variant: config.banner?.variant || 'info',
    };
  }
}

export type { BannerConfig };
