'use client';

import { Button } from '@mantine/core';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="wallet-auth-root">
      <section className="wallet-auth-hero">
        <div className="wallet-card wallet-landing-card">
          <span className="wallet-auth-mark" aria-hidden="true" />
          <div>
            <div className="wallet-overline">Family envelope budgeting</div>
            <h1 className="wallet-title">Wallet</h1>
            <p className="wallet-muted">Shared spending, calm budgets, and household visibility.</p>
          </div>
          <Button component={Link} href="/login" className="wallet-button-primary">Get started</Button>
        </div>
      </section>
    </main>
  );
}
