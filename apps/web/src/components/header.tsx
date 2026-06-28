import type { ReactNode } from 'react';

interface PageHeaderTab {
  label: string;
  active?: boolean;
}

interface PageHeaderProps {
  overline: string;
  title: string;
  description?: string;
  tone?: 'info' | 'success' | 'warn' | 'danger';
  actions?: ReactNode;
  tabs?: PageHeaderTab[];
}

const toneClass: Record<NonNullable<PageHeaderProps['tone']>, string> = {
  info: 'wallet-card-info',
  success: 'wallet-card-success',
  warn: 'wallet-card-warn',
  danger: 'wallet-card-danger',
};

export function PageHeader({ overline, title, description, tone = 'info', actions, tabs }: PageHeaderProps) {
  return (
    <section className={`wallet-page-header ${toneClass[tone]}`}>
      <div className="wallet-page-header-top">
        <div className="wallet-brand">
          <span className="wallet-brand-mark" aria-hidden="true" />
          <span>Wallet</span>
        </div>
        {actions ? <div className="wallet-page-header-actions">{actions}</div> : null}
      </div>
      <div>
        <div className="wallet-overline">{overline}</div>
        <h1 className="wallet-title">{title}</h1>
        {description ? <p className="wallet-page-header-description">{description}</p> : null}
      </div>
      {tabs ? (
        <div className="wallet-page-header-tabs" role="tablist" aria-label={`${title} tabs`}>
          {tabs.map((tab) => (
            <button key={tab.label} type="button" role="tab" aria-selected={Boolean(tab.active)} className={tab.active ? 'wallet-header-tab wallet-header-tab-active' : 'wallet-header-tab'}>
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
