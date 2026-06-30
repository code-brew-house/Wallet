'use client';

import { Badge, Button, Group, Loader, Stack } from '@mantine/core';
import { useParams } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { PageHeader } from '../../../../components/header';
import { AlertBanner } from '../../../../components/alert-banner';
import { apiClient } from '../../../../lib/api-client';
import { useGroupCurrency } from '../../../../lib/group-currency';

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
  const currency = useGroupCurrency(params.groupId);

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
          <p className="wallet-muted">{members.length} members · {currency}</p>
        </section>
        {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}
        {inviteUrl ? <AlertBanner variant="success" title="Invite link">Share this link with a household member: {inviteUrl}</AlertBanner> : null}
        {isLoading ? <Group justify="center"><Loader /></Group> : null}
        {!isLoading && members.length === 0 ? (
          <AlertBanner title="No members found">
            Group members, ownership, and role management controls appear here when memberships are available.
          </AlertBanner>
        ) : null}
        <SettingsSection title="Group">
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
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="wallet-section">
      <div className="wallet-overline">{title}</div>
      <div className="wallet-table-card">{children}</div>
    </section>
  );
}
