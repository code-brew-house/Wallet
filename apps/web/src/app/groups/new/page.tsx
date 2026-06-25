'use client';

import { Alert, Button, Container, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { apiClient } from '../../../lib/api-client';

interface GroupResponse {
  id: string;
  name: string;
  currency: string;
}

export default function NewGroupPage() {
  const [error, setError] = useState<string | null>(null);
  const [createdGroup, setCreatedGroup] = useState<GroupResponse | null>(null);
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
    setCreatedGroup(null);
    setIsSubmitting(true);
    try {
      const group = await apiClient.request<GroupResponse>('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: values.name, currency: values.currency }),
      });
      setCreatedGroup(group);
      form.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create group');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Container size="xs" py="xl">
      <form onSubmit={form.onSubmit(submit)}>
        <Stack gap="md">
          <Title order={1}>Create group</Title>
          <Text c="dimmed">Set up a shared Wallet group for your household.</Text>
          {error ? <Alert color="red">{error}</Alert> : null}
          {createdGroup ? <Alert color="green">Created {createdGroup.name} with {createdGroup.currency} budgets.</Alert> : null}
          <TextInput label="Group name" required {...form.getInputProps('name')} />
          <Select
            label="Currency"
            data={['INR', 'USD', 'EUR', 'GBP']}
            required
            allowDeselect={false}
            {...form.getInputProps('currency')}
          />
          <Button type="submit" loading={isSubmitting}>Create group</Button>
        </Stack>
      </form>
    </Container>
  );
}
