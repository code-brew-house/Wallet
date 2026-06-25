'use client';

import { Alert, Badge, Button, Card, Container, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../../lib/api-client';

interface GroupMember {
  role: 'owner' | 'admin' | 'member';
  user: { id: string; email: string; displayName: string };
}

interface InviteResponse {
  token?: string;
}

export default function GroupSettingsPage() {
  const params = useParams<{ groupId: string }>();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.request<GroupMember[]>(`/groups/${params.groupId}/members`);
        if (!cancelled) setMembers(response);
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load group settings');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadMembers();
    return () => {
      cancelled = true;
    };
  }, [params.groupId]);

  async function createInvite() {
    setIsCreatingInvite(true);
    setError(null);
    try {
      const invite = await apiClient.request<InviteResponse>(`/groups/${params.groupId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ expiresInHours: 72 }),
      });
      if (invite.token) setInviteUrl(`${window.location.origin}/invites/${invite.token}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create invite');
    } finally {
      setIsCreatingInvite(false);
    }
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="start">
          <div>
            <Title order={1}>Settings</Title>
            <Text c="dimmed">Manage household members, roles, and invite links for this group.</Text>
          </div>
          <Button onClick={() => void createInvite()} loading={isCreatingInvite}>Create invite</Button>
        </Group>
        {error ? <Alert color="red">{error}</Alert> : null}
        {inviteUrl ? <Alert color="teal" title="Invite link">Share this link with a household member: {inviteUrl}</Alert> : null}
        {isLoading ? <Group justify="center"><Loader /></Group> : null}
        {!isLoading && members.length === 0 ? (
          <Alert color="blue" title="No members found">
            Group members, ownership, and role management controls appear here when memberships are available.
          </Alert>
        ) : null}
        <Stack gap="sm">
          {members.map((member) => (
            <Card key={member.user.id} withBorder radius="md" padding="md">
              <Group justify="space-between">
                <div>
                  <Text fw={700}>{member.user.displayName}</Text>
                  <Text size="sm" c="dimmed">{member.user.email}</Text>
                </div>
                <Badge>{member.role}</Badge>
              </Group>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
