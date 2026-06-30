import Link from 'next/link';

export type BottomNavActive = 'home' | 'envelopes' | 'activity' | 'settings';

interface BottomNavProps {
  groupId: string;
  active?: BottomNavActive;
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" className="wallet-bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg aria-hidden="true" className="wallet-bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6.5h16v11H4z" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg aria-hidden="true" className="wallet-bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13a8 8 0 0 0 13.7 5.6" />
      <path d="M20 11A8 8 0 0 0 6.3 5.4" />
      <path d="M17 18.5h4v-4" />
      <path d="M7 5.5H3v4" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg aria-hidden="true" className="wallet-bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}


export function BottomNav({ groupId, active }: BottomNavProps) {
  return (
    <nav className="wallet-bottom-nav" aria-label="Group navigation">
      <div className="wallet-bottom-nav-inner">
        <Link
          href={`/groups/${groupId}`}
          aria-label="Home"
          className={active === 'home' ? 'wallet-bottom-nav-item wallet-bottom-nav-item-active' : 'wallet-bottom-nav-item'}
        >
          <HomeIcon />
        </Link>
        <Link
          href={`/groups/${groupId}/envelopes`}
          aria-label="Envelope"
          className={active === 'envelopes' ? 'wallet-bottom-nav-item wallet-bottom-nav-item-active' : 'wallet-bottom-nav-item'}
        >
          <EnvelopeIcon />
        </Link>
        <Link
          href={`/groups/${groupId}/activity`}
          aria-label="Activity"
          className={active === 'activity' ? 'wallet-bottom-nav-item wallet-bottom-nav-item-active' : 'wallet-bottom-nav-item'}
        >
          <ActivityIcon />
        </Link>
        <Link
          href={`/groups/${groupId}/settings`}
          aria-label="Profile"
          className={active === 'settings' ? 'wallet-bottom-nav-item wallet-bottom-nav-item-active' : 'wallet-bottom-nav-item'}
        >
          <ProfileIcon />
        </Link>
      </div>
    </nav>
  );
}
