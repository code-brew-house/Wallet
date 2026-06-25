'use client';

import { Alert, Button, Container, Stack, Text, Title } from '@mantine/core';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { apiClient } from '../../../lib/api-client';

export default function InvitePage() {
  const params = useParams<{ token: string | string[] }>();
  const token = useMemo(() => {
    const value = params.token;
    return Array.isArray(value) ? value[0] : value;
  }, [params.token]);
  const [error, setError] = useState<string | null>(null);
  const [acceptedGroupId, setAcceptedGroupId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function acceptInvite() {
    if (!token) {
      setError('Invite token is missing');
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
        {error ? <Alert color="red">{error}</Alert> : null}
        {acceptedGroupId ? <Alert color="green">Invite accepted for group {acceptedGroupId}.</Alert> : null}
        <Button onClick={acceptInvite} loading={isSubmitting} disabled={!token || Boolean(acceptedGroupId)}>
          Accept invite
        </Button>
      </Stack>
    </Container>
  );
}
