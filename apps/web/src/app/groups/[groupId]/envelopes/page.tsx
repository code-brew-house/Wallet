'use client';

import { Button, Group, Loader, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ActionSheet } from '../../../../components/action-sheet';
import { AppShell } from '../../../../components/app-shell';
import { PageHeader } from '../../../../components/header';
import { AlertBanner } from '../../../../components/alert-banner';
import type { EnvelopeSummary } from '../../../../features/dashboard/types';
import { EnvelopeCard } from '../../../../features/envelopes/envelope-card';
import { EnvelopeForms, type FormKind } from '../../../../features/envelopes/envelope-forms';
import { apiClient } from '../../../../lib/api-client';
import { useGroupCurrency } from '../../../../lib/group-currency';
import { notifyWalletDataChanged } from '../../../../lib/wallet-data-refresh';

export default function GroupEnvelopesPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;
  const [envelopes, setEnvelopes] = useState<EnvelopeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createEnvelopeOpened, setCreateEnvelopeOpened] = useState(false);
  const [isCreatingEnvelope, setIsCreatingEnvelope] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [openedForm, setOpenedForm] = useState<FormKind | null>(null);
  const currency = useGroupCurrency(groupId);

  const createEnvelopeForm = useForm<{ name: string }>({
    initialValues: { name: '' },
    validate: {
      name: (value) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) return 'Envelope name is required';
        return trimmed.length <= 80 ? null : 'Envelope name must be 80 characters or fewer';
      },
    },
  });

  const loadEnvelopes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.request<EnvelopeSummary[]>(`/groups/${groupId}/envelopes`);
      setEnvelopes(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load envelopes');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialEnvelopes() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.request<EnvelopeSummary[]>(`/groups/${groupId}/envelopes`);
        if (!cancelled) setEnvelopes(response);
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load envelopes');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadInitialEnvelopes();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  async function createEnvelope(values: { name: string }) {
    const name = values.name.trim();
    setIsCreatingEnvelope(true);
    setError(null);
    setActionMessage(null);
    try {
      const createdEnvelope = await apiClient.request<EnvelopeSummary>(`/groups/${groupId}/envelopes`, {
        method: 'POST',
        body: JSON.stringify({ name: values.name.trim() }),
      });
      await loadEnvelopes();
      setEnvelopes((currentEnvelopes) => currentEnvelopes.some((envelope) => envelope.id === createdEnvelope.id) ? currentEnvelopes : [...currentEnvelopes, createdEnvelope]);
      setActionMessage(`Envelope created: ${name}`);
      notifyWalletDataChanged();
      createEnvelopeForm.setValues({ name: '' });
      setCreateEnvelopeOpened(false);
    } catch (requestError) {
      setCreateEnvelopeOpened(false);
      setError(requestError instanceof Error ? requestError.message : 'Unable to create envelope');
    } finally {
      setIsCreatingEnvelope(false);
    }
  }

  async function fundEnvelope(values: { envelopeId: string; amountMinor: number; note?: string }) {
    setError(null);
    setActionMessage(null);
    try {
      await apiClient.request(`/groups/${groupId}/envelopes/${values.envelopeId}/funding`, {
        method: 'POST',
        body: JSON.stringify({ amountMinor: values.amountMinor, ...(values.note ? { note: values.note } : {}) }),
      });
      await loadEnvelopes();
      setActionMessage('Envelope funded');
      notifyWalletDataChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to fund envelope');
      throw requestError;
    }
  }

  async function transferEnvelope(values: { fromEnvelopeId: string; toEnvelopeId: string; amountMinor: number; note?: string }) {
    setError(null);
    setActionMessage(null);
    try {
      await apiClient.request(`/groups/${groupId}/transfers`, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      await loadEnvelopes();
      setActionMessage('Transfer completed');
      notifyWalletDataChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to transfer between envelopes');
      throw requestError;
    }
  }

  const activeEnvelopeCount = envelopes.filter((envelope) => !envelope.archivedAt).length;

  return (
    <AppShell groupId={groupId} active="envelopes">
      <PageHeader
        overline="Group envelopes"
        title="Envelopes"
        description="Create, fund, and transfer between budget envelopes."
        tone="success"
        actions={(
          <Group gap="sm">
            <Button className="wallet-button-success" onClick={() => setCreateEnvelopeOpened(true)}>Create envelope</Button>
            <Button className="wallet-button-primary" onClick={() => setOpenedForm('funding')} disabled={activeEnvelopeCount === 0}>Fund</Button>
            <Button className="wallet-button-secondary" onClick={() => setOpenedForm('transfer')} disabled={activeEnvelopeCount < 2}>Transfer</Button>
          </Group>
        )}
        tabs={[
          { label: 'Active', active: true },
          { label: 'Archived' },
        ]}
      />
      <Stack gap="lg">
        {actionMessage ? <AlertBanner variant="success">{actionMessage}</AlertBanner> : null}
        {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}
        {isLoading ? <Group justify="center"><Loader /></Group> : null}
        {!isLoading && envelopes.length === 0 ? (
          <AlertBanner title="No envelopes yet">
            <Stack gap="sm" align="flex-start">
              <span>Budget categories such as groceries, rent, travel, and subscriptions appear here after they are created.</span>
              <Button className="wallet-button-success" onClick={() => setCreateEnvelopeOpened(true)}>Create envelope</Button>
            </Stack>
          </AlertBanner>
        ) : null}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {envelopes.map((envelope) => <EnvelopeCard key={envelope.id} envelope={envelope} currency={currency} />)}
        </SimpleGrid>
      </Stack>

      <ActionSheet
        opened={createEnvelopeOpened}
        title="Create envelope"
        description="Name a budget category for this group. You can fund it after it is created."
        metadata={['Envelope setup']}
        formId="create-envelope-form"
        submitLabel="Create"
        submitting={isCreatingEnvelope}
        onClose={() => setCreateEnvelopeOpened(false)}
      >
        <form id="create-envelope-form" onSubmit={createEnvelopeForm.onSubmit(createEnvelope)} className="wallet-input-shell">
          <TextInput label="Envelope name" placeholder="Groceries" required {...createEnvelopeForm.getInputProps('name')} />
        </form>
      </ActionSheet>

      <EnvelopeForms
        envelopes={envelopes}
        openedForm={openedForm}
        onCloseForm={() => setOpenedForm(null)}
        currency={currency}
        allowedForms={['funding', 'transfer']}
        onFundEnvelope={fundEnvelope}
        onTransfer={transferEnvelope}
      />
    </AppShell>
  );
}
