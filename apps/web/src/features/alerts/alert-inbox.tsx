import { useMemo, useState } from 'react';
import type { EnvelopeSummary } from '../dashboard/types';

type InboxFilter = 'all' | 'overspent' | 'low';

interface AlertInboxProps {
  overspent: EnvelopeSummary[];
  lowBalance: EnvelopeSummary[];
  currency: string;
}

export function AlertInbox({ overspent, lowBalance, currency }: AlertInboxProps) {
  const [filter, setFilter] = useState<InboxFilter>('all');
  const moneyFormatter = useMemo(() => new Intl.NumberFormat('en-IN', { style: 'currency', currency }), [currency]);
  const rows = [
    ...overspent.map((envelope) => ({ type: 'overspent' as const, envelope })),
    ...lowBalance.map((envelope) => ({ type: 'low' as const, envelope })),
  ].filter((row) => filter === 'all' || row.type === filter);

  return (
    <section className="wallet-section">
      <div className="wallet-section-heading">
        <div>
          <div className="wallet-overline">Attention inbox</div>
          <h2>Needs review</h2>
        </div>
      </div>
      <div className="wallet-alert-inbox">
        <div className="wallet-alert-inbox-filters" aria-label="Alert filters">
          <button type="button" className={filter === 'all' ? 'wallet-alert-inbox-filter wallet-alert-inbox-filter-active' : 'wallet-alert-inbox-filter'} onClick={() => setFilter('all')}>All · {overspent.length + lowBalance.length}</button>
          <button type="button" className={filter === 'overspent' ? 'wallet-alert-inbox-filter wallet-alert-inbox-filter-active' : 'wallet-alert-inbox-filter'} onClick={() => setFilter('overspent')}>Overspent · {overspent.length}</button>
          <button type="button" className={filter === 'low' ? 'wallet-alert-inbox-filter wallet-alert-inbox-filter-active' : 'wallet-alert-inbox-filter'} onClick={() => setFilter('low')}>Low · {lowBalance.length}</button>
        </div>
        {rows.length === 0 ? <p className="wallet-muted">All healthy.</p> : null}
        {rows.map(({ type, envelope }) => (
          <article key={`${type}-${envelope.id}`} className="wallet-alert-inbox-row">
            <span className={type === 'overspent' ? 'wallet-status-dot wallet-status-danger' : 'wallet-status-dot wallet-status-warn'} aria-hidden="true" />
            <div>
              <strong>{envelope.name}</strong>
              <div className="wallet-muted">{type === 'overspent' ? 'Overspent' : 'Low balance'}</div>
            </div>
            <strong>{moneyFormatter.format(envelope.balanceMinor / 100)}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
