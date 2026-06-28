import Link from 'next/link';

export type BottomNavActive = 'home' | 'envelopes' | 'activity' | 'settings';

interface BottomNavProps {
  groupId: string;
  active: BottomNavActive;
}


export function BottomNav({ groupId, active }: BottomNavProps) {
  return (
    <nav className="wallet-bottom-nav" aria-label="Group navigation">
      <div className="wallet-bottom-nav-inner">
        <Link
          href={`/groups/${groupId}`}
          className={active === 'home' ? 'wallet-bottom-nav-item wallet-bottom-nav-item-active' : 'wallet-bottom-nav-item'}
        >
          <span aria-hidden="true" className="wallet-bottom-nav-icon">⌂</span>
          <span>Home</span>
        </Link>
        <Link
          href={`/groups/${groupId}/envelopes`}
          className={active === 'envelopes' ? 'wallet-bottom-nav-item wallet-bottom-nav-item-active' : 'wallet-bottom-nav-item'}
        >
          <span aria-hidden="true" className="wallet-bottom-nav-icon">□</span>
          <span>Env</span>
        </Link>
        <Link href={`/groups/${groupId}`} className="wallet-bottom-nav-add" aria-label="Add expense">+</Link>
        <Link
          href={`/groups/${groupId}/activity`}
          className={active === 'activity' ? 'wallet-bottom-nav-item wallet-bottom-nav-item-active' : 'wallet-bottom-nav-item'}
        >
          <span aria-hidden="true" className="wallet-bottom-nav-icon">↻</span>
          <span>Act</span>
        </Link>
        <Link
          href={`/groups/${groupId}/settings`}
          className={active === 'settings' ? 'wallet-bottom-nav-item wallet-bottom-nav-item-active' : 'wallet-bottom-nav-item'}
        >
          <span aria-hidden="true" className="wallet-bottom-nav-icon">⚙</span>
          <span>Set</span>
        </Link>
      </div>
    </nav>
  );
}
