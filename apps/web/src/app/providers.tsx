'use client';

import { useEffect } from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '../styles/theme';
import { AuthProvider } from '../lib/auth-store';
import { registerServiceWorker } from '../lib/register-service-worker';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <MantineProvider theme={theme}>
      <AuthProvider>
        <Notifications />
        {children}
      </AuthProvider>
    </MantineProvider>
  );
}
