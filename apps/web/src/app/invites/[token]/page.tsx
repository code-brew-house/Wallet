'use client';

import { Button } from '@mantine/core';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { apiClient } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-store';
import { AuthSheetShell } from '../../../components/sheet';
import { AlertBanner } from '../../../components/alert-banner';

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
          <AlertBanner>
            Use an existing account or create one, then return here to accept this invite.
          </AlertBanner>
        ) : null}
        {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}
        {acceptedGroupId ? <AlertBanner variant="success">Invite accepted for group {acceptedGroupId}.</AlertBanner> : null}
        <Button onClick={acceptInvite} loading={isSubmitting} disabled={!token || !accessToken || Boolean(acceptedGroupId)} className="wallet-button-primary">
          Accept invite
        </Button>
      </div>
    </AuthSheetShell>
  );
}
