'use client';

import { Button, Card, Group, Select, SimpleGrid, Stack, Tabs, Text, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect, useMemo, useState } from 'react';
import type { EnvelopeSummary } from '../dashboard/types';

type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

export interface EnvelopeFormsProps {
  envelopes: EnvelopeSummary[];
  currency: string;
  onAddExpense(values: { envelopeId: string; amountMinor: number; spentAt: string; title: string; note?: string }): Promise<void>;
  onFundEnvelope(values: { envelopeId: string; amountMinor: number; note?: string }): Promise<void>;
  onTransfer(values: { fromEnvelopeId: string; toEnvelopeId: string; amountMinor: number; note?: string }): Promise<void>;
  onCreateRecurring(values: {
    envelopeId: string;
    amountMinor: number;
    title: string;
    frequency: RecurringFrequency;
    nextDueAt: string;
    note?: string;
  }): Promise<void>;
}

interface ExpenseFormValues {
  envelopeId: string;
  amount: string;
  spentAt: string;
  title: string;
  note: string;
}

interface FundingFormValues {
  envelopeId: string;
  amount: string;
  note: string;
}

interface TransferFormValues {
  fromEnvelopeId: string;
  toEnvelopeId: string;
  amount: string;
  note: string;
}

interface RecurringFormValues {
  envelopeId: string;
  amount: string;
  title: string;
  frequency: RecurringFrequency;
  nextDueAt: string;
  note: string;
}

type FormKind = 'expense' | 'funding' | 'transfer' | 'recurring';

function todayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function amountToMinor(amount: string) {
  return Math.round(Number(amount) * 100);
}

function positiveAmount(value: string) {
  const amountMinor = amountToMinor(value);
  return Number.isFinite(amountMinor) && amountMinor > 0 ? null : 'Enter an amount greater than 0';
}

