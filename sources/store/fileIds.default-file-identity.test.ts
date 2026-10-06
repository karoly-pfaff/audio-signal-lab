import { it, expect } from 'vitest';
import { defaultSession } from './persistence';
// Suite: default file identity
it('each default file has a stable string id of the form "layer-N"', () => {
  const session = defaultSession();
  session.files.forEach((l, i) => {
    expect(l.id).toBe(`layer-${i}`);
  });
});
it('each default file has an order equal to its position', () => {
  const session = defaultSession();
  session.files.forEach((l, i) => {
    expect(l.order).toBe(i);
  });
});
it('default files do not have a slot field', () => {
  const session = defaultSession();
  session.files.forEach((l) => {
    expect(Object.keys(l)).not.toContain('slot');
  });
});
