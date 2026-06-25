import { describe, expect, test } from 'bun:test';
import { assertPositiveMinorUnit, formatMoneyMinor } from './money';

describe('money helpers', () => {
  test('formats integer minor units without floating point input', () => {
    expect(formatMoneyMinor(123456, 'INR')).toBe('₹1,234.56');
  });

  test('rejects non-positive or fractional minor-unit amounts', () => {
    expect(() => assertPositiveMinorUnit(0)).toThrow('amountMinor must be a positive integer');
    expect(() => assertPositiveMinorUnit(10.5)).toThrow('amountMinor must be a positive integer');
  });
});
