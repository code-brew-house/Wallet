'use client';

import { Badge, Button, Group, Loader, PasswordInput, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useParams, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { PageHeader } from '../../../../components/header';
import { AlertBanner } from '../../../../components/alert-banner';
import { ActionSheet } from '../../../../components/action-sheet';
import { apiClient } from '../../../../lib/api-client';
import { useGroupCurrency } from '../../../../lib/group-currency';
import { useAuth } from '../../../../lib/auth-store';

interface GroupMember {
  role: 'owner' | 'admin' | 'member';
  user: { id: string; email: string; displayName: string };
}

interface InviteResponse {
  token?: string;
}

interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; displayName: string };
}

export default function GroupSettingsPage() {
  const params = useParams<{ groupId: string }>();
  const router = useRouter();
  const { setAccessToken } = useAuth();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountMessage, setAccountMessage] = useState<{ variant: 'success' | 'danger' | 'info'; text: string } | null>(null);
  const [isPasswordSheetOpen, setIsPasswordSheetOpen] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

  async function logout() {
    setIsLoggingOut(true);
    setError(null);
    try {
      await apiClient.request<{ ok: true }>('/auth/logout', { method: 'POST' });
    } catch (requestError) {
      setIsLoggingOut(false);
      setError(requestError instanceof Error ? requestError.message : 'Unable to log out');
      return;
    }
    setAccessToken(null);
    void router.replace('/login');
  }

  const passwordForm = useForm({
    initialValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    validate: {
      currentPassword: (value) => (value.length >= 8 ? null : 'Password must be at least 8 characters'),
      newPassword: (value) => (value.length >= 8 ? null : 'Password must be at least 8 characters'),
      confirmPassword: (value, values) => (value === values.newPassword ? null : 'Passwords do not match'),
    },
  });

  async function submitPasswordChange(values: typeof passwordForm.values) {
    setIsUpdatingPassword(true);
    setError(null);
    try {
      const response = await apiClient.request<AuthResponse>('/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
      });
      setAccessToken(response.accessToken);
      passwordForm.reset();
      setIsPasswordSheetOpen(false);
      setAccountMessage({ variant: 'success', text: 'Password updated. Use the new password next time you log in.' });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update password');
    } finally {
      setIsUpdatingPassword(false);
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
          {accountMessage ? <AlertBanner variant={accountMessage.variant}>{accountMessage.text}</AlertBanner> : null}
          <div className="wallet-table-row">
            <span className="wallet-status-dot wallet-status-info" aria-hidden="true" />
            <strong>Change password</strong>
            <Button className="wallet-button-secondary" onClick={() => { setIsPasswordSheetOpen(true); setError(null); setAccountMessage(null); }}>Change password</Button>
          </div>
          <div className="wallet-table-row">
            <span className="wallet-status-dot wallet-status-danger" aria-hidden="true" />
            <strong>Log out</strong>
            <Button className="wallet-button-danger" loading={isLoggingOut} onClick={() => void logout()}>Log out</Button>
          </div>
        </SettingsSection>
      </Stack>
      <ActionSheet
        opened={isPasswordSheetOpen}
        title="Change password"
        formId="change-password-form"
        submitLabel="Update password"
        submitting={isUpdatingPassword}
        onClose={() => { if (!isUpdatingPassword) { setIsPasswordSheetOpen(false); passwordForm.reset(); } }}
      >
        <form id="change-password-form" onSubmit={passwordForm.onSubmit(submitPasswordChange)} className="wallet-input-shell">
          {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}
          <PasswordInput label="Current password" autoComplete="current-password" required {...passwordForm.getInputProps('currentPassword')} />
          <PasswordInput label="New password" autoComplete="new-password" required {...passwordForm.getInputProps('newPassword')} />
          <PasswordInput label="Confirm new password" autoComplete="new-password" required {...passwordForm.getInputProps('confirmPassword')} />
        </form>
      </ActionSheet>
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
