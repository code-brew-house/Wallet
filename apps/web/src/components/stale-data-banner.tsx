'use client';

import { useEffect, useState } from 'react';
import { AlertBanner } from './alert-banner';

export function StaleDataBanner({ generatedAt, maxAgeMs }: { generatedAt?: string; maxAgeMs?: number }) {
  const [online, setOnline] = useState(true);
  const [, setRefreshTick] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!generatedAt || maxAgeMs === undefined) return;
    const interval = window.setInterval(() => setRefreshTick((tick) => tick + 1), Math.min(maxAgeMs, 60_000));
    return () => window.clearInterval(interval);
  }, [generatedAt, maxAgeMs]);

  const isStale = online && generatedAt && maxAgeMs !== undefined && Number.isFinite(Date.parse(generatedAt)) && Date.now() - Date.parse(generatedAt) > maxAgeMs;

  if (online && !isStale) return null;

  return (
    <AlertBanner variant="warn" title={online ? 'Stale cached data' : 'Offline read-only mode'}>
      {online ? 'Showing cached Wallet data that may be out of date.' : 'Showing cached Wallet data in read-only mode.'}
      {generatedAt ? ` Last refreshed ${new Date(generatedAt).toLocaleString()}` : ''} New expenses require a connection.
    </AlertBanner>
  );
}
