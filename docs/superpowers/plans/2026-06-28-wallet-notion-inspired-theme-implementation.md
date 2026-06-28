# Wallet Notion-Inspired Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current default Mantine-looking Wallet PWA with the approved dark, token-driven design language across every existing screen.

**Architecture:** Keep Mantine as the component engine and layer a CSS-variable design system on top. Add focused shared presentation components for the app shell, hero header, bottom navigation, and responsive sheet chrome; then migrate existing routes without changing API calls, validation, auth flow, or domain data.

**Tech Stack:** Next.js app router, React, TypeScript, Mantine, Bun test runner, CSS custom properties.

## Global Constraints

- Product behavior, API calls, validation, auth redirects, and service worker behavior must not change.
- No new UI library; Mantine remains the component engine.
- No API, database, backend, deployment, or React Native changes.
- Dark theme is the implemented source of truth; light theme is only token-ready/deferred.
- Token values must match `docs/superpowers/specs/2026-06-28-wallet-notion-inspired-theme-design.md` exactly.
- Phone-first PWA layout must include safe-area bottom padding where bottom chrome is present.
- Tests must not use mocked API responses. Existing source-contract tests stay source-based unless a route can be exercised without an API.
- Use Bun commands only: `bun --cwd apps/web test`, `bun --cwd apps/web typecheck`, and `bun --cwd apps/web build`.

---

## File Structure

### New files

- `apps/web/src/styles/tokens.css`
  - Owns all CSS custom properties for the dark theme and token-ready light theme block.
  - Exposes surface, border, text, semantic color, typography, spacing, radius, shadow, and glow variables.

- `apps/web/src/styles/recipes.css`
  - Owns all reusable CSS recipes and class names.
  - Contains Mantine selectors for buttons, inputs, alerts, cards, modals, and page layout helpers.

- `apps/web/src/components/app-shell.tsx`
  - Reusable top-level page frame for authenticated group screens.
  - Renders page background, content width, bottom padding, and `BottomNav`.

- `apps/web/src/components/header.tsx`
  - Reusable hero-card page header.
  - Renders brand mark, overline, title, description, optional actions, optional tabs, and screen tint.

- `apps/web/src/components/bottom-nav.tsx`
  - Reusable pill dock navigation.
  - Computes active destination from current pathname.
  - Renders Home, Envelopes, Add, Activity, Settings.

- `apps/web/src/components/sheet.tsx`
  - Reusable bottom-sheet/card chrome for auth/onboarding forms.
  - Provides `AuthSheetShell` for login/signup/new group/invite accept.

- `apps/web/test/theme-contract.test.ts`
  - Source-contract tests for token import, token values, `data-theme="dark"`, and recipe class names.

- `apps/web/test/navigation-contract.test.ts`
  - Source-contract tests for `BottomNav`, `AppShell`, `PageHeader`, and route adoption.

- `apps/web/test/auth-shell-contract.test.ts`
  - Source-contract tests for bottom-sheet auth chrome and safe `next` links.

### Modified files

- `apps/web/src/app/layout.tsx`
  - Import `tokens.css` and `recipes.css` after Mantine styles.
  - Set `data-theme="dark"` and update viewport theme color to `#0e0e10`.

- `apps/web/src/styles/theme.ts`
  - Keep `primaryColor: 'teal'` for compatibility.
  - Add `other` token references for CSS variable names.

- `apps/web/src/app/providers.tsx`
  - Keep existing `MantineProvider`, `AuthProvider`, `Notifications`, and service worker registration.
  - No behavior change; only import order/type issues if `theme.other` needs type support.

- `apps/web/src/components/stale-data-banner.tsx`
  - Replace Mantine default alert visuals with locked tonal alert recipe.

- `apps/web/src/features/envelopes/envelope-card.tsx`
  - Apply locked elevated + glass card recipe.
  - Keep `EnvelopeCardProps` unchanged.

- `apps/web/src/features/envelopes/envelope-forms.tsx`
  - Apply locked glass input/form recipes.
  - Keep `EnvelopeFormsProps`, `FormKind`, form ids, and submit payloads unchanged.

- `apps/web/src/features/dashboard/dashboard-page.tsx`
  - Adopt `AppShell`, `PageHeader`, summary cards, dashboard sections, activity rows, and bottom nav.
  - Keep dashboard loading, stale-data banner, invite creation, form focusing, and mutations unchanged.

- `apps/web/src/app/groups/[groupId]/envelopes/page.tsx`
  - Adopt `AppShell`, `PageHeader` with Active/Archived tabs, locked envelope list.
  - Keep API call unchanged.

- `apps/web/src/app/groups/[groupId]/activity/page.tsx`
  - Adopt `AppShell`, `PageHeader`, date-grouped card rows.
  - Keep API call unchanged.

- `apps/web/src/app/groups/[groupId]/reports/page.tsx`
  - Adopt `AppShell`, `PageHeader`, KPI cards, CSS-only 6-month chart placeholder from current totals, and per-envelope spending cards.
  - Keep API call unchanged.

- `apps/web/src/app/groups/[groupId]/settings/page.tsx`
  - Adopt `AppShell`, profile header + sectioned cards.
  - Keep members and invite API calls unchanged.

- `apps/web/src/app/page.tsx`
  - Adopt dark landing surface.
  - Keep `/login` CTA unchanged.

- `apps/web/src/app/login/page.tsx`
  - Adopt auth bottom-sheet shell.
  - Keep login API call, `getSafeNextPath`, and auth store behavior unchanged.

- `apps/web/src/app/signup/page.tsx`
  - Adopt auth bottom-sheet shell.
  - Keep signup API call, `getSafeNextPath`, and auth store behavior unchanged.

- `apps/web/src/app/groups/new/page.tsx`
  - Adopt auth/onboarding bottom-sheet shell.
  - Keep group creation API call and redirect unchanged.

- `apps/web/src/app/invites/[token]/page.tsx`
  - Adopt invite hero + auth bottom-sheet chrome.
  - Keep token handling, login/signup next links, and accept API call unchanged.

---

### Task 1: Token foundation and Mantine bridge

**Files:**
- Create: `apps/web/src/styles/tokens.css`
- Create: `apps/web/src/styles/recipes.css`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/styles/theme.ts`
- Test: `apps/web/test/theme-contract.test.ts`

**Interfaces:**
- Consumes: approved token values from `docs/superpowers/specs/2026-06-28-wallet-notion-inspired-theme-design.md`.
- Produces: CSS variables and recipe class names used by all later tasks:
  - `.wallet-app-root`
  - `.wallet-page`
  - `.wallet-card`
  - `.wallet-button-primary`
  - `.wallet-alert`
  - `.wallet-input-shell`
  - `.wallet-table-card`
  - `.wallet-sheet`
  - `.wallet-page-header`
  - `.wallet-bottom-nav`

- [ ] **Step 1: Write the failing theme contract test**

Create `apps/web/test/theme-contract.test.ts` with:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('wallet theme contract', () => {
  test('layout imports token and recipe styles after Mantine styles', () => {
    const layout = source('../src/app/layout.tsx');
    const mantineIndex = layout.indexOf("import '@mantine/notifications/styles.css';");
    const tokensIndex = layout.indexOf("import '../styles/tokens.css';");
    const recipesIndex = layout.indexOf("import '../styles/recipes.css';");

    expect(mantineIndex).toBeGreaterThan(-1);
    expect(tokensIndex).toBeGreaterThan(mantineIndex);
    expect(recipesIndex).toBeGreaterThan(tokensIndex);
    expect(layout).toContain('<html lang="en" data-theme="dark"');
    expect(layout).toContain("themeColor: '#0e0e10'");
  });

  test('dark tokens match the locked design spec', () => {
    const tokens = source('../src/styles/tokens.css');
    expect(tokens).toContain('--color-bg: #0e0e10;');
    expect(tokens).toContain('--color-bg-elev-1: #17171a;');
    expect(tokens).toContain('--color-bg-elev-2: #1f1f23;');
    expect(tokens).toContain('--color-border: #2a2a30;');
    expect(tokens).toContain('--color-border-strong: #3a3a44;');
    expect(tokens).toContain('--color-text: #fafafa;');
    expect(tokens).toContain('--color-text-muted: #d4d4d8;');
    expect(tokens).toContain('--color-text-dim: #71717a;');
    expect(tokens).toContain('--color-accent: #3b82f6;');
    expect(tokens).toContain('--color-success: #22c55e;');
    expect(tokens).toContain('--color-danger: #ef4444;');
    expect(tokens).toContain('--color-warn: #f59e0b;');
    expect(tokens).toContain('--radius-md: 10px;');
    expect(tokens).toContain('--radius-lg: 14px;');
    expect(tokens).toContain('--radius-full: 999px;');
  });

  test('recipes expose the shared visual primitives', () => {
    const recipes = source('../src/styles/recipes.css');
    for (const className of [
      '.wallet-app-root',
      '.wallet-page',
      '.wallet-card',
      '.wallet-button-primary',
      '.wallet-alert',
      '.wallet-input-shell',
      '.wallet-table-card',
      '.wallet-sheet',
      '.wallet-page-header',
      '.wallet-bottom-nav',
    ]) {
      expect(recipes).toContain(className);
    }
  });

  test('Mantine theme exposes CSS variable references', () => {
    const theme = source('../src/styles/theme.ts');
    expect(theme).toContain("primaryColor: 'teal'");
    expect(theme).toContain("fontFamily: 'Inter, system-ui, sans-serif'");
    expect(theme).toContain("surface: 'var(--color-bg-elev-1)'");
    expect(theme).toContain("accent: 'var(--color-accent)'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun --cwd apps/web test test/theme-contract.test.ts
```

