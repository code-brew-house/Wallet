'use client';

import { Select, SimpleGrid, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect, useMemo, useState } from 'react';
import { ActionSheet } from '../../components/action-sheet';
import { StepperSheet } from '../../components/stepper-sheet';
import type { EnvelopeSummary } from '../dashboard/types';
type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

export interface EnvelopeFormsProps {
  envelopes: EnvelopeSummary[];
  openedForm: FormKind | null;
  onCloseForm(): void;
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

export type FormKind = 'expense' | 'funding' | 'transfer' | 'recurring';

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

export function EnvelopeForms({ envelopes, currency, openedForm, onCloseForm, onAddExpense, onFundEnvelope, onTransfer, onCreateRecurring }: EnvelopeFormsProps) {
  const activeEnvelopes = useMemo(() => envelopes.filter((envelope) => !envelope.archivedAt), [envelopes]);
  const envelopeOptions = useMemo(
    () => activeEnvelopes.map((envelope) => ({ value: envelope.id, label: envelope.name })),
    [activeEnvelopes],
  );
  const firstEnvelopeId = activeEnvelopes[0]?.id ?? '';
  const secondEnvelopeId = activeEnvelopes[1]?.id ?? firstEnvelopeId;
  const hasEnvelopes = activeEnvelopes.length > 0;
  const sheetMetadata = ['Wallet action', currency, 'Active envelopes only'];
  const [submittingForm, setSubmittingForm] = useState<FormKind | null>(null);
  const [recurringStep, setRecurringStep] = useState(1);

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

  useEffect(() => {
    if (openedForm !== 'recurring') setRecurringStep(1);
  }, [openedForm]);

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
      onCloseForm();
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
      onCloseForm();
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
      onCloseForm();
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
      onCloseForm();
    } catch {
      return;
    } finally {
      setSubmittingForm(null);
    }
  }

  return (
    <>

      <ActionSheet opened={openedForm === 'expense'} title="Add expense" description={`Amounts are entered in ${currency} and saved in minor units.`} metadata={sheetMetadata} formId="expense-form" submitLabel="Save" submitting={submittingForm === 'expense'} onClose={onCloseForm}>
        <form onSubmit={expenseForm.onSubmit(submitExpense)} id="expense-form" className="wallet-input-shell">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select label="Envelope" data={envelopeOptions} required allowDeselect={false} {...expenseForm.getInputProps('envelopeId')} />
            <TextInput label="Amount" inputMode="decimal" required {...expenseForm.getInputProps('amount')} />
            <TextInput label="Spent on" type="date" required {...expenseForm.getInputProps('spentAt')} />
            <TextInput label="Title" required {...expenseForm.getInputProps('title')} />
          </SimpleGrid>
          <Textarea mt="md" label="Note" autosize minRows={2} {...expenseForm.getInputProps('note')} />
        </form>
      </ActionSheet>

      <ActionSheet opened={openedForm === 'funding'} title="Fund envelope" description={`Amounts are entered in ${currency} and saved in minor units.`} metadata={sheetMetadata} formId="funding-form" submitLabel="Save" submitting={submittingForm === 'funding'} onClose={onCloseForm}>
        <form onSubmit={fundingForm.onSubmit(submitFunding)} id="funding-form" className="wallet-input-shell">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select label="Envelope" data={envelopeOptions} required allowDeselect={false} {...fundingForm.getInputProps('envelopeId')} />
            <TextInput label="Amount" inputMode="decimal" required {...fundingForm.getInputProps('amount')} />
          </SimpleGrid>
          <Textarea mt="md" label="Note" autosize minRows={2} {...fundingForm.getInputProps('note')} />
        </form>
      </ActionSheet>

      <ActionSheet opened={openedForm === 'transfer'} title="Transfer" description={`Amounts are entered in ${currency} and saved in minor units.`} metadata={sheetMetadata} formId="transfer-form" submitLabel="Save" submitDisabled={activeEnvelopes.length < 2} submitting={submittingForm === 'transfer'} onClose={onCloseForm}>
        <form onSubmit={transferForm.onSubmit(submitTransfer)} id="transfer-form" className="wallet-input-shell">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Select label="From" data={envelopeOptions} required allowDeselect={false} {...transferForm.getInputProps('fromEnvelopeId')} />
            <Select label="To" data={envelopeOptions} required allowDeselect={false} {...transferForm.getInputProps('toEnvelopeId')} />
            <TextInput label="Amount" inputMode="decimal" required {...transferForm.getInputProps('amount')} />
          </SimpleGrid>
          <Textarea mt="md" label="Note" autosize minRows={2} {...transferForm.getInputProps('note')} />
        </form>
      </ActionSheet>

      <StepperSheet
        opened={openedForm === 'recurring'}
        title="Create recurring"
        description={`Amounts are entered in ${currency} and saved in minor units.`}
        metadata={sheetMetadata}
        currentStep={recurringStep}
        totalSteps={3}
        canGoNext={hasEnvelopes}
        submitting={submittingForm === 'recurring'}
        onBack={() => setRecurringStep((step) => Math.max(1, step - 1))}
        onNext={() => setRecurringStep((step) => Math.min(3, step + 1))}
        onClose={onCloseForm}
        onSubmit={() => recurringForm.onSubmit(submitRecurring)()}
      >
        <form onSubmit={recurringForm.onSubmit(submitRecurring)} id="recurring-form" className="wallet-input-shell">
          {recurringStep === 1 ? (
            <Select label="Envelope" data={envelopeOptions} required allowDeselect={false} {...recurringForm.getInputProps('envelopeId')} />
          ) : null}
          {recurringStep === 2 ? (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput label="Amount" inputMode="decimal" required {...recurringForm.getInputProps('amount')} />
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
          ) : null}
          {recurringStep === 3 ? (
            <>
              <TextInput label="Title" required {...recurringForm.getInputProps('title')} />
              <Textarea mt="md" label="Note" autosize minRows={2} {...recurringForm.getInputProps('note')} />
            </>
          ) : null}
        </form>
      </StepperSheet>
    </>
  );
}
