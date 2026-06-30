'use client';

import { Anchor, Button, PasswordInput, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-store';
import { getSafeNextPath } from '../../lib/next-path';
import { AuthSheetShell } from '../../components/sheet';
import { AlertBanner } from '../../components/alert-banner';

interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; displayName: string };
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const { setAccessToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Enter a valid email'),
      password: (value) => (value.length >= 8 ? null : 'Password must be at least 8 characters'),
    },
  });

  async function submit(values: typeof form.values) {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await apiClient.request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      setAccessToken(response.accessToken);
      router.push(getSafeNextPath(nextPath));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to log in');
    } finally {
      setIsSubmitting(false);
    }
  }

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
        {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}
        <TextInput label="Email" type="email" autoComplete="email" required {...form.getInputProps('email')} />
        <PasswordInput label="Password" autoComplete="current-password" required {...form.getInputProps('password')} />
        <div className="wallet-muted">New to Wallet? <Anchor component={Link} href="/signup">Create an account</Anchor></div>
      </form>
    </AuthSheetShell>
  );
}