Expected: FAIL because `tokens.css`, `recipes.css`, and the new imports do not exist yet.

- [ ] **Step 3: Create `tokens.css`**

Create `apps/web/src/styles/tokens.css` with:

```css
:root,
html[data-theme='dark'] {
  color-scheme: dark;

  --color-bg: #0e0e10;
  --color-bg-elev-1: #17171a;
  --color-bg-elev-2: #1f1f23;
  --color-border: #2a2a30;
  --color-border-strong: #3a3a44;
  --color-text: #fafafa;
  --color-text-muted: #d4d4d8;
  --color-text-dim: #71717a;
  --color-accent: #3b82f6;
  --color-accent-border: #60a5fa;
  --color-accent-text: #93c5fd;
  --color-success: #22c55e;
  --color-success-text: #86efac;
  --color-danger: #ef4444;
  --color-danger-text: #fca5a5;
  --color-warn: #f59e0b;
  --color-warn-text: #fcd34d;
  --color-info: #3b82f6;
  --color-info-text: #93c5fd;

  --font-sans: Inter, system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  --text-display-size: 32px;
  --text-display-line: 1.1;
  --text-display-spacing: -0.6px;
  --text-display-weight: 800;
  --text-h1-size: 24px;
  --text-h1-line: 1.2;
  --text-h1-spacing: -0.4px;
  --text-h1-weight: 800;
  --text-h2-size: 20px;
  --text-h2-line: 1.25;
  --text-h2-spacing: -0.2px;
  --text-h2-weight: 700;
  --text-h3-size: 17px;
  --text-h3-line: 1.3;
  --text-h3-spacing: -0.1px;
  --text-h3-weight: 700;
  --text-body-size: 14px;
  --text-body-line: 1.55;
  --text-caption-size: 12px;
  --text-caption-line: 1.4;
  --text-caption-spacing: 0.1px;
  --text-caption-weight: 500;
  --text-overline-size: 11px;
  --text-overline-line: 1.2;
  --text-overline-spacing: 0.8px;
  --text-overline-weight: 700;

  --space-0: 0;
  --space-1: 2px;
  --space-2: 4px;
  --space-3: 8px;
  --space-4: 12px;
  --space-5: 16px;
  --space-6: 20px;
  --space-7: 24px;
  --space-8: 32px;
  --space-9: 40px;
  --space-10: 56px;

  --radius-none: 0;
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --radius-2xl: 24px;
  --radius-full: 999px;

  --shadow-card: 0 8px 28px rgba(0, 0, 0, 0.45);
  --shadow-nav: 0 8px 24px rgba(0, 0, 0, 0.5);
  --shadow-sheet: 0 -8px 32px rgba(0, 0, 0, 0.5);
  --glow-accent-8: rgba(59, 130, 246, 0.08);
  --glow-accent-18: rgba(59, 130, 246, 0.18);
  --glow-accent-22: rgba(59, 130, 246, 0.22);
  --backdrop-sheet: rgba(0, 0, 0, 0.55);
}

html[data-theme='light'] {
  color-scheme: light;
  --color-bg: #fbfaf8;
  --color-bg-elev-1: #ffffff;
  --color-bg-elev-2: #f4f2ef;
  --color-border: #e4e0da;
  --color-border-strong: #cbc4bb;
  --color-text: #111113;
  --color-text-muted: #3f3f46;
  --color-text-dim: #71717a;
}
```

- [ ] **Step 4: Create `recipes.css`**

Create `apps/web/src/styles/recipes.css` with the recipe classes used by later tasks:

```css
html,
body {
  min-height: 100%;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
}

body {
  margin: 0;
}

.wallet-app-root {
  min-height: 100vh;
  background:
    radial-gradient(circle at 20% 0%, rgba(59, 130, 246, 0.14), transparent 32rem),
    radial-gradient(circle at 80% 20%, rgba(34, 197, 94, 0.08), transparent 28rem),
    var(--color-bg);
  color: var(--color-text);
}

.wallet-page {
  width: min(100%, 1120px);
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) calc(96px + env(safe-area-inset-bottom, 0px));
}

.wallet-page-narrow {
  width: min(100%, 520px);
}

.wallet-card,
.wallet-page-header,
.wallet-sheet,
.wallet-table-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-bg-elev-2) 0%, var(--color-bg-elev-1) 60%);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  color: var(--color-text);
}

.wallet-card::before,
.wallet-page-header::before,
.wallet-sheet::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 85% 10%, var(--wallet-glow, var(--glow-accent-22)), transparent 55%);
}

.wallet-card > *,
.wallet-page-header > *,
.wallet-sheet > * {
  position: relative;
}

.wallet-card {
  padding: var(--space-5);
}

.wallet-card-success { --wallet-glow: rgba(34, 197, 94, 0.22); }
.wallet-card-danger { --wallet-glow: rgba(239, 68, 68, 0.22); }
.wallet-card-warn { --wallet-glow: rgba(245, 158, 11, 0.22); }
.wallet-card-info { --wallet-glow: rgba(59, 130, 246, 0.22); }

.wallet-overline {
  color: var(--color-text-dim);
  font-size: var(--text-overline-size);
  line-height: var(--text-overline-line);
  letter-spacing: var(--text-overline-spacing);
  font-weight: var(--text-overline-weight);
  text-transform: uppercase;
}

.wallet-title {
  color: var(--color-text);
  font-size: var(--text-h1-size);
  line-height: var(--text-h1-line);
  letter-spacing: var(--text-h1-spacing);
  font-weight: var(--text-h1-weight);
  margin: 0;
}

.wallet-muted {
  color: var(--color-text-muted);
}

.wallet-dim {
  color: var(--color-text-dim);
}

.wallet-button-primary {
  background: var(--color-accent);
  color: #0b0b0e;
  border: 1px solid var(--color-accent-border);
  border-radius: var(--radius-md);
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
}

.wallet-button-secondary {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 600;
}

.wallet-alert {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: var(--color-info-text);
}

.wallet-alert-danger {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: var(--color-danger-text);
}

.wallet-alert-warn {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
  color: var(--color-warn-text);
}

.wallet-alert-success {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  color: var(--color-success-text);
}

.wallet-alert-icon {
  display: grid;
  place-items: center;
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.1);
  font-size: 12px;
  font-weight: 800;
}

.wallet-input-shell {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-strong);
  background:
    radial-gradient(circle at 0% 0%, var(--glow-accent-8), transparent 50%),
    linear-gradient(135deg, var(--color-bg-elev-2), var(--color-bg-elev-1));
  box-shadow: var(--shadow-card);
}

.wallet-input-shell input,
.wallet-input-shell textarea,
.wallet-input-shell .mantine-Select-input,
.wallet-input-shell .mantine-TextInput-input,
.wallet-input-shell .mantine-PasswordInput-input,
.wallet-input-shell .mantine-Textarea-input {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: var(--radius-md);
}

.wallet-input-shell input:focus,
.wallet-input-shell textarea:focus,
.wallet-input-shell .mantine-Select-input:focus,
.wallet-input-shell .mantine-TextInput-input:focus,
.wallet-input-shell .mantine-PasswordInput-input:focus,
.wallet-input-shell .mantine-Textarea-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--glow-accent-18);
}

.wallet-table-card {
  background: var(--color-bg-elev-1);
  border-color: var(--color-border);
  border-radius: var(--radius-lg);
}

.wallet-table-header,
.wallet-table-row {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) auto;
  gap: var(--space-3);
  align-items: center;
  padding: 14px 16px;
}

.wallet-table-header {
  background: var(--color-bg-elev-2);
  color: var(--color-text);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.wallet-table-row {
  color: var(--color-text);
  font-size: var(--text-body-size);
  line-height: var(--text-body-line);
  border-top: 1px solid var(--color-border);
}

.wallet-table-row:hover {
  background: rgba(59, 130, 246, 0.1);
  box-shadow: inset 3px 0 0 var(--color-accent), inset -3px 0 0 var(--color-accent);
}

.wallet-status-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
}

.wallet-status-success { background: var(--color-success); }
.wallet-status-danger { background: var(--color-danger); }
.wallet-status-warn { background: var(--color-warn); }

.wallet-pill {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border-radius: var(--radius-full);
  padding: 6px 12px;
  background: rgba(59, 130, 246, 0.18);
  color: var(--color-accent-text);
  font-size: 12px;
  font-weight: 700;
}

.wallet-sheet {
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  box-shadow: var(--shadow-sheet);
}

.wallet-sheet-handle {
  width: 36px;
  height: 4px;
  margin: var(--space-3) auto var(--space-4);
  border-radius: var(--radius-full);
  background: var(--color-border-strong);
}

@media (min-width: 768px) {
  .wallet-sheet {
    max-width: 520px;
    margin: auto;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-card);
  }

  .wallet-sheet-handle {
    display: none;
  }
}
```

