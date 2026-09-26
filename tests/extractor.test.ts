import { describe, expect, it, vi } from 'vitest';
import { SAMPLE_RESULTS } from '../src/extractor/fixtures';
import { chunkText, extractEntities } from '../src/extractor/heuristics';
import { ExtractionError, createMockExtractor } from '../src/extractor/mockExtractor';
import { documentText } from '../src/lib/document';
import { STAGES } from '../src/types';

const extractor = createMockExtractor({ stageDelayMs: 0 });

describe('sample fixtures (recorded pipeline output)', () => {
  it('has five samples with unique ids', () => {
    expect(SAMPLE_RESULTS).toHaveLength(5);
    expect(new Set(SAMPLE_RESULTS.map((result) => result.document.id)).size).toBe(5);
  });

  it.each(SAMPLE_RESULTS.map((result) => [result.document.id, result] as const))('%s: every entity offset matches its text', (_, result) => {
    const text = documentText(result.chunks);
    expect(result.entities.length).toBeGreaterThan(0);
    for (const entity of result.entities) {
      expect(text.slice(entity.start, entity.end)).toBe(entity.text);
      expect(entity.confidence).toBeGreaterThanOrEqual(0);
      expect(entity.confidence).toBeLessThanOrEqual(1);
    }
    for (const chunk of result.chunks) expect(chunk.text).toHaveLength(chunk.end - chunk.start);
  });
});

describe('createMockExtractor', () => {
  it('reports every stage in order and returns a copy of the sample', async () => {
    const stages: string[] = [];
    const result = await extractor.extract({ kind: 'sample', id: 'gettysburg-address' }, { onStage: (stage) => stages.push(stage) });
    expect(stages).toEqual([...STAGES]);
    expect(result.document.title).toBe('The Gettysburg Address');
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    result.entities.length = 0;
    const again = await extractor.extract({ kind: 'sample', id: 'gettysburg-address' });
    expect(again.entities.length).toBeGreaterThan(0);
  });

  it('extracts entities from an uploaded text file', async () => {
    const text = 'Dr. Elena Vasquez met the Merrow Harbor Council on March 3, 2025. The wall is 1.4 km long and cost $6 million, up 15%.';
    const file = new File([text], 'minutes.txt', { type: 'text/plain' });
    const result = await extractor.extract({ kind: 'file', file });
    const found = Object.fromEntries(result.entities.map((entity) => [entity.text, entity.type]));
    expect(found).toMatchObject({
      'Dr. Elena Vasquez': 'PERSON',
      'Merrow Harbor Council': 'ORG',
      'March 3, 2025': 'DATE',
      '1.4 km': 'QUANTITY',
      '$6 million': 'MONEY',
      '15%': 'PERCENT',
    });
    expect(result.document).toMatchObject({ fileName: 'minutes.txt', fileType: 'txt', origin: 'upload', wordCount: 24 });
    for (const entity of result.entities) expect(text.slice(entity.start, entity.end)).toBe(entity.text);
  });

  it('rejects binary formats, oversized files and unknown samples with typed errors', async () => {
    const pdf = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' });
    await expect(extractor.extract({ kind: 'file', file: pdf })).rejects.toMatchObject({ code: 'unsupported' });
    const big = new File(['x'], 'big.txt', { type: 'text/plain' });
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 });
    await expect(extractor.extract({ kind: 'file', file: big })).rejects.toMatchObject({ code: 'too-large' });
    await expect(extractor.extract({ kind: 'sample', id: 'nope' })).rejects.toBeInstanceOf(ExtractionError);
  });

  it('can be cancelled', async () => {
    vi.useFakeTimers();
    const slow = createMockExtractor({ stageDelayMs: 1000 });
    const controller = new AbortController();
    const pending = slow.extract({ kind: 'sample', id: 'gettysburg-address' }, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'aborted' });
    vi.useRealTimers();
  });
});

describe('heuristics', () => {
  it('chunks with overlap and full coverage', () => {
    const text = Array.from({ length: 200 }, (_, i) => `Sentence number ${i}.`).join(' ');
    const chunks = chunkText(text, 512, 128);
    expect(chunks[0].start).toBe(0);
    expect(chunks.at(-1)?.end).toBe(text.length);
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].start).toBeLessThan(chunks[i - 1].end);
      expect(chunks[i].start).toBeGreaterThan(chunks[i - 1].start);
    }
    expect(documentText(chunks)).toBe(text);
  });

  it('always terminates, even on text without spaces', () => {
    const chunks = chunkText('x'.repeat(2000));
    expect(chunks.at(-1)?.end).toBe(2000);
  });

  it('never returns overlapping entities', () => {
    const text = 'The Tidewater Resilience Lab reported in March 2024 that 72 years of data show 21 cm of rise.';
    const entities = extractEntities(text, chunkText(text));
    for (let i = 1; i < entities.length; i++) expect(entities[i].start).toBeGreaterThanOrEqual(entities[i - 1].end);
    expect(entities.map((entity) => entity.type)).toEqual(expect.arrayContaining(['ORG', 'DATE', 'QUANTITY']));
  });
});
