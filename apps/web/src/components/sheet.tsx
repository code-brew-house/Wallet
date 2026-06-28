import type { ReactNode } from 'react';

interface AuthSheetShellProps {
  title: string;
  description: string;
  hero?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthSheetShell({ title, description, hero, children, footer }: AuthSheetShellProps) {
  return (
    <main className="wallet-auth-root">
      <div className="wallet-auth-hero">
        {hero ?? (
          <div className="wallet-auth-brand">
            <span className="wallet-auth-mark" aria-hidden="true" />
            <h1>Wallet</h1>
            <p>Family envelope budgeting</p>
          </div>
        )}
      </div>
      <section className="wallet-sheet" aria-labelledby="wallet-sheet-title">
        <div className="wallet-sheet-handle" aria-hidden="true" />
        <div className="wallet-sheet-body">
          <div className="wallet-sheet-heading">
            <h2 id="wallet-sheet-title">{title}</h2>
            <p>{description}</p>
          </div>
          {children}
        </div>
        <div className="wallet-sheet-footer">{footer}</div>
      </section>
    </main>
  );
}
