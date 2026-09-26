import { detectFileType, MAX_UPLOAD_BYTES } from '../lib/fileTypes';
import { STAGES, type ExtractionInput, type ExtractionResult, type Extractor, type Stage } from '../types';
import { findSample } from './fixtures';
import { chunkText, extractEntities } from './heuristics';

export class ExtractionError extends Error {
  constructor(message: string, readonly code: 'not-found' | 'unsupported' | 'too-large' | 'aborted') {
    super(message);
    this.name = 'ExtractionError';
  }
}

export interface MockExtractorOptions {
  /** Delay per pipeline stage in ms, to make progress visible (0 in tests). */
  stageDelayMs?: number;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new ExtractionError('Extraction cancelled', 'aborted'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new ExtractionError('Extraction cancelled', 'aborted'));
    }, { once: true });
  });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function readFileText(file: File): Promise<string> {
  // Blob.text() is missing in some test environments; FileReader always works
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function extractFromFile(file: File): Promise<ExtractionResult> {
  const info = detectFileType(file.name, file.type);
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ExtractionError('This file is larger than the 4 MB upload limit.', 'too-large');
  }
  if (!info.readableInBrowser) {
    throw new ExtractionError(
      info.supported
        ? `${info.label} files are parsed by the private pipeline. In this playground, upload a .txt or .md file, or open one of the samples (they include a PDF-style report and an OCR image).`
        : 'This file type is not supported.',
      'unsupported',
    );
  }
  const text = (await readFileText(file)).replace(/\r\n?/g, '\n').trim();
  const chunks = chunkText(text);
  return {
    document: {
      id: `upload-${Date.now()}`,
      title: file.name.replace(/\.[^.]+$/, '') || file.name,
      description: 'Uploaded in the playground and analysed by the mock extractor.',
      fileName: file.name,
      fileType: info.kind === 'markdown' ? 'md' : 'txt',
      mimeType: file.type || null,
      sizeBytes: file.size,
      language: 'en',
      wordCount: text.split(/\s+/).filter(Boolean).length,
      origin: 'upload',
    },
    chunks,
    entities: extractEntities(text, chunks),
  };
}

/**
 * An `Extractor` that needs no server: samples return their recorded
 * pipeline output, and uploaded text files go through `heuristics.ts`.
 * Stages are reported in order so the processing UI behaves as it does
 * against the real service.
 */
export function createMockExtractor({ stageDelayMs = 450 }: MockExtractorOptions = {}): Extractor {
  return {
    async extract(input: ExtractionInput, { onStage, signal } = {}) {
      const started = performance.now();
      let result: ExtractionResult | undefined;
      for (const stage of STAGES as readonly Stage[]) {
        onStage?.(stage);
        await wait(stageDelayMs, signal);
        if (stage === 'parse') {
          if (input.kind === 'sample') {
            const sample = findSample(input.id);
            if (!sample) throw new ExtractionError(`Unknown sample "${input.id}"`, 'not-found');
            result = clone(sample);
          } else {
            result = await extractFromFile(input.file);
          }
        }
      }
      return { ...(result as ExtractionResult), elapsedMs: performance.now() - started };
    },
  };
}
