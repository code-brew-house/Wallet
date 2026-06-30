export interface StatusStripProps {
  overspentCount: number;
  lowBalanceCount: number;
}

export function StatusStrip({ overspentCount, lowBalanceCount }: StatusStripProps) {
  return (
    <div className="wallet-status-strip" aria-label="Dashboard status summary">
      <span className="wallet-status-strip-item">
        <span className="wallet-status-strip-dot wallet-status-danger" aria-hidden="true" />
        {overspentCount} overspent
      </span>
      <span className="wallet-status-strip-item">
        <span className="wallet-status-strip-dot wallet-status-warn" aria-hidden="true" />
        {lowBalanceCount} low
      </span>
    </div>
  );
}
