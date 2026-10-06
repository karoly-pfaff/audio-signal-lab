import { it, expect } from 'vitest';
import { formatIdentityWarning } from './fileIdentity';
// Suite: formatIdentityWarning
it('returns null for likely match', () => {
  expect(formatIdentityWarning('likely')).toBeNull();
});
it('returns null for unknown (no reference to compare against)', () => {
  expect(formatIdentityWarning('unknown')).toBeNull();
});
it('returns a calm warning string for possible-mismatch', () => {
  const msg = formatIdentityWarning('possible-mismatch');
  expect(msg).not.toBeNull();
  expect(typeof msg).toBe('string');
  expect(msg!.length).toBeGreaterThan(20);
});
it('possible-mismatch warning mentions session reference and duration', () => {
  const msg = formatIdentityWarning('possible-mismatch')!;
  expect(msg.toLowerCase()).toContain('session reference');
  expect(msg.toLowerCase()).toContain('duration');
});
