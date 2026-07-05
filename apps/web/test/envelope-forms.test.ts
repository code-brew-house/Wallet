import { describe, expect, test } from 'bun:test';
import { amountToMinor, positiveAmount } from '../src/features/envelopes/envelope-forms';

describe('envelope form amount parsing', () => {
  test('accepts comma-formatted decimal amounts', () => {
    expect(amountToMinor('1,234.56')).toBe(123456);
    expect(positiveAmount('1,234.56')).toBeNull();
  });
});
