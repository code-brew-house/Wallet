import type { EnvelopeSummary } from '../dashboard/types';

interface EnvelopeCardProps {
  envelope: EnvelopeSummary;
  currency: string;
}

export function EnvelopeCard({ envelope, currency }: EnvelopeCardProps) {
  const isOverspent = envelope.balanceMinor < 0;
  const balance = new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(envelope.balanceMinor / 100);

  return (
    <article className={isOverspent ? 'wallet-card wallet-card-danger' : 'wallet-card wallet-card-success'}>
      <div className="wallet-card-heading">
        <div>
          <h3>{envelope.name}</h3>
          <div className="wallet-overline">Available</div>
        </div>
        {envelope.archivedAt ? <span className="wallet-pill">Archived</span> : null}
      </div>
      <div className={isOverspent ? 'wallet-money wallet-money-danger' : 'wallet-money'}>{balance}</div>
      <p className="wallet-muted">
        {isOverspent ? 'This envelope needs attention before more spending.' : 'Ready for planned spending.'}
      </p>
    </article>
  );
}
