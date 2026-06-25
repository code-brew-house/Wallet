'use client';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '../styles/theme';
import { AuthProvider } from '../lib/auth-store';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme}>
      <AuthProvider>
        <Notifications />
        {children}
      </AuthProvider>
    </MantineProvider>
  );
}
