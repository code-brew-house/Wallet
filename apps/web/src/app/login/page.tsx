'use client';

import { Alert, Anchor, Button, Container, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-store';
import { getSafeNextPath } from '../../lib/next-path';

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
    <Container size="xs" py="xl">
      <form onSubmit={form.onSubmit(submit)}>
        <Stack gap="md">
          <Title order={1}>Log in</Title>
          <Text c="dimmed">Access your Wallet group budgets.</Text>
          {error ? <Alert color="red">{error}</Alert> : null}
          <TextInput label="Email" type="email" autoComplete="email" required {...form.getInputProps('email')} />
          <PasswordInput label="Password" autoComplete="current-password" required {...form.getInputProps('password')} />
          <Button type="submit" loading={isSubmitting}>Log in</Button>
          <Text size="sm">
            New to Wallet? <Anchor component={Link} href="/signup">Create an account</Anchor>
          </Text>
        </Stack>
      </form>
    </Container>
  );
}
