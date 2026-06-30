'use client';

import { Button, Select, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiClient } from '../../../lib/api-client';
import { AuthSheetShell } from '../../../components/sheet';
import { AlertBanner } from '../../../components/alert-banner';

interface GroupResponse {
  id: string;
  name: string;
  currency: string;
}

export default function NewGroupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm({
    initialValues: { name: '', currency: 'USD' },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Group name is required'),
      currency: (value) => (['INR', 'USD', 'EUR', 'GBP'].includes(value) ? null : 'Choose a supported currency'),
    },
  });

  async function submit(values: typeof form.values) {
    setError(null);
    setIsSubmitting(true);
    try {
      const group = await apiClient.request<GroupResponse>('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: values.name, currency: values.currency }),
      });
      router.push(`/groups/${group.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create group');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthSheetShell
      title="Create group"
      description="Set up a shared Wallet group for your household"
      footer={<Button type="submit" form="new-group-form" className="wallet-button-primary" loading={isSubmitting}>Create group</Button>}
    >
      <form id="new-group-form" onSubmit={form.onSubmit(submit)} className="wallet-input-shell">
        {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}
        <TextInput label="Group name" required {...form.getInputProps('name')} />
        <Select label="Currency" data={['INR', 'USD', 'EUR', 'GBP']} required allowDeselect={false} {...form.getInputProps('currency')} />
      </form>
    </AuthSheetShell>
  );
}
