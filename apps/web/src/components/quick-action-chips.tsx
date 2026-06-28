import type { FormKind } from '../features/envelopes/envelope-forms';

interface QuickActionChipsProps {
  onSelect(form: FormKind): void;
}

const actions: Array<{ form: FormKind; label: string; primary?: boolean }> = [
  { form: 'expense', label: '+ Add expense', primary: true },
  { form: 'funding', label: '+ Fund' },
  { form: 'transfer', label: '⇄ Transfer' },
  { form: 'recurring', label: '↻ Recurring' },
];

export function QuickActionChips({ onSelect }: QuickActionChipsProps) {
  return (
    <div className="wallet-quick-actions" aria-label="Quick actions">
      {actions.map((action) => (
        <button
          key={action.form}
          type="button"
          className={`wallet-chip ${action.primary ? 'wallet-chip-primary' : 'wallet-chip-secondary'}`}
          onClick={() => onSelect(action.form)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
