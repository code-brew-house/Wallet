import type { ReactNode } from 'react';
import { BottomNav, type BottomNavActive } from './bottom-nav';

interface AppShellProps {
  groupId: string;
  active: BottomNavActive;
  narrow?: boolean;
  children: ReactNode;
}

export function AppShell({ groupId, active, narrow = false, children }: AppShellProps) {
  return (
    <main className="wallet-app-root">
      <div className={narrow ? 'wallet-page wallet-page-narrow' : 'wallet-page'}>
        {children}
      </div>
      <BottomNav groupId={groupId} active={active} />
    </main>
  );
}
