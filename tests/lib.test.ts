import { describe, expect, it } from 'vitest';
import { escapeHtml } from '../src/lib/escapeHtml';
import { confidenceLevel, entityLabel, formatDuration, formatFileSize, formatPercent, formatRelationshipName } from '../src/lib/format';
import { detectFileType, extensionOf } from '../src/lib/fileTypes';
import { averageConfidence, countByType, documentText, uniqueEntities } from '../src/lib/document';
import type { ExtractedEntity } from '../src/types';

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe('&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
  });
  it('stringifies non-strings', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(null)).toBe('null');
  });
});

describe('format', () => {
  it.each([[0, '0 B'], [512, '512 B'], [1536, '1.5 KB'], [4 * 1024 * 1024, '4 MB'], [-5, '0 B']])('formatFileSize(%d) = %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
  it('buckets confidence with the app thresholds', () => {
    expect([0.95, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2].map(confidenceLevel))
      .toEqual(['high', 'high', 'good', 'good', 'fair', 'fair', 'low']);
  });
  it('labels entity types and title-cases unknown ones', () => {
    expect(entityLabel('GPE')).toBe('Place');
    expect(entityLabel('SHIP_CLASS')).toBe('Ship Class');
  });
  it('formats relationship names, percents and durations', () => {
    expect(formatRelationshipName('same_as')).toBe('Same As');
    expect(formatPercent(0.856)).toBe('86%');
    expect(formatDuration(240)).toBe('240 ms');
    expect(formatDuration(2345)).toBe('2.3 s');
  });
});

describe('detectFileType', () => {
  it('detects by extension, case-insensitively', () => {
    expect(detectFileType('Report.PDF').kind).toBe('pdf');
    expect(detectFileType('notes.md')).toMatchObject({ kind: 'markdown', readableInBrowser: true });
    expect(detectFileType('scan.png')).toMatchObject({ kind: 'image', label: 'PNG', readableInBrowser: false });
  });
  it('falls back to the MIME type', () => {
    expect(detectFileType('upload', 'application/pdf').kind).toBe('pdf');
    expect(detectFileType('upload', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').kind).toBe('docx');
    expect(detectFileType('upload', 'text/plain').kind).toBe('text');
  });
  it('marks unknown files as unsupported', () => {
    expect(detectFileType('tool.exe')).toMatchObject({ kind: 'unknown', supported: false });
    expect(extensionOf('archive.tar.gz')).toBe('gz');
    expect(extensionOf('README')).toBe('');
  });
});

describe('document helpers', () => {
  const entity = (start: number, end: number, type = 'ORG', confidence = 0.8): ExtractedEntity =>
    ({ id: start, text: 'x', type, confidence, start, end, chunkIndex: 0 });

  it('rebuilds text from overlapping chunks', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const chunks = [
      { index: 0, start: 0, end: 20, text: text.slice(0, 20) },
      { index: 1, start: 15, end: 35, text: text.slice(15, 35) },
      { index: 2, start: 30, end: text.length, text: text.slice(30) },
    ];
    expect(documentText(chunks)).toBe(text);
    expect(documentText([...chunks].reverse())).toBe(text);
  });
  it('keeps one entity per span and type, with the best confidence', () => {
    const result = uniqueEntities([entity(5, 9, 'ORG', 0.6), entity(0, 3), entity(5, 9, 'ORG', 0.9), entity(5, 9, 'GPE')]);
    expect(result.map((e) => [e.start, e.type, e.confidence])).toEqual([[0, 'ORG', 0.8], [5, 'ORG', 0.9], [5, 'GPE', 0.8]]);
  });
  it('counts types and averages confidence', () => {
    expect(countByType([entity(0, 1, 'DATE'), entity(2, 3, 'ORG'), entity(4, 5, 'DATE')]))
      .toEqual([{ type: 'DATE', count: 2 }, { type: 'ORG', count: 1 }]);
    expect(averageConfidence([entity(0, 1, 'A', 0.5), entity(1, 2, 'A', 1)])).toBe(0.75);
    expect(averageConfidence([])).toBe(0);
  });
});
