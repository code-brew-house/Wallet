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

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const { setAccessToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm({
    initialValues: { displayName: '', email: '', password: '' },
    validate: {
      displayName: (value) => (value.trim().length > 0 ? null : 'Display name is required'),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Enter a valid email'),
      password: (value) => (value.length >= 8 ? null : 'Password must be at least 8 characters'),
    },
  });

  async function submit(values: typeof form.values) {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await apiClient.request<AuthResponse>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ displayName: values.displayName, email: values.email, password: values.password }),
      });
      setAccessToken(response.accessToken);
      router.push(getSafeNextPath(nextPath));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign up');
    } finally {
      setIsSubmitting(false);
    }
  }

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
        {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}
        <TextInput label="Display name" autoComplete="name" required {...form.getInputProps('displayName')} />
        <TextInput label="Email" type="email" autoComplete="email" required {...form.getInputProps('email')} />
        <PasswordInput label="Password" autoComplete="new-password" required {...form.getInputProps('password')} />
        <div className="wallet-muted">Already have an account? <Anchor component={Link} href="/login">Log in</Anchor></div>
      </form>
    </AuthSheetShell>
  );
}
