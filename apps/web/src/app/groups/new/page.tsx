'use client';

import { useEffect, useState } from 'react';
import { Button, Select, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { AuthSheetShell } from '../../../components/sheet';
import { AlertBanner } from '../../../components/alert-banner';

interface GroupResponse {
  id: string;
  name: string;
  currency: string;
}

interface GroupListItem {
  id: string;
  name: string;
  currency: string;
}

export default function NewGroupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingGroups, setExistingGroups] = useState<GroupListItem[]>([]);
  const form = useForm({
    initialValues: { name: '', currency: 'USD' },
    validate: {
      name: (value) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) return 'Group name is required';
        if (trimmed.length > 80) return 'Group name must be 80 characters or fewer';
        const lower = trimmed.toLowerCase();
        if (existingGroups.some((group) => group.name.toLowerCase() === lower)) {
          return 'You already have a group with this name';
        }
        return null;
      },
      currency: (value) => (['INR', 'USD', 'EUR', 'GBP'].includes(value) ? null : 'Choose a supported currency'),
    },
  });

  useEffect(() => {
    let cancelled = false;
    async function loadExistingGroups() {
      try {
        const groups = await apiClient.request<GroupListItem[]>('/groups');
        if (!cancelled) setExistingGroups(groups);
      } catch {
        if (!cancelled) setExistingGroups([]);
      }
    }
    void loadExistingGroups();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(values: typeof form.values) {
    setError(null);
    setIsSubmitting(true);
    try {
      const group = await apiClient.request<GroupResponse>('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: values.name.trim(), currency: values.currency }),
      });
      router.push(`/groups/${group.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create group');
    } finally {
      setIsSubmitting(false);
    }
  }

  const firstGroup = existingGroups[0];

  return (
    <AuthSheetShell
      title="Create group"
      description="Set up a shared Wallet group for your household"
      footer={
        <>
          {firstGroup ? (
            <Button component={Link} href={`/groups/${firstGroup.id}`} className="wallet-button-secondary">
              Open existing group
            </Button>
          ) : null}
          <Button type="submit" form="new-group-form" className="wallet-button-primary" loading={isSubmitting}>
            Create group
          </Button>
        </>
      }
    >
      <form id="new-group-form" onSubmit={form.onSubmit(submit)} className="wallet-input-shell">
        {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}
        {firstGroup ? (
          <AlertBanner variant="warn" title="You already have a group">
            Continue to {firstGroup.name} unless you need a separate household.
          </AlertBanner>
        ) : null}
        <TextInput label="Group name" required {...form.getInputProps('name')} />
        <Select label="Currency" data={['INR', 'USD', 'EUR', 'GBP']} required allowDeselect={false} {...form.getInputProps('currency')} />
      </form>
    </AuthSheetShell>
  );
}
