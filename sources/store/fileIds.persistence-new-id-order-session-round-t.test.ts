import { it, expect } from 'vitest';
import { defaultSession, parseSessionBody } from './persistence';
// Suite: persistence — new id/order session round-trip
it('round-trips id and order through save/parse', () => {
  const original = defaultSession();
  original.files.push({
    id: 'file-0',
    order: 0,
    volume: 1,
    filename: null,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  });
  original.files.push({
    id: 'file-1',
    order: 1,
    volume: 1,
    filename: null,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  });
  original.files.push({
    id: 'file-2',
    order: 2,
    volume: 1,
    filename: null,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  });
  original.files.push({
    id: 'file-3',
    order: 3,
    volume: 0.4,
    filename: null,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  });
  const serialized = JSON.parse(JSON.stringify(original)) as Record<string, unknown>;
  const parsed = parseSessionBody(serialized);
  parsed.files.forEach((l, i) => {
    expect(l.id).toBe(`file-${i}`);
    expect(l.order).toBe(i);
  });
  expect(parsed.files[3].volume).toBe(0.4);
});
