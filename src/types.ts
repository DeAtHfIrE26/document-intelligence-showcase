/**
 * The contract between the extraction service and the UI.
 *
 * In the production app this shape is produced by a private pipeline
 * (parsing, OCR, chunking, entity extraction). Here it is produced by
 * `createMockExtractor`, so every component can be developed and tested
 * without the service.
 */

/** spaCy-style entity labels; unknown labels are rendered with a neutral style. */
export type EntityType =
  | 'PERSON' | 'ORG' | 'GPE' | 'LOC' | 'FAC' | 'NORP' | 'EVENT' | 'PRODUCT'
  | 'WORK_OF_ART' | 'LAW' | 'LANGUAGE' | 'DATE' | 'TIME' | 'MONEY' | 'QUANTITY'
  | 'PERCENT' | 'CARDINAL' | 'ORDINAL' | (string & {});

export interface DocumentInfo {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileType: string;
  mimeType: string | null;
  sizeBytes: number;
  language: string | null;
  wordCount: number;
  /** Where the sample text came from: `synthetic`, `public-domain` or `upload`. */
  origin: string;
}

/** A slice of the document text. Offsets are into the whole document. */
export interface Chunk {
  index: number;
  start: number;
  end: number;
  text: string;
}

/** An entity found in the text. `start`/`end` are document offsets. */
export interface ExtractedEntity {
  id: number;
  text: string;
  type: EntityType;
  /** 0–1 */
  confidence: number;
  start: number;
  end: number;
  chunkIndex: number | null;
}

export interface ExtractionResult {
  document: DocumentInfo;
  chunks: Chunk[];
  entities: ExtractedEntity[];
  /** Milliseconds spent end to end (measured by the extractor). */
  elapsedMs?: number;
}

export const STAGES = ['upload', 'parse', 'chunk', 'extract', 'index'] as const;
export type Stage = (typeof STAGES)[number];

export type ExtractionInput =
  | { kind: 'sample'; id: string }
  | { kind: 'file'; file: File };

export interface Extractor {
  extract(
    input: ExtractionInput,
    options?: { onStage?: (stage: Stage) => void; signal?: AbortSignal },
  ): Promise<ExtractionResult>;
}
