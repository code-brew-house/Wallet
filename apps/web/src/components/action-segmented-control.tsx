import { SegmentedControl } from '@mantine/core';
import type { FormKind } from '../features/envelopes/envelope-forms';

interface ActionSegmentedControlProps {
  value: FormKind;
  onChange(value: FormKind): void;
}

const data: Array<{ value: FormKind; label: string }> = [
  { value: 'expense', label: 'Add' },
  { value: 'funding', label: 'Fund' },
  { value: 'transfer', label: 'Move' },
  { value: 'recurring', label: 'Plan' },
];

export function ActionSegmentedControl({ value, onChange }: ActionSegmentedControlProps) {
  return (
    <SegmentedControl
      className="wallet-action-segmented"
      value={value}
      onChange={(nextValue) => onChange(nextValue as FormKind)}
      data={data}
      fullWidth
    />
  );
}
