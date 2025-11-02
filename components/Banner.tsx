'use client';

import { ConfigManager, type BannerConfig } from '@/lib/config';

const variantConfig = {
  default: {
    label: 'Info',
    bgColor: 'bg-sky-100',
    textColor: 'text-sky-700',
  },
  info: {
    label: 'Info',
    bgColor: 'bg-sky-100',
    textColor: 'text-sky-700',
  },
  warning: {
    label: 'Warning',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
  },
  destructive: {
    label: 'Alert',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
  success: {
    label: 'Success',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
};

export function Banner() {
  const config: BannerConfig = ConfigManager.getBannerConfig();

  if (!config.enabled || !config.message) {
    return null;
  }

  const variant = config.variant || 'info';
  const { label, bgColor, textColor } = variantConfig[variant];

  return (
    <div className={`inline-flex items-center gap-2 rounded-full ${bgColor} ${textColor} pl-2 pr-4 py-1.5 text-sm border ${variant === 'info' ? 'border-sky-200/50' : variant === 'warning' ? 'border-yellow-200/50' : variant === 'destructive' ? 'border-red-200/50' : 'border-green-200/50'}`}>
      <span className="shrink-0 rounded-full px-2 py-0.5 bg-white/80 text-xs font-semibold uppercase tracking-wide">
        {label}
      </span>
      <span className="font-medium">
        {config.message}
      </span>
    </div>
  );
}
