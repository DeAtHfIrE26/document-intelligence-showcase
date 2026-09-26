import type { Chunk, ExtractedEntity } from '../types';

export const CHUNK_SIZE = 512;
export const CHUNK_OVERLAP = 128;

/**
 * Split text into overlapping chunks, preferring to end at a sentence or
 * word boundary (same sizes as the production pipeline: 512 characters with
 * 128 of overlap).
 */
export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const window = text.slice(start, end);
      const sentence = Math.max(window.lastIndexOf('. '), window.lastIndexOf('\n'));
      const space = window.lastIndexOf(' ');
      const cut = sentence > size / 2 ? sentence + 1 : space > size / 2 ? space : -1;
      if (cut > 0) end = start + cut;
    }
    chunks.push({ index: chunks.length, start, end, text: text.slice(start, end) });
    if (end >= text.length) break;
    // Always move forward, even when the overlap would reach back past `start`
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
const ORG_WORDS = 'Inc|Ltd|LLC|Lab|Laboratory|Council|Trust|University|Company|Corporation|Corp|Association|Aerospace|Museum|Institute|Agency|Department|Society|Foundation|Group|Bank|School|Hospital|Ledger';

interface Rule {
  type: string;
  pattern: RegExp;
  confidence: number;
}

// Order matters: earlier rules win when matches overlap
const RULES: Rule[] = [
  { type: 'DATE', pattern: new RegExp(`\\b(?:${MONTHS}) \\d{1,2}, \\d{4}\\b`, 'g'), confidence: 0.92 },
  { type: 'DATE', pattern: new RegExp(`\\b(?:${MONTHS}) \\d{4}\\b`, 'g'), confidence: 0.88 },
  { type: 'MONEY', pattern: /[$€£]\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:million|billion|thousand))?/g, confidence: 0.9 },
  { type: 'PERCENT', pattern: /\b\d+(?:\.\d+)?\s?%/g, confidence: 0.9 },
  { type: 'QUANTITY', pattern: /\b\d+(?:\.\d+)?\s?(?:mm|cm|km|m|kg|g|metres|meters|miles|hectares|hours|minutes|°C)\b/g, confidence: 0.8 },
  { type: 'PERSON', pattern: /\b(?:Dr|Mr|Mrs|Ms|Prof)\.\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)?/g, confidence: 0.9 },
  { type: 'ORG', pattern: new RegExp(`\\b(?:[A-Z][a-zA-Z&]+\\s){0,4}(?:${ORG_WORDS})\\b`, 'g'), confidence: 0.78 },
  { type: 'DATE', pattern: /\b(?:1[5-9]|20)\d{2}s?\b/g, confidence: 0.7 },
  { type: 'PERSON', pattern: /(?<![.!?]\s|^)\b[A-Z][a-z]+\s[A-Z][a-z]+\b(?!\s[A-Z])/gm, confidence: 0.6 },
  { type: 'CARDINAL', pattern: /\b\d[\d,]*(?:\.\d+)?\b/g, confidence: 0.65 },
];

/**
 * A small, rule-based stand-in for the production entity extractor. It
 * recognises dates, amounts, quantities, titled names, organisation names
 * and capitalised name pairs: enough to exercise the UI with any text file.
 */
export function extractEntities(text: string, chunks: readonly Chunk[]): ExtractedEntity[] {
  const taken: Array<[number, number]> = [];
  const overlaps = (start: number, end: number) => taken.some(([s, e]) => start < e && end > s);
  const found: Omit<ExtractedEntity, 'id' | 'chunkIndex'>[] = [];

  for (const rule of RULES) {
    for (const match of text.matchAll(rule.pattern)) {
      const value = match[0].trim();
      const start = (match.index ?? 0) + match[0].indexOf(value);
      const end = start + value.length;
      if (!value || overlaps(start, end)) continue;
      taken.push([start, end]);
      found.push({ text: value, type: rule.type, confidence: rule.confidence, start, end });
    }
  }

  return found
    .sort((a, b) => a.start - b.start)
    .map((entity, index) => ({
      ...entity,
      id: index + 1,
      chunkIndex: chunks.find((chunk) => entity.start >= chunk.start && entity.end <= chunk.end)?.index ?? null,
    }));
}
