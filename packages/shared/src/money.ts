export type MoneyMinor = number;

export function assertPositiveMinorUnit(amountMinor: number): asserts amountMinor is MoneyMinor {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('amountMinor must be a positive integer');
  }
}

export function formatMoneyMinor(amountMinor: MoneyMinor, currency: string): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amountMinor / 100);
}
