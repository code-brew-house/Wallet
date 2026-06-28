import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'teal',
  fontFamily: 'Inter, system-ui, sans-serif',
  other: {
    background: 'var(--color-bg)',
    surface: 'var(--color-bg-elev-1)',
    surfaceRaised: 'var(--color-bg-elev-2)',
    border: 'var(--color-border)',
    borderStrong: 'var(--color-border-strong)',
    text: 'var(--color-text)',
    muted: 'var(--color-text-muted)',
    dim: 'var(--color-text-dim)',
    accent: 'var(--color-accent)',
    success: 'var(--color-success)',
    danger: 'var(--color-danger)',
    warn: 'var(--color-warn)',
  },
});