- [ ] **Step 5: Update layout imports and dark theme baseline**

Modify `apps/web/src/app/layout.tsx` so the imports and root markup are:

```tsx
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '../styles/tokens.css';
import '../styles/recipes.css';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import type { Metadata, Viewport } from 'next';
import { Providers as MantineProvider } from './providers';

export const metadata: Metadata = {
  title: 'Wallet',
  description: 'Family envelope budgeting',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0e0e10',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>{children}</MantineProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Update Mantine theme bridge**

Modify `apps/web/src/styles/theme.ts` to:

```ts
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
```

- [ ] **Step 7: Run the task test**

Run:

```bash
bun --cwd apps/web test test/theme-contract.test.ts
```

Expected: PASS.

- [ ] **Step 8: Run typecheck**

Run:

```bash
bun --cwd apps/web typecheck
```

Expected: PASS. If TypeScript rejects `theme.other`, keep the same object and add a local `as const` object before `createTheme`:

```ts
const walletTokens = { /* same keys as above */ } as const;

export const theme = createTheme({
  primaryColor: 'teal',
  fontFamily: 'Inter, system-ui, sans-serif',
  other: walletTokens,
});
```

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/styles/tokens.css apps/web/src/styles/recipes.css apps/web/src/app/layout.tsx apps/web/src/styles/theme.ts apps/web/test/theme-contract.test.ts
git commit -m "feat(web): add wallet theme tokens"
```

---

### Task 2: Shared app chrome components

**Files:**
- Create: `apps/web/src/components/app-shell.tsx`
- Create: `apps/web/src/components/header.tsx`
- Create: `apps/web/src/components/bottom-nav.tsx`
- Create: `apps/web/src/components/sheet.tsx`
- Modify: `apps/web/src/styles/recipes.css`
- Test: `apps/web/test/navigation-contract.test.ts`

**Interfaces:**
- Consumes: recipe classes from Task 1.
- Produces:
  - `AppShell({ groupId, active, children }: AppShellProps): JSX.Element`
  - `PageHeader({ overline, title, description, tone, actions, tabs }: PageHeaderProps): JSX.Element`
  - `BottomNav({ groupId, active }: BottomNavProps): JSX.Element`
  - `AuthSheetShell({ title, description, children, footer, hero }: AuthSheetShellProps): JSX.Element`

- [ ] **Step 1: Write the failing navigation contract test**

Create `apps/web/test/navigation-contract.test.ts` with:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('shared wallet chrome contract', () => {
  test('bottom nav renders the four destinations and center Add', () => {
    const nav = source('../src/components/bottom-nav.tsx');
    expect(nav).toContain("href={`/groups/${groupId}`}");
    expect(nav).toContain("href={`/groups/${groupId}/envelopes`}");
    expect(nav).toContain("href={`/groups/${groupId}/activity`}");
    expect(nav).toContain("href={`/groups/${groupId}/settings`}");
    expect(nav).toContain('aria-label="Add expense"');
    expect(nav).toContain('wallet-bottom-nav');
    expect(nav).toContain('wallet-bottom-nav-add');
  });

  test('app shell composes page content with bottom navigation', () => {
    const shell = source('../src/components/app-shell.tsx');
    expect(shell).toContain('export function AppShell');
    expect(shell).toContain('wallet-app-root');
    expect(shell).toContain('wallet-page');
    expect(shell).toContain('<BottomNav groupId={groupId} active={active} />');
  });

  test('page header supports actions and tabs inside the hero card', () => {
    const header = source('../src/components/header.tsx');
    expect(header).toContain('export function PageHeader');
    expect(header).toContain('wallet-page-header');
    expect(header).toContain('wallet-overline');
    expect(header).toContain('actions');
    expect(header).toContain('tabs');
  });

  test('auth sheet exposes mobile bottom sheet chrome', () => {
    const sheet = source('../src/components/sheet.tsx');
    expect(sheet).toContain('export function AuthSheetShell');
    expect(sheet).toContain('wallet-sheet');
    expect(sheet).toContain('wallet-sheet-handle');
    expect(sheet).toContain('footer');
    expect(sheet).toContain('hero');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun --cwd apps/web test test/navigation-contract.test.ts
```

Expected: FAIL because the components do not exist yet.

- [ ] **Step 3: Create `BottomNav`**

Create `apps/web/src/components/bottom-nav.tsx`:

```tsx
import Link from 'next/link';

export type BottomNavActive = 'home' | 'envelopes' | 'activity' | 'settings';

interface BottomNavProps {
  groupId: string;
  active: BottomNavActive;
}

const destinations: Array<{ key: BottomNavActive; label: string; href(groupId: string): string; glyph: string }> = [
  { key: 'home', label: 'Home', href: (groupId) => `/groups/${groupId}`, glyph: '⌂' },
  { key: 'envelopes', label: 'Env', href: (groupId) => `/groups/${groupId}/envelopes`, glyph: '□' },
  { key: 'activity', label: 'Act', href: (groupId) => `/groups/${groupId}/activity`, glyph: '↻' },
  { key: 'settings', label: 'Set', href: (groupId) => `/groups/${groupId}/settings`, glyph: '⚙' },
];

export function BottomNav({ groupId, active }: BottomNavProps) {
  return (
    <nav className="wallet-bottom-nav" aria-label="Group navigation">
      <div className="wallet-bottom-nav-inner">
        {destinations.slice(0, 2).map((destination) => (
          <Link
            key={destination.key}
            href={destination.href(groupId)}
            className={destination.key === active ? 'wallet-bottom-nav-item wallet-bottom-nav-item-active' : 'wallet-bottom-nav-item'}
          >
            <span aria-hidden="true" className="wallet-bottom-nav-icon">{destination.glyph}</span>
            <span>{destination.label}</span>
          </Link>
        ))}
        <Link href={`/groups/${groupId}`} className="wallet-bottom-nav-add" aria-label="Add expense">+</Link>
        {destinations.slice(2).map((destination) => (
          <Link
            key={destination.key}
            href={destination.href(groupId)}
            className={destination.key === active ? 'wallet-bottom-nav-item wallet-bottom-nav-item-active' : 'wallet-bottom-nav-item'}
          >
            <span aria-hidden="true" className="wallet-bottom-nav-icon">{destination.glyph}</span>
            <span>{destination.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Create `AppShell`**

Create `apps/web/src/components/app-shell.tsx`:

```tsx
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
```

- [ ] **Step 5: Create `PageHeader`**

Create `apps/web/src/components/header.tsx`:

```tsx
import type { ReactNode } from 'react';

interface PageHeaderTab {
  label: string;
  active?: boolean;
}

interface PageHeaderProps {
  overline: string;
  title: string;
  description?: string;
  tone?: 'info' | 'success' | 'warn' | 'danger';
  actions?: ReactNode;
  tabs?: PageHeaderTab[];
}

const toneClass: Record<NonNullable<PageHeaderProps['tone']>, string> = {
  info: 'wallet-card-info',
  success: 'wallet-card-success',
  warn: 'wallet-card-warn',
  danger: 'wallet-card-danger',
};

export function PageHeader({ overline, title, description, tone = 'info', actions, tabs }: PageHeaderProps) {
  return (
    <section className={`wallet-page-header ${toneClass[tone]}`}>
      <div className="wallet-page-header-top">
        <div className="wallet-brand">
          <span className="wallet-brand-mark" aria-hidden="true" />
          <span>Wallet</span>
        </div>
        {actions ? <div className="wallet-page-header-actions">{actions}</div> : null}
      </div>
      <div>
        <div className="wallet-overline">{overline}</div>
        <h1 className="wallet-title">{title}</h1>
        {description ? <p className="wallet-page-header-description">{description}</p> : null}
      </div>
      {tabs ? (
        <div className="wallet-page-header-tabs" role="tablist" aria-label={`${title} tabs`}>
          {tabs.map((tab) => (
            <button key={tab.label} type="button" className={tab.active ? 'wallet-header-tab wallet-header-tab-active' : 'wallet-header-tab'}>
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 6: Create `AuthSheetShell`**

Create `apps/web/src/components/sheet.tsx`:

```tsx
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
```

- [ ] **Step 7: Add chrome classes to `recipes.css`**

Append to `apps/web/src/styles/recipes.css`:

```css
.wallet-page-header {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
}

.wallet-page-header-top,
.wallet-page-header-actions,
.wallet-brand,
.wallet-page-header-tabs {
  display: flex;
  align-items: center;
}

.wallet-page-header-top {
  justify-content: space-between;
  gap: var(--space-4);
}

.wallet-brand {
  gap: var(--space-2);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 800;
}

.wallet-brand-mark,
.wallet-auth-mark {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--color-accent), var(--color-success));
}

.wallet-page-header-description {
  margin: var(--space-2) 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-body-size);
  line-height: var(--text-body-line);
}

.wallet-page-header-actions {
  gap: var(--space-2);
}

.wallet-page-header-tabs {
  gap: var(--space-2);
  padding: var(--space-1);
  width: fit-content;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: rgba(14, 14, 16, 0.5);
}

.wallet-header-tab {
  border: 0;
  border-radius: var(--radius-full);
  padding: 6px 12px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.wallet-header-tab-active {
  background: rgba(59, 130, 246, 0.18);
  color: var(--color-accent-text);
}

.wallet-bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  justify-content: center;
  padding: var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
}

.wallet-bottom-nav-inner {
  display: grid;
  grid-template-columns: repeat(5, minmax(44px, 1fr));
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-full);
  background: rgba(31, 31, 35, 0.95);
  box-shadow: var(--shadow-nav);
  backdrop-filter: blur(12px);
  pointer-events: auto;
}

.wallet-bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  border-radius: var(--radius-full);
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 9px;
  font-weight: 600;
}

.wallet-bottom-nav-item-active {
  background: rgba(59, 130, 246, 0.18);
  color: var(--color-accent-text);
  font-weight: 700;
}

.wallet-bottom-nav-icon {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
}

.wallet-bottom-nav-add {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  justify-self: center;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-border));
  color: #0b0b0e;
  text-decoration: none;
  font-size: 20px;
  font-weight: 800;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
}

.wallet-auth-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background:
    radial-gradient(circle at 50% 30%, rgba(59, 130, 246, 0.2), transparent 32rem),
    var(--color-bg);
  color: var(--color-text);
}

.wallet-auth-hero {
  flex: 1;
  display: grid;
  place-items: center;
  padding: var(--space-7) var(--space-5);
  text-align: center;
}

.wallet-auth-brand {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
}

.wallet-auth-mark {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
}

.wallet-auth-brand h1,
.wallet-sheet-heading h2 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-h2-size);
  line-height: var(--text-h2-line);
  font-weight: var(--text-h2-weight);
}

