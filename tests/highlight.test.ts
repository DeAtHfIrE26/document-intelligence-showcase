import { describe, expect, it } from 'vitest';
import { buildSegments, renderSegments } from '../src/lib/highlight';

describe('buildSegments', () => {
  const text = 'Abraham Lincoln spoke at Gettysburg in 1863.';

  it('splits text around entities in order', () => {
    const segments = buildSegments(text, [
      { start: 25, end: 35, type: 'GPE' },
      { start: 0, end: 15, type: 'PERSON' },
    ]);
    expect(segments).toEqual([
      { kind: 'entity', text: 'Abraham Lincoln', type: 'PERSON', id: undefined },
      { kind: 'text', text: ' spoke at ' },
      { kind: 'entity', text: 'Gettysburg', type: 'GPE', id: undefined },
      { kind: 'text', text: ' in 1863.' },
    ]);
  });

  it('drops empty, reversed and out-of-range spans', () => {
    const segments = buildSegments(text, [
      { start: 5, end: 5, type: 'X' },
      { start: 9, end: 3, type: 'X' },
      { start: -2, end: 4, type: 'X' },
      { start: 40, end: 99, type: 'X' },
    ]);
    expect(segments).toEqual([{ kind: 'text', text }]);
  });

  it('skips spans that overlap an earlier one, preferring the longer start', () => {
    const segments = buildSegments(text, [
      { start: 8, end: 15, type: 'SHORT' },
      { start: 0, end: 15, type: 'LONG' },
      { start: 0, end: 7, type: 'INNER' },
    ]);
    expect(segments.filter((segment) => segment.kind === 'entity').map((segment) => segment.kind === 'entity' && segment.type)).toEqual(['LONG']);
  });

  it('maps document offsets into a chunk with `offset`', () => {
    const chunk = text.slice(25);
    const segments = buildSegments(chunk, [{ start: 25, end: 35, type: 'GPE' }], 25);
    expect(segments[0]).toMatchObject({ kind: 'entity', text: 'Gettysburg' });
  });

  it('round-trips: segments always rebuild the original text', () => {
    const spans = [{ start: 0, end: 7, type: 'A' }, { start: 3, end: 12, type: 'B' }, { start: 25, end: 35, type: 'C' }];
    expect(buildSegments(text, spans).map((segment) => segment.text).join('')).toBe(text);
  });
});

describe('renderSegments', () => {
  it('renders marks with type data and never parses markup from the text', () => {
    const container = document.createElement('div');
    const payload = '<img src=x onerror="window.__pwned=1">';
    renderSegments(container, [
      { kind: 'text', text: payload },
      { kind: 'entity', text: '<b>ACME</b>', type: 'ORG', id: 7 },
    ]);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    const mark = container.querySelector('mark');
    expect(mark?.textContent).toBe('<b>ACME</b>');
    expect(mark?.dataset).toMatchObject({ entityType: 'ORG', entityId: '7' });
    expect(mark?.className).toBe('entity entity--org');
    expect(container.textContent).toBe(`${payload}<b>ACME</b>`);
  });

  it('sanitises the type used in the class name', () => {
    const container = document.createElement('div');
    renderSegments(container, [{ kind: 'entity', text: 'x', type: 'ORG" onclick="x' }]);
    expect(container.querySelector('mark')?.className).toBe('entity entity--orgonclickx');
  });
});
