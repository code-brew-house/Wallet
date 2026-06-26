'use client';

import { Alert } from '@mantine/core';
import { useEffect, useState } from 'react';

export function StaleDataBanner({ generatedAt }: { generatedAt?: string }) {
  const [online, setOnline] = useState(true);

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

  if (online) return null;

  return (
    <Alert color="yellow" title="Offline read-only mode">
      Showing cached Wallet data{generatedAt ? ` from ${new Date(generatedAt).toLocaleString()}` : ''}. New expenses require a connection.
    </Alert>
  );
}
