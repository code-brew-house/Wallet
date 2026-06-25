'use client';

import { Alert, Anchor, Button, Container, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { apiClient } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-store';

export default function InvitePage() {
  const params = useParams<{ token: string | string[] }>();
  const { accessToken } = useAuth();
  const token = useMemo(() => {
    const value = params.token;
    return Array.isArray(value) ? value[0] : value;
  }, [params.token]);
  const invitePath = token ? `/invites/${encodeURIComponent(token)}` : '/invites';
  const [error, setError] = useState<string | null>(null);
  const [acceptedGroupId, setAcceptedGroupId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function acceptInvite() {
    if (!token) {
      setError('Invite token is missing');
      return;
    }
    if (!accessToken) {
      setError('Log in or create an account before accepting this invite.');
      return;
    }

    setError(null);
    setAcceptedGroupId(null);
    setIsSubmitting(true);
    try {
      const response = await apiClient.request<{ groupId: string }>(`/invites/${token}/accept`, { method: 'POST' });
      setAcceptedGroupId(response.groupId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to accept invite');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Container size="xs" py="xl">
      <Stack gap="md">
        <Title order={1}>Accept invite</Title>
        <Text c="dimmed">Join this Wallet group to share envelope budgets.</Text>
        {!accessToken ? (
          <Alert color="blue" title="Log in to accept this invite">
            <Stack gap="xs">
              <Text size="sm">Use an existing account or create one, then return here to accept this invite.</Text>
              <Text size="sm">
                <Anchor component={Link} href={`/login?next=${encodeURIComponent(invitePath)}`}>Log in</Anchor>
                {' or '}
                <Anchor component={Link} href={`/signup?next=${encodeURIComponent(invitePath)}`}>create an account</Anchor>
              </Text>
            </Stack>
          </Alert>
        ) : null}
        <Button onClick={acceptInvite} loading={isSubmitting} disabled={!token || !accessToken || Boolean(acceptedGroupId)}>
          Accept invite
        </Button>
      </Stack>
    </Container>
  );
}