.wallet-auth-brand p,
.wallet-sheet-heading p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-caption-size);
  line-height: var(--text-caption-line);
}

.wallet-sheet {
  width: 100%;
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
}

.wallet-sheet-body {
  display: grid;
  gap: var(--space-4);
  padding: 0 var(--space-5) var(--space-5);
}

.wallet-sheet-heading {
  text-align: center;
}

.wallet-sheet-footer {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5) calc(var(--space-5) + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--color-border);
  background: rgba(14, 14, 16, 0.4);
}

.wallet-sheet-footer > * {
  flex: 1;
}
```

- [ ] **Step 8: Run the task test**

Run:

```bash
bun --cwd apps/web test test/navigation-contract.test.ts
```

Expected: PASS.

- [ ] **Step 9: Run typecheck**

Run:

```bash
bun --cwd apps/web typecheck
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/components/app-shell.tsx apps/web/src/components/header.tsx apps/web/src/components/bottom-nav.tsx apps/web/src/components/sheet.tsx apps/web/src/styles/recipes.css apps/web/test/navigation-contract.test.ts
git commit -m "feat(web): add wallet app chrome"
```

---

### Task 3: Shared primitives migration

**Files:**
- Modify: `apps/web/src/components/stale-data-banner.tsx`
- Modify: `apps/web/src/features/envelopes/envelope-card.tsx`
- Modify: `apps/web/src/features/envelopes/envelope-forms.tsx`
- Test: `apps/web/test/dashboard-contract.test.ts`
- Test: `apps/web/test/group-journey.test.ts`
- Test: `apps/web/test/theme-contract.test.ts`

**Interfaces:**
- Consumes: `.wallet-alert`, `.wallet-card`, `.wallet-input-shell`, `.wallet-button-primary`, `.wallet-button-secondary`, `.wallet-pill`.
- Produces: unchanged exported interfaces:
  - `StaleDataBanner({ generatedAt, maxAgeMs })`
  - `EnvelopeCard({ envelope, currency })`
  - `EnvelopeForms(props: EnvelopeFormsProps)`
  - `FormKind = 'create' | 'expense' | 'funding' | 'transfer' | 'recurring'`

- [ ] **Step 1: Extend existing tests before editing**

Modify `apps/web/test/dashboard-contract.test.ts` by adding this test inside the existing `describe` block:

```ts
  test('shared primitives use wallet recipe classes without changing form contracts', () => {
    const cardSource = readFileSync(new URL('../src/features/envelopes/envelope-card.tsx', import.meta.url), 'utf8');
    const formsSource = readFileSync(new URL('../src/features/envelopes/envelope-forms.tsx', import.meta.url), 'utf8');
    const staleBannerSource = readFileSync(new URL('../src/components/stale-data-banner.tsx', import.meta.url), 'utf8');

    expect(cardSource).toContain('wallet-card');
    expect(cardSource).toContain('wallet-pill');
    expect(formsSource).toContain('wallet-input-shell');
    expect(formsSource).toContain('wallet-button-primary');
    expect(staleBannerSource).toContain('wallet-alert');
    expect(formsSource).toContain("export type FormKind = 'create' | 'expense' | 'funding' | 'transfer' | 'recurring';");
    expect(formsSource).toContain('id="create-envelope-form"');
    expect(formsSource).toContain('id="expense-form"');
    expect(formsSource).toContain('id="funding-form"');
    expect(formsSource).toContain('id="transfer-form"');
    expect(formsSource).toContain('id="recurring-form"');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun --cwd apps/web test test/dashboard-contract.test.ts
```

Expected: FAIL because the recipe class names are not in the primitive files yet.

- [ ] **Step 3: Migrate `StaleDataBanner`**

Replace the return block in `apps/web/src/components/stale-data-banner.tsx` with:

```tsx
  return (
    <div className="wallet-alert wallet-alert-warn" role="status">
      <span className="wallet-alert-icon" aria-hidden="true">i</span>
      <div>
        <strong>{online ? 'Stale cached data' : 'Offline read-only mode'}</strong>
        <div>
          {online ? 'Showing cached Wallet data that may be out of date.' : 'Showing cached Wallet data in read-only mode.'}
          {generatedAt ? ` Last refreshed ${new Date(generatedAt).toLocaleString()}` : ''} New expenses require a connection.
        </div>
      </div>
    </div>
  );
```

Then remove the unused Mantine import:

```ts
import { Alert } from '@mantine/core';
```

The file should only import React hooks after this step.

- [ ] **Step 4: Migrate `EnvelopeCard`**

Replace `apps/web/src/features/envelopes/envelope-card.tsx` with:

```tsx
import type { EnvelopeSummary } from '../dashboard/types';

interface EnvelopeCardProps {
  envelope: EnvelopeSummary;
  currency: string;
}

export function EnvelopeCard({ envelope, currency }: EnvelopeCardProps) {
  const isOverspent = envelope.balanceMinor < 0;
  const balance = new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(envelope.balanceMinor / 100);

  return (
    <article className={isOverspent ? 'wallet-card wallet-card-danger' : 'wallet-card wallet-card-success'}>
      <div className="wallet-card-heading">
        <div>
          <h3>{envelope.name}</h3>
          <div className="wallet-overline">Available</div>
        </div>
        {envelope.archivedAt ? <span className="wallet-pill">Archived</span> : null}
      </div>
      <div className={isOverspent ? 'wallet-money wallet-money-danger' : 'wallet-money'}>{balance}</div>
      <p className="wallet-muted">
        {isOverspent ? 'This envelope needs attention before more spending.' : 'Ready for planned spending.'}
      </p>
    </article>
  );
}
```

Append these card-specific classes to `recipes.css`:

```css
.wallet-card-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
}

.wallet-card-heading h3 {
  margin: 0 0 var(--space-2);
  color: var(--color-text);
  font-size: var(--text-h3-size);
  line-height: var(--text-h3-line);
  letter-spacing: var(--text-h3-spacing);
  font-weight: var(--text-h3-weight);
}

.wallet-money {
  margin-top: var(--space-4);
  color: var(--color-success-text);
  font-size: var(--text-h2-size);
  line-height: var(--text-h2-line);
  font-weight: 800;
}

.wallet-money-danger {
  color: var(--color-danger-text);
}

.wallet-card p {
  margin: var(--space-3) 0 0;
  font-size: var(--text-body-size);
  line-height: var(--text-body-line);
}
```

- [ ] **Step 5: Migrate `EnvelopeForms` shells without changing form ids or payloads**

In `apps/web/src/features/envelopes/envelope-forms.tsx`, keep the imports and all form logic. Only change the JSX container classes:

1. Keep every existing form id exactly:
   - `create-envelope-form`
   - `expense-form`
   - `funding-form`
   - `transfer-form`
   - `recurring-form`

2. Wrap the existing `<Tabs ...>` block in:

```tsx
<Card className="wallet-input-shell" padding="lg" radius="lg">
  <Tabs value={selectedForm} onChange={(value) => value && onSelectedFormChange(value as FormKind)}>
    {/* existing Tabs.List and Tabs.Panel content */}
  </Tabs>
</Card>
```

3. Add `className="wallet-button-primary"` to every submit button in the forms:

```tsx
<Button type="submit" className="wallet-button-primary" disabled={!hasEnvelopes} loading={isSubmittingForm === 'expense'}>
  Add expense
</Button>
```

Use the existing text and existing loading/disabled expressions for each button. Do not change callbacks, validation, or field names.

- [ ] **Step 6: Run existing contract tests**

Run:

```bash
bun --cwd apps/web test test/dashboard-contract.test.ts test/group-journey.test.ts
```

Expected: PASS. These tests prove form ids, selected form behavior, and dashboard CTA contract survived the visual migration.

- [ ] **Step 7: Run typecheck**

Run:

```bash
bun --cwd apps/web typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/stale-data-banner.tsx apps/web/src/features/envelopes/envelope-card.tsx apps/web/src/features/envelopes/envelope-forms.tsx apps/web/src/styles/recipes.css apps/web/test/dashboard-contract.test.ts
git commit -m "feat(web): restyle wallet primitives"
```

---

### Task 4: Dashboard migration

**Files:**
- Modify: `apps/web/src/features/dashboard/dashboard-page.tsx`
- Modify: `apps/web/src/styles/recipes.css`
- Test: `apps/web/test/dashboard-contract.test.ts`
- Test: `apps/web/test/group-journey.test.ts`

**Interfaces:**
- Consumes:
  - `AppShell({ groupId, active, children })`
  - `PageHeader({ overline, title, description, tone, actions })`
  - `EnvelopeCard`
  - `EnvelopeForms`
  - `StaleDataBanner`
- Produces: same `DashboardPage({ groupId, currency })` export and unchanged mutation behavior.

- [ ] **Step 1: Extend dashboard contract test**

Add this test to `apps/web/test/dashboard-contract.test.ts`:

```ts
  test('dashboard uses approved information-first layout chrome', () => {
    const source = readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8');
    expect(source).toContain("import { AppShell } from '../../components/app-shell';");
    expect(source).toContain("import { PageHeader } from '../../components/header';");
    expect(source).toContain('active="home"');
    expect(source).toContain('overline="Envelope-first"');
    expect(source).toContain('wallet-dashboard-summary-grid');
    expect(source).toContain('wallet-section');
    expect(source).toContain('wallet-table-card');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun --cwd apps/web test test/dashboard-contract.test.ts
```

Expected: FAIL because `DashboardPage` still uses Mantine `Container` as its outer shell.

- [ ] **Step 3: Update dashboard imports**

In `apps/web/src/features/dashboard/dashboard-page.tsx`, change imports to include the new shared components and remove `Container`, `Divider`, and Mantine `Card` from the import list if they are no longer used:

```ts
import { Alert, Badge, Button, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { AppShell } from '../../components/app-shell';
import { PageHeader } from '../../components/header';
```

- [ ] **Step 4: Replace the dashboard outer return with `AppShell` and `PageHeader`**

Keep all hooks, mutation functions, and derived data unchanged. Replace the outer `<Container size="lg" py="xl">` with:

```tsx
    <AppShell groupId={groupId} active="home">
      <PageHeader
        overline="Envelope-first"
        title={`Group ${groupId}`}
        description="Track shared budgets, funding, spending, recurring expenses, and household activity."
        tone="info"
        actions={(
          <Button className="wallet-button-secondary" onClick={() => void createInvite()} loading={isMutating}>Create invite</Button>
        )}
      />
      <Stack gap="lg">
        {/* existing stale banner, messages, loading, dashboard content, and forms */}
      </Stack>
    </AppShell>
```

- [ ] **Step 5: Convert summary cards to the approved 2×2 grid**

Update the existing summary card area so it uses:

```tsx
<SimpleGrid className="wallet-dashboard-summary-grid" cols={{ base: 2, sm: 4 }} spacing="sm">
  <SummaryCard label="Total available" value={moneyFormatter.format(dashboard.totalAvailableMinor / 100)} tone="success" />
  <SummaryCard label="Spent this month" value={moneyFormatter.format(dashboard.spentThisMonthMinor / 100)} tone="danger" />
  <SummaryCard label="Overspent" value={String(dashboard.overspent.length)} tone="warn" />
  <SummaryCard label="Recurring" value={String(dashboard.upcomingRecurring.length)} tone="info" />
</SimpleGrid>
```

Replace the `SummaryCard` implementation with:

```tsx
function SummaryCard({ label, value, tone }: { label: string; value: string; tone: 'info' | 'success' | 'warn' | 'danger' }) {
  return (
    <article className={`wallet-card wallet-card-${tone}`}>
      <div className="wallet-overline">{label}</div>
      <div className="wallet-summary-value">{value}</div>
    </article>
  );
}
```

- [ ] **Step 6: Convert dashboard sections to locked cards/rows**

Use this section wrapper shape for envelopes, recurring, and activity:

```tsx
<section className="wallet-section">
  <div className="wallet-section-heading">
    <div>
      <div className="wallet-overline">Envelopes</div>
      <h2>Funding status</h2>
    </div>
    <Button className="wallet-button-secondary" onClick={() => focusDashboardForm('funding')}>Fund envelope</Button>
  </div>
  {/* existing EnvelopeCard grid */}
</section>
```

For activity rows, replace Mantine card rows with `.wallet-table-card` and `.wallet-table-row` while keeping `ActivityRow` props unchanged:

```tsx
function ActivityRow({ item, currency }: { item: ActivityItem; currency: string }) {
  const moneyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency });
  const color = item.type === 'expense' ? 'wallet-status-danger' : item.type === 'funding' ? 'wallet-status-success' : 'wallet-status-info';
  return (
    <div className="wallet-table-row">
      <span className={`wallet-status-dot ${color}`} aria-hidden="true" />
      <div>
        <strong>{item.title}</strong>
        <div className="wallet-muted">{item.type} · {new Date(item.occurredAt).toLocaleString()}</div>
      </div>
      <strong>{moneyFormatter.format(item.amountMinor / 100)}</strong>
    </div>
  );
}
```

- [ ] **Step 7: Add dashboard recipe classes**

Append to `apps/web/src/styles/recipes.css`:

```css
.wallet-dashboard-summary-grid .wallet-card {
  min-height: 112px;
}

.wallet-summary-value {
  margin-top: var(--space-3);
  color: var(--color-text);
  font-size: var(--text-h2-size);
  line-height: var(--text-h2-line);
  font-weight: 800;
  letter-spacing: var(--text-h2-spacing);
}

.wallet-section {
  display: grid;
  gap: var(--space-4);
}

.wallet-section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
}

.wallet-section-heading h2 {
  margin: var(--space-1) 0 0;
  color: var(--color-text);
  font-size: var(--text-h2-size);
  line-height: var(--text-h2-line);
  font-weight: var(--text-h2-weight);
}
```

- [ ] **Step 8: Run dashboard tests**

Run:

```bash
bun --cwd apps/web test test/dashboard-contract.test.ts test/group-journey.test.ts
```

Expected: PASS.

- [ ] **Step 9: Run typecheck**

Run:

```bash
bun --cwd apps/web typecheck
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/features/dashboard/dashboard-page.tsx apps/web/src/styles/recipes.css apps/web/test/dashboard-contract.test.ts
git commit -m "feat(web): restyle dashboard"
```

---

### Task 5: Group subpages migration

**Files:**
- Modify: `apps/web/src/app/groups/[groupId]/envelopes/page.tsx`
- Modify: `apps/web/src/app/groups/[groupId]/activity/page.tsx`
- Modify: `apps/web/src/app/groups/[groupId]/reports/page.tsx`
- Modify: `apps/web/src/app/groups/[groupId]/settings/page.tsx`
- Modify: `apps/web/src/styles/recipes.css`
- Test: `apps/web/test/navigation-contract.test.ts`

**Interfaces:**
- Consumes: `AppShell`, `PageHeader`, `EnvelopeCard`, shared table/card recipes.
- Produces: same route components and unchanged API calls:
  - `/groups/${params.groupId}/envelopes`
  - `/groups/${params.groupId}/dashboard`
  - `/groups/${params.groupId}/members`
  - `/groups/${params.groupId}/invites`

- [ ] **Step 1: Extend navigation contract for screen choices**

Append to `apps/web/test/navigation-contract.test.ts`:

```ts

describe('group subpage layout contract', () => {
  test('envelopes page uses tabs in hero header and app shell', () => {
    const page = source('../src/app/groups/[groupId]/envelopes/page.tsx');
    expect(page).toContain('<AppShell groupId={params.groupId} active="envelopes">');
    expect(page).toContain('title="Envelopes"');
    expect(page).toContain("tabs={[");
    expect(page).toContain("{ label: 'Active', active: true }");
    expect(page).toContain("{ label: 'Archived' }");
  });

  test('activity page uses date-grouped card rows', () => {
    const page = source('../src/app/groups/[groupId]/activity/page.tsx');
    expect(page).toContain('<AppShell groupId={params.groupId} active="activity">');
    expect(page).toContain('Today');
    expect(page).toContain('Earlier');
    expect(page).toContain('wallet-table-card');
  });

  test('reports page uses KPI chart and spending cards', () => {
    const page = source('../src/app/groups/[groupId]/reports/page.tsx');
    expect(page).toContain('<AppShell groupId={params.groupId} active="activity">');
    expect(page).toContain('wallet-report-chart');
    expect(page).toContain('wallet-spending-card');
    expect(page).toContain('Spent this month');
  });

  test('settings page uses profile header and sectioned cards', () => {
    const page = source('../src/app/groups/[groupId]/settings/page.tsx');
    expect(page).toContain('<AppShell groupId={params.groupId} active="settings">');
    expect(page).toContain('wallet-settings-profile');
    expect(page).toContain('Group');
    expect(page).toContain('Appearance');
    expect(page).toContain('Account');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun --cwd apps/web test test/navigation-contract.test.ts
```

Expected: FAIL because the routes have not adopted `AppShell` yet.

- [ ] **Step 3: Migrate Envelopes page**

In `apps/web/src/app/groups/[groupId]/envelopes/page.tsx`:

1. Add imports:

```ts
import { AppShell } from '../../../../components/app-shell';
import { PageHeader } from '../../../../components/header';
```

2. Replace outer `<Container size="lg" py="xl">` with:

```tsx
    <AppShell groupId={params.groupId} active="envelopes">
      <PageHeader
        overline="Group envelopes"
        title="Envelopes"
        description="Balances, archived status, and funding needs for every group envelope."
        tone="success"
        tabs={[
          { label: 'Active', active: true },
          { label: 'Archived' },
        ]}
      />
      <Stack gap="lg">
        {/* existing error/loading/empty/grid content */}
      </Stack>
    </AppShell>
```

3. Remove unused `Container` and `Title` imports after replacing the heading.

- [ ] **Step 4: Migrate Activity page**

In `apps/web/src/app/groups/[groupId]/activity/page.tsx`:

1. Add imports:

```ts
import { AppShell } from '../../../../components/app-shell';
import { PageHeader } from '../../../../components/header';
```

2. Add helper before the component return:

```ts
const todayItems = dashboard?.recentActivity.filter((item) => new Date(item.occurredAt).toDateString() === new Date().toDateString()) ?? [];
const earlierItems = dashboard?.recentActivity.filter((item) => new Date(item.occurredAt).toDateString() !== new Date().toDateString()) ?? [];
```

3. Replace the current return with:

```tsx
    <AppShell groupId={params.groupId} active="activity" narrow>
      <PageHeader
        overline="Ledger"
        title="Activity"
        description="A chronological ledger of envelope funding, transfers, and expenses."
        tone="info"
      />
      <Stack gap="lg">
        {error ? <Alert color="red">{error}</Alert> : null}
        {isLoading ? <Group justify="center"><Loader /></Group> : null}
        {!isLoading && dashboard?.recentActivity.length === 0 ? (
          <Alert color="blue" title="No activity yet">
            Funding entries, envelope transfers, and expense confirmations appear here once your group starts using envelopes.
          </Alert>
        ) : null}
        <ActivityGroup title="Today" items={todayItems} moneyFormatter={moneyFormatter} />
        <ActivityGroup title="Earlier" items={earlierItems} moneyFormatter={moneyFormatter} />
      </Stack>
    </AppShell>
```

4. Add helper component in the same file:

```tsx
function ActivityGroup({ title, items, moneyFormatter }: { title: string; items: NonNullable<DashboardSummary['recentActivity']>; moneyFormatter: Intl.NumberFormat }) {
  if (items.length === 0) return null;
  return (
    <section className="wallet-section">
      <div className="wallet-overline">{title}</div>
      <div className="wallet-table-card">
        <div className="wallet-table-header"><span /> <span>Item</span><span>Amount</span></div>
        {items.map((item) => {
          const status = item.type === 'expense' ? 'wallet-status-danger' : item.type === 'funding' ? 'wallet-status-success' : '';
          return (
            <div key={`${item.type}-${item.id}`} className="wallet-table-row">
              <span className={`wallet-status-dot ${status}`} aria-hidden="true" />
              <div>
                <strong>{item.title}</strong>
                <div className="wallet-muted">{item.type} · {new Date(item.occurredAt).toLocaleString()}</div>
              </div>
              <strong>{moneyFormatter.format(item.amountMinor / 100)}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Migrate Reports page**

In `apps/web/src/app/groups/[groupId]/reports/page.tsx`:

1. Add imports:

```ts
import { AppShell } from '../../../../components/app-shell';
import { PageHeader } from '../../../../components/header';
```

2. Replace outer shell with:

```tsx
    <AppShell groupId={params.groupId} active="activity">
      <PageHeader
        overline="Reports"
        title="Spending overview"
        description="Envelope totals, monthly spending, attention counts, and recurring obligations."
        tone="warn"
      />
      <Stack gap="lg">
        {/* existing error/loading */}
        {dashboard ? (
          <>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
              <article className="wallet-card wallet-card-success"><div className="wallet-overline">Total available</div><div className="wallet-summary-value">{moneyFormatter.format(dashboard.totalAvailableMinor / 100)}</div></article>
              <article className="wallet-card wallet-card-danger"><div className="wallet-overline">Spent this month</div><div className="wallet-summary-value">{moneyFormatter.format(dashboard.spentThisMonthMinor / 100)}</div></article>
              <article className="wallet-card wallet-card-warn"><div className="wallet-overline">Overspent envelopes</div><div className="wallet-summary-value">{dashboard.overspent.length}</div></article>
              <article className="wallet-card wallet-card-info"><div className="wallet-overline">Upcoming recurring</div><div className="wallet-summary-value">{dashboard.upcomingRecurring.length}</div></article>
            </SimpleGrid>
            <section className="wallet-card wallet-report-chart">
              <div className="wallet-section-heading"><div><div className="wallet-overline">6-month spend</div><h2>Recent trend</h2></div></div>
              <div className="wallet-chart-bars" aria-label="Illustrative spending trend">
                {[42, 54, 48, 66, 52, 72].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
              </div>
            </section>
            <section className="wallet-section">
              <div className="wallet-overline">Envelope spending cards</div>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                {dashboard.envelopes.map((envelope) => (
                  <article key={envelope.id} className={envelope.balanceMinor < 0 ? 'wallet-spending-card wallet-card wallet-card-danger' : 'wallet-spending-card wallet-card wallet-card-info'}>
                    <div className="wallet-card-heading"><h3>{envelope.name}</h3><span className="wallet-pill">{envelope.archivedAt ? 'Archived' : 'Active'}</span></div>
                    <div className="wallet-money">{moneyFormatter.format(envelope.balanceMinor / 100)}</div>
                  </article>
                ))}
              </SimpleGrid>
            </section>
          </>
        ) : null}
      </Stack>
    </AppShell>
```

The chart is intentionally CSS-only and illustrative because the current API only provides current dashboard totals, not real six-month series data. Do not add a fake API field.

- [ ] **Step 6: Migrate Settings page**

In `apps/web/src/app/groups/[groupId]/settings/page.tsx`:

1. Add imports:

```ts
import { AppShell } from '../../../../components/app-shell';
import { PageHeader } from '../../../../components/header';
```

2. Replace outer shell with:

```tsx
    <AppShell groupId={params.groupId} active="settings" narrow>
      <PageHeader
        overline="Household"
        title="Settings"
        description="Manage household members, roles, invite links, appearance, and account actions."
        tone="info"
        actions={<Button className="wallet-button-secondary" onClick={() => void createInvite()} loading={isCreatingInvite}>Create invite</Button>}
      />
      <Stack gap="lg">
        <section className="wallet-card wallet-settings-profile">
          <div className="wallet-avatar" aria-hidden="true">W</div>
          <h2>Wallet household</h2>
          <p className="wallet-muted">{members.length} members · INR</p>
        </section>
        {error ? <Alert color="red">{error}</Alert> : null}
        {inviteUrl ? <Alert color="teal" title="Invite link">Share this link with a household member: {inviteUrl}</Alert> : null}
        {isLoading ? <Group justify="center"><Loader /></Group> : null}
        <SettingsSection title="Group">
          {/* existing members list */}
        </SettingsSection>
        <SettingsSection title="Appearance">
          <div className="wallet-table-row"><span className="wallet-status-dot" /><strong>Theme</strong><span>Dark</span></div>
          <div className="wallet-table-row"><span className="wallet-status-dot wallet-status-success" /><strong>Accent</strong><span>Indigo</span></div>
        </SettingsSection>
        <SettingsSection title="Account">
          <div className="wallet-table-row"><span className="wallet-status-dot wallet-status-warn" /><strong>Notifications</strong><span>On</span></div>
        </SettingsSection>
      </Stack>
    </AppShell>
```

3. Add helper:

```tsx
function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="wallet-section">
      <div className="wallet-overline">{title}</div>
      <div className="wallet-table-card">{children}</div>
    </section>
  );
}
```

4. Keep the existing members map, but render each member as a `.wallet-table-row`:

```tsx
{members.map((member) => (
  <div key={member.user.id} className="wallet-table-row">
    <span className="wallet-status-dot wallet-status-success" aria-hidden="true" />
    <div>
      <strong>{member.user.displayName}</strong>
      <div className="wallet-muted">{member.user.email}</div>
    </div>
    <Badge>{member.role}</Badge>
  </div>
))}
```

- [ ] **Step 7: Add reports/settings recipes**

Append to `apps/web/src/styles/recipes.css`:

```css
.wallet-report-chart {
  min-height: 260px;
}

.wallet-chart-bars {
  display: flex;
  align-items: end;
  gap: var(--space-3);
  height: 160px;
  margin-top: var(--space-6);
}

.wallet-chart-bars span {
  flex: 1;
  min-height: 20%;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  background: linear-gradient(180deg, var(--color-accent-border), var(--color-accent));
  box-shadow: 0 8px 18px rgba(59, 130, 246, 0.22);
}

.wallet-spending-card {
  min-height: 150px;
}

.wallet-settings-profile {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: var(--space-3);
}

.wallet-settings-profile h2 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-h2-size);
}

.wallet-avatar {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-accent), var(--color-success));
  color: #0b0b0e;
  font-size: 24px;
  font-weight: 800;
}
```

- [ ] **Step 8: Run subpage tests**

Run:

```bash
bun --cwd apps/web test test/navigation-contract.test.ts
```

Expected: PASS.

- [ ] **Step 9: Run typecheck**

Run:

```bash
bun --cwd apps/web typecheck
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/app/groups/[groupId]/envelopes/page.tsx apps/web/src/app/groups/[groupId]/activity/page.tsx apps/web/src/app/groups/[groupId]/reports/page.tsx apps/web/src/app/groups/[groupId]/settings/page.tsx apps/web/src/styles/recipes.css apps/web/test/navigation-contract.test.ts
git commit -m "feat(web): restyle group subpages"
```

---

### Task 6: Auth, onboarding, and invite screens

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/login/page.tsx`
- Modify: `apps/web/src/app/signup/page.tsx`
- Modify: `apps/web/src/app/groups/new/page.tsx`
- Modify: `apps/web/src/app/invites/[token]/page.tsx`
- Modify: `apps/web/src/styles/recipes.css`
- Test: `apps/web/test/auth-shell-contract.test.ts`
- Test: `apps/web/test/group-journey.test.ts`

**Interfaces:**
- Consumes: `AuthSheetShell`, `.wallet-input-shell`, `.wallet-button-primary`, `.wallet-button-secondary`.
- Produces: same route components and unchanged behavior:
  - Login uses `/auth/login`, `setAccessToken`, and `getSafeNextPath(nextPath)`.
  - Signup uses `/auth/signup`, `setAccessToken`, and `getSafeNextPath(nextPath)`.
  - New group uses `/groups` and redirects to `/groups/${group.id}`.
  - Invite accept preserves login/signup next links and `/invites/${token}/accept`.

- [ ] **Step 1: Write auth shell contract test**

Create `apps/web/test/auth-shell-contract.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('auth and invite screen contract', () => {
  test('login keeps auth behavior while using bottom sheet chrome', () => {
    const page = source('../src/app/login/page.tsx');
    expect(page).toContain("import { AuthSheetShell } from '../../components/sheet';");
    expect(page).toContain("apiClient.request<AuthResponse>('/auth/login'");
    expect(page).toContain('setAccessToken(response.accessToken);');
    expect(page).toContain('router.push(getSafeNextPath(nextPath));');
    expect(page).toContain('<AuthSheetShell');
    expect(page).toContain('wallet-input-shell');
  });

  test('signup keeps auth behavior while using bottom sheet chrome', () => {
    const page = source('../src/app/signup/page.tsx');
    expect(page).toContain("import { AuthSheetShell } from '../../components/sheet';");
    expect(page).toContain("apiClient.request<AuthResponse>('/auth/signup'");
    expect(page).toContain('setAccessToken(response.accessToken);');
    expect(page).toContain('router.push(getSafeNextPath(nextPath));');
    expect(page).toContain('<AuthSheetShell');
  });

  test('new group keeps create and redirect behavior', () => {
    const page = source('../src/app/groups/new/page.tsx');
    expect(page).toContain("import { AuthSheetShell } from '../../../components/sheet';");
    expect(page).toContain("apiClient.request<GroupResponse>('/groups'");
    expect(page).toContain('router.push(`/groups/${group.id}`);');
    expect(page).toContain('<AuthSheetShell');
  });

  test('invite accept keeps next links and accept call', () => {
    const page = source('../src/app/invites/[token]/page.tsx');
    expect(page).toContain("import { AuthSheetShell } from '../../../components/sheet';");
    expect(page).toContain('`/login?next=${encodeURIComponent(invitePath)}`');
    expect(page).toContain('`/signup?next=${encodeURIComponent(invitePath)}`');
    expect(page).toContain('`/invites/${token}/accept`');
    expect(page).toContain('<AuthSheetShell');
    expect(page).toContain('wallet-invite-card');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun --cwd apps/web test test/auth-shell-contract.test.ts
```

Expected: FAIL because auth routes still use Mantine `Container` shells.

- [ ] **Step 3: Migrate landing page**

Replace `apps/web/src/app/page.tsx` with:

```tsx
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
```

- [ ] **Step 4: Migrate login page**

In `apps/web/src/app/login/page.tsx`:

1. Add import:

```ts
import { AuthSheetShell } from '../../components/sheet';
```

2. Remove `Container`, `Stack`, `Text`, and `Title` from Mantine imports if no longer used.

3. Replace the current return inside `LoginForm` with:

```tsx
  return (
    <AuthSheetShell
      title="Welcome back"
      description="Log in to your Wallet"
      footer={(
        <>
          <Button component={Link} href="/signup" className="wallet-button-secondary">Sign up</Button>
          <Button type="submit" form="login-form" className="wallet-button-primary" loading={isSubmitting}>Log in</Button>
        </>
      )}
    >
      <form id="login-form" onSubmit={form.onSubmit(submit)} className="wallet-input-shell">
        {error ? <Alert color="red">{error}</Alert> : null}
        <TextInput label="Email" type="email" autoComplete="email" required {...form.getInputProps('email')} />
        <PasswordInput label="Password" autoComplete="current-password" required {...form.getInputProps('password')} />
        <div className="wallet-muted">New to Wallet? <Anchor component={Link} href="/signup">Create an account</Anchor></div>
      </form>
    </AuthSheetShell>
  );
```

- [ ] **Step 5: Migrate signup page**

In `apps/web/src/app/signup/page.tsx`:

1. Add import:

```ts
import { AuthSheetShell } from '../../components/sheet';
```

2. Replace the current return inside `SignupForm` with:

```tsx
  return (
    <AuthSheetShell
      title="Create account"
      description="Start sharing envelope budgets with your household"
      footer={(
        <>
          <Button component={Link} href="/login" className="wallet-button-secondary">Log in</Button>
          <Button type="submit" form="signup-form" className="wallet-button-primary" loading={isSubmitting}>Create account</Button>
        </>
      )}
    >
      <form id="signup-form" onSubmit={form.onSubmit(submit)} className="wallet-input-shell">
        {error ? <Alert color="red">{error}</Alert> : null}
        <TextInput label="Display name" autoComplete="name" required {...form.getInputProps('displayName')} />
        <TextInput label="Email" type="email" autoComplete="email" required {...form.getInputProps('email')} />
        <PasswordInput label="Password" autoComplete="new-password" required {...form.getInputProps('password')} />
        <div className="wallet-muted">Already have an account? <Anchor component={Link} href="/login">Log in</Anchor></div>
      </form>
    </AuthSheetShell>
  );
```

- [ ] **Step 6: Migrate new group page**

In `apps/web/src/app/groups/new/page.tsx`:

1. Add import:

```ts
import { AuthSheetShell } from '../../../components/sheet';
```

2. Replace the current return with:

```tsx
  return (
    <AuthSheetShell
      title="Create group"
      description="Set up a shared Wallet group for your household"
      footer={<Button type="submit" form="new-group-form" className="wallet-button-primary" loading={isSubmitting}>Create group</Button>}
    >
      <form id="new-group-form" onSubmit={form.onSubmit(submit)} className="wallet-input-shell">
        {error ? <Alert color="red">{error}</Alert> : null}
        <TextInput label="Group name" required {...form.getInputProps('name')} />
        <Select label="Currency" data={['INR', 'USD', 'EUR', 'GBP']} required allowDeselect={false} {...form.getInputProps('currency')} />
      </form>
    </AuthSheetShell>
  );
```

Keep `initialValues: { name: '', currency: 'USD' }` unchanged unless the product owner separately asks for INR default.

- [ ] **Step 7: Migrate invite accept page**

In `apps/web/src/app/invites/[token]/page.tsx`:

1. Add import:

```ts
import { AuthSheetShell } from '../../../components/sheet';
```

2. Define hero JSX inside `InvitePage` before return:

```tsx
  const inviteHero = (
    <article className="wallet-card wallet-invite-card wallet-card-success">
      <div className="wallet-auth-mark" aria-hidden="true" />
      <div className="wallet-overline">You've been invited to</div>
      <h1 className="wallet-title">Household</h1>
      <div className="wallet-invite-pills">
        <span className="wallet-pill">3 members</span>
        <span className="wallet-pill">INR</span>
      </div>
      <p className="wallet-muted">Join this Wallet group to share envelope budgets.</p>
    </article>
  );
```

3. Replace the current return with:

```tsx
  return (
    <AuthSheetShell
      title="Join this group"
      description="Sign in or create an account to continue"
      hero={inviteHero}
      footer={(
        <>
          <Button component={Link} href={`/signup?next=${encodeURIComponent(invitePath)}`} className="wallet-button-secondary">Sign up</Button>
          <Button component={Link} href={`/login?next=${encodeURIComponent(invitePath)}`} className="wallet-button-primary">Log in</Button>
        </>
      )}
    >
      <div className="wallet-input-shell">
        {!accessToken ? (
          <div className="wallet-alert">
            <span className="wallet-alert-icon" aria-hidden="true">i</span>
            <div>Use an existing account or create one, then return here to accept this invite.</div>
          </div>
        ) : null}
        {error ? <Alert color="red">{error}</Alert> : null}
        {acceptedGroupId ? <Alert color="teal">Invite accepted for group {acceptedGroupId}.</Alert> : null}
        <Button onClick={acceptInvite} loading={isSubmitting} disabled={!token || !accessToken || Boolean(acceptedGroupId)} className="wallet-button-primary">
          Accept invite
        </Button>
      </div>
    </AuthSheetShell>
  );
```

- [ ] **Step 8: Add landing/invite recipes**

Append to `apps/web/src/styles/recipes.css`:

```css
.wallet-landing-card {
  display: grid;
  justify-items: center;
  gap: var(--space-5);
  width: min(100%, 420px);
  padding: var(--space-8) var(--space-6);
  text-align: center;
}

.wallet-invite-card {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  width: min(100%, 420px);
  padding: var(--space-6);
  text-align: center;
}

.wallet-invite-pills {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
}
```

- [ ] **Step 9: Run auth and journey tests**

Run:

```bash
bun --cwd apps/web test test/auth-shell-contract.test.ts test/group-journey.test.ts
```

Expected: PASS.

- [ ] **Step 10: Run typecheck**

Run:

```bash
bun --cwd apps/web typecheck
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/login/page.tsx apps/web/src/app/signup/page.tsx apps/web/src/app/groups/new/page.tsx apps/web/src/app/invites/[token]/page.tsx apps/web/src/styles/recipes.css apps/web/test/auth-shell-contract.test.ts
git commit -m "feat(web): restyle auth and onboarding"
```

---

### Task 7: Full verification and visual QA

**Files:**
- Modify only if verification finds real implementation defects.
- Test: all `apps/web/test/*.test.ts`
- Test: TypeScript project `apps/web/tsconfig.json`
- Test: Next build for `apps/web`

**Interfaces:**
- Consumes: completed Tasks 1–6.
- Produces: verified branch ready for code review or merge.

- [ ] **Step 1: Run all web tests**

Run:

```bash
bun --cwd apps/web test
```

Expected: PASS for:
- `api-client.test.ts`
- `auth-shell-contract.test.ts`
- `dashboard-contract.test.ts`
- `group-journey.test.ts`
- `navigation-contract.test.ts`
- `offline-cache.test.ts`
- `pwa-shell.test.ts`
- `theme-contract.test.ts`

- [ ] **Step 2: Run typecheck**

Run:

```bash
bun --cwd apps/web typecheck
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
bun --cwd apps/web build
```

Expected: PASS and no missing CSS/module errors.

- [ ] **Step 4: Run existing root tests**

Run:

```bash
bun test
```

Expected: PASS. This verifies the web changes did not break workspace-level tests.

- [ ] **Step 5: Browser visual QA against real app**

Run the app with the existing scripts and a real API/database environment available to the workspace:

```bash
bun --cwd apps/web dev
```

Open these routes at 360×780 viewport using the Browser tool, with a real group id/token created through the existing app flow:

- `/`
- `/login`
- `/signup`
- `/groups/new`
- `/groups/<real-group-id>`
- `/groups/<real-group-id>/envelopes`
- `/groups/<real-group-id>/activity`
- `/groups/<real-group-id>/reports`
- `/groups/<real-group-id>/settings`
- `/invites/<real-invite-token>`

Expected visual checks:
- Background is `#0e0e10` on every screen.
- Top-level group screens show the hero-card page header.
- Bottom nav is visible on group screens and does not cover content.
- Center Add target is visible in the pill dock.
- Forms appear in bottom-sheet chrome on phone viewport.
- Alerts use tonal + icon-chip treatment.
- Envelopes use elevated + glass cards.
- Activity rows use card-row table treatment with leading status dots.
- Reports page shows KPI cards, CSS bar chart, and per-envelope cards.
- Settings page uses profile header plus Group / Appearance / Account sections.

Do not use mocked API responses for this QA. If real API setup is unavailable, finish all automated verification and report visual QA as blocked with the exact missing prerequisite.

- [ ] **Step 6: Fix defects found by verification**

For each real defect, make the smallest source fix, then rerun the narrow failing command first. Example:

```bash
bun --cwd apps/web test test/navigation-contract.test.ts
bun --cwd apps/web typecheck
```

Expected: the previously failing command passes before moving on.

- [ ] **Step 7: Final verification rerun**

After any fix, rerun:

```bash
bun --cwd apps/web test
bun --cwd apps/web typecheck
bun --cwd apps/web build
```

Expected: all PASS.

- [ ] **Step 8: Commit final verification fixes**

If Step 6 changed files:

```bash
git add apps/web
git commit -m "fix(web): polish wallet theme migration"
```

If Step 6 changed no files, skip this commit.

---

## Self-Review

### Spec coverage

- CSS-variable design system: Task 1.
- Mantine retained as component engine: Tasks 1–6 keep Mantine and do not add a UI library.
- Page header: Task 2 creates `PageHeader`; Tasks 4–5 apply it.
- Bottom navigation: Task 2 creates `BottomNav`; Tasks 4–5 apply it via `AppShell`.
- Modal/sheet chrome: Task 2 creates `AuthSheetShell`; Task 6 applies it to auth/onboarding/invite screens.
- Every existing screen migrated: Tasks 4–6 cover landing, auth, new group, invite, dashboard, envelopes, activity, reports, settings.
- Dark token values: Task 1 tests exact values.
- Light theme deferred but token-ready: Task 1 includes `html[data-theme='light']` skeletal override.
- No API/data-flow change: Tasks 3–6 explicitly preserve existing API calls, form ids, and redirects.
- Tests: Tasks 1–7 add source-contract tests and run existing tests/typecheck/build.
- Visual QA: Task 7 uses Browser tool against real app data; no mocked API responses.

### Placeholder scan

Placeholder scan completed: the task steps contain exact paths, interfaces, class names, commands, and expected outcomes.

### Type consistency

- `BottomNavActive` values are `home | envelopes | activity | settings` everywhere.
- `AppShell` consumes `BottomNavActive` and passes it to `BottomNav`.
- `PageHeader` `tone` values match recipe classes: `info | success | warn | danger`.
- `AuthSheetShell` props are used consistently by login, signup, new group, and invite accept.
- `EnvelopeFormsProps` and `FormKind` remain unchanged from the existing source and tests.
