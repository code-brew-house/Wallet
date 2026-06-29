import type { ReactNode } from 'react';

export type AlertBannerVariant = 'info' | 'success' | 'warn' | 'danger';

const variantIcon: Record<AlertBannerVariant, string> = {
  info: 'i',
  success: '✓',
  warn: '!',
  danger: '!',
};

export interface AlertBannerProps {
  variant?: AlertBannerVariant;
  title?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}

export function AlertBanner({ variant = 'info', title, children, compact = false }: AlertBannerProps) {
  return (
    <div className={`wallet-alert-banner wallet-alert-banner-${variant} ${compact ? 'wallet-alert-banner-compact' : ''}`.trim()} role="status">
      <span className="wallet-alert-banner-icon" aria-hidden="true">{variantIcon[variant]}</span>
      <div className="wallet-alert-banner-body">
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