function dateValueToIso(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function notePayload(note: string): { note?: string } {
  const trimmed = note.trim();
  return trimmed.length > 0 ? { note: trimmed } : {};
}

export function EnvelopeForms({ envelopes, currency, onAddExpense, onFundEnvelope, onTransfer, onCreateRecurring }: EnvelopeFormsProps) {
  const activeEnvelopes = useMemo(() => envelopes.filter((envelope) => !envelope.archivedAt), [envelopes]);
  const envelopeOptions = useMemo(
    () => activeEnvelopes.map((envelope) => ({ value: envelope.id, label: envelope.name })),
    [activeEnvelopes],
  );
  const firstEnvelopeId = activeEnvelopes[0]?.id ?? '';
  const secondEnvelopeId = activeEnvelopes[1]?.id ?? firstEnvelopeId;
  const hasEnvelopes = activeEnvelopes.length > 0;
  const [submittingForm, setSubmittingForm] = useState<FormKind | null>(null);

  const expenseForm = useForm<ExpenseFormValues>({
    initialValues: { envelopeId: firstEnvelopeId, amount: '', spentAt: todayDateValue(), title: '', note: '' },
    validate: {
      envelopeId: (value) => (value ? null : 'Choose an envelope'),
      amount: positiveAmount,
      spentAt: (value) => (value ? null : 'Choose a spending date'),
      title: (value) => (value.trim().length > 0 ? null : 'Expense title is required'),
    },
  });
  const fundingForm = useForm<FundingFormValues>({
    initialValues: { envelopeId: firstEnvelopeId, amount: '', note: '' },
    validate: {
      envelopeId: (value) => (value ? null : 'Choose an envelope'),
      amount: positiveAmount,
    },
  });
  const transferForm = useForm<TransferFormValues>({
    initialValues: { fromEnvelopeId: firstEnvelopeId, toEnvelopeId: secondEnvelopeId, amount: '', note: '' },
    validate: {
      fromEnvelopeId: (value) => (value ? null : 'Choose a source envelope'),
      toEnvelopeId: (value, values) => {
        if (!value) return 'Choose a destination envelope';
        return value === values.fromEnvelopeId ? 'Choose a different destination envelope' : null;
      },
      amount: positiveAmount,
    },
  });
  const recurringForm = useForm<RecurringFormValues>({
    initialValues: { envelopeId: firstEnvelopeId, amount: '', title: '', frequency: 'monthly', nextDueAt: todayDateValue(), note: '' },
    validate: {
      envelopeId: (value) => (value ? null : 'Choose an envelope'),
      amount: positiveAmount,
      title: (value) => (value.trim().length > 0 ? null : 'Recurring title is required'),
      nextDueAt: (value) => (value ? null : 'Choose the next due date'),
    },
  });

  useEffect(() => {
    if (!firstEnvelopeId) return;
    if (!expenseForm.values.envelopeId) expenseForm.setFieldValue('envelopeId', firstEnvelopeId);
    if (!fundingForm.values.envelopeId) fundingForm.setFieldValue('envelopeId', firstEnvelopeId);
    if (!transferForm.values.fromEnvelopeId) transferForm.setFieldValue('fromEnvelopeId', firstEnvelopeId);
    if (!transferForm.values.toEnvelopeId) transferForm.setFieldValue('toEnvelopeId', secondEnvelopeId);
    if (!recurringForm.values.envelopeId) recurringForm.setFieldValue('envelopeId', firstEnvelopeId);
  }, [firstEnvelopeId, secondEnvelopeId]);

  async function submitExpense(values: ExpenseFormValues) {
    setSubmittingForm('expense');
    try {
      await onAddExpense({
        envelopeId: values.envelopeId,
        amountMinor: amountToMinor(values.amount),
        spentAt: dateValueToIso(values.spentAt),
        title: values.title.trim(),
        ...notePayload(values.note),
      });
      expenseForm.setValues({ envelopeId: values.envelopeId, amount: '', spentAt: todayDateValue(), title: '', note: '' });
    } catch {
      return;
    } finally {
      setSubmittingForm(null);
    }
  }

  async function submitFunding(values: FundingFormValues) {
    setSubmittingForm('funding');
    try {
      await onFundEnvelope({ envelopeId: values.envelopeId, amountMinor: amountToMinor(values.amount), ...notePayload(values.note) });
      fundingForm.setValues({ envelopeId: values.envelopeId, amount: '', note: '' });
    } catch {
      return;
    } finally {
      setSubmittingForm(null);
    }
  }

  async function submitTransfer(values: TransferFormValues) {
    setSubmittingForm('transfer');
    try {
      await onTransfer({
        fromEnvelopeId: values.fromEnvelopeId,
        toEnvelopeId: values.toEnvelopeId,
        amountMinor: amountToMinor(values.amount),
        ...notePayload(values.note),
      });
      transferForm.setValues({ fromEnvelopeId: values.fromEnvelopeId, toEnvelopeId: values.toEnvelopeId, amount: '', note: '' });
    } catch {
      return;
    } finally {
      setSubmittingForm(null);
    }
  }

  async function submitRecurring(values: RecurringFormValues) {
    setSubmittingForm('recurring');
    try {
      await onCreateRecurring({
        envelopeId: values.envelopeId,
        amountMinor: amountToMinor(values.amount),
        title: values.title.trim(),
        frequency: values.frequency,
        nextDueAt: dateValueToIso(values.nextDueAt),
        ...notePayload(values.note),
      });
      recurringForm.setValues({ envelopeId: values.envelopeId, amount: '', title: '', frequency: values.frequency, nextDueAt: todayDateValue(), note: '' });
    } catch {
      return;
    } finally {
      setSubmittingForm(null);
    }
  }

  return (
    <Card withBorder radius="lg" padding="lg" id="dashboard-actions">
      <Stack gap="md">
        <div>
          <Text fw={700}>Envelope actions</Text>
          <Text size="sm" c="dimmed">Amounts are entered in {currency} and saved in minor units.</Text>
        </div>
        {!hasEnvelopes ? <Text c="dimmed">Create an envelope before adding expenses, funding, transfers, or recurring plans.</Text> : null}
        <Tabs defaultValue="expense" keepMounted={false}>
          <Tabs.List grow>
            <Tabs.Tab value="expense">Add expense</Tabs.Tab>
            <Tabs.Tab value="funding">Fund envelope</Tabs.Tab>
            <Tabs.Tab value="transfer">Transfer</Tabs.Tab>
            <Tabs.Tab value="recurring">Recurring</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="expense" pt="md">
            <form onSubmit={expenseForm.onSubmit(submitExpense)} id="expense-form">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Select label="Envelope" data={envelopeOptions} required allowDeselect={false} {...expenseForm.getInputProps('envelopeId')} />
                <TextInput label="Amount" inputMode="decimal" required {...expenseForm.getInputProps('amount')} />
                <TextInput label="Spent on" type="date" required {...expenseForm.getInputProps('spentAt')} />
                <TextInput label="Title" required {...expenseForm.getInputProps('title')} />
              </SimpleGrid>
              <Textarea mt="md" label="Note" autosize minRows={2} {...expenseForm.getInputProps('note')} />
              <Group justify="end" mt="md">
                <Button type="submit" disabled={!hasEnvelopes} loading={submittingForm === 'expense'}>Add expense</Button>
              </Group>
            </form>
          </Tabs.Panel>

          <Tabs.Panel value="funding" pt="md">
            <form onSubmit={fundingForm.onSubmit(submitFunding)} id="funding-form">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Select label="Envelope" data={envelopeOptions} required allowDeselect={false} {...fundingForm.getInputProps('envelopeId')} />
                <TextInput label="Amount" inputMode="decimal" required {...fundingForm.getInputProps('amount')} />
              </SimpleGrid>
              <Textarea mt="md" label="Note" autosize minRows={2} {...fundingForm.getInputProps('note')} />
              <Group justify="end" mt="md">
                <Button type="submit" disabled={!hasEnvelopes} loading={submittingForm === 'funding'}>Fund envelope</Button>
              </Group>
            </form>
          </Tabs.Panel>

          <Tabs.Panel value="transfer" pt="md">
            <form onSubmit={transferForm.onSubmit(submitTransfer)} id="transfer-form">
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <Select label="From" data={envelopeOptions} required allowDeselect={false} {...transferForm.getInputProps('fromEnvelopeId')} />
                <Select label="To" data={envelopeOptions} required allowDeselect={false} {...transferForm.getInputProps('toEnvelopeId')} />
                <TextInput label="Amount" inputMode="decimal" required {...transferForm.getInputProps('amount')} />
              </SimpleGrid>
              <Textarea mt="md" label="Note" autosize minRows={2} {...transferForm.getInputProps('note')} />
              <Group justify="end" mt="md">
                <Button type="submit" disabled={activeEnvelopes.length < 2} loading={submittingForm === 'transfer'}>Transfer</Button>
              </Group>
            </form>
          </Tabs.Panel>

          <Tabs.Panel value="recurring" pt="md">
            <form onSubmit={recurringForm.onSubmit(submitRecurring)} id="recurring-form">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Select label="Envelope" data={envelopeOptions} required allowDeselect={false} {...recurringForm.getInputProps('envelopeId')} />
                <TextInput label="Amount" inputMode="decimal" required {...recurringForm.getInputProps('amount')} />
                <TextInput label="Title" required {...recurringForm.getInputProps('title')} />
                <Select
                  label="Frequency"
                  data={[
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'yearly', label: 'Yearly' },
                  ]}
                  allowDeselect={false}
                  required
                  {...recurringForm.getInputProps('frequency')}
                />
                <TextInput label="Next due date" type="date" required {...recurringForm.getInputProps('nextDueAt')} />
              </SimpleGrid>
              <Textarea mt="md" label="Note" autosize minRows={2} {...recurringForm.getInputProps('note')} />
              <Group justify="end" mt="md">
                <Button type="submit" disabled={!hasEnvelopes} loading={submittingForm === 'recurring'}>Create recurring</Button>
              </Group>
            </form>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Card>
  );
}
