export type FileKind = 'pdf' | 'docx' | 'text' | 'markdown' | 'image' | 'audio' | 'video' | 'unknown';

export interface FileTypeInfo {
  kind: FileKind;
  /** Short label, e.g. "PDF". */
  label: string;
  /** Whether the production pipeline accepts this kind. */
  supported: boolean;
  /** Whether the mock extractor can read it in the browser. */
  readableInBrowser: boolean;
}

const BY_EXTENSION: Record<string, FileKind> = {
  pdf: 'pdf',
  docx: 'docx', doc: 'docx',
  txt: 'text', csv: 'text', json: 'text', log: 'text',
  md: 'markdown', markdown: 'markdown',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', bmp: 'image', tiff: 'image', tif: 'image', webp: 'image',
  mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio', m4a: 'audio',
  mp4: 'video', mov: 'video', avi: 'video', wmv: 'video', webm: 'video',
};

const LABELS: Record<FileKind, string> = {
  pdf: 'PDF', docx: 'DOCX', text: 'TXT', markdown: 'MD', image: 'Image', audio: 'Audio', video: 'Video', unknown: 'File',
};

export function extensionOf(fileName: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return match ? match[1].toLowerCase() : '';
}

/** Classify a file by extension first, then MIME type. */
export function detectFileType(fileName: string, mimeType = ''): FileTypeInfo {
  let kind: FileKind = BY_EXTENSION[extensionOf(fileName)] ?? 'unknown';
  if (kind === 'unknown') {
    if (mimeType === 'application/pdf') kind = 'pdf';
    else if (mimeType.includes('wordprocessingml')) kind = 'docx';
    else if (mimeType === 'text/markdown') kind = 'markdown';
    else if (mimeType.startsWith('text/')) kind = 'text';
    else if (mimeType.startsWith('image/')) kind = 'image';
    else if (mimeType.startsWith('audio/')) kind = 'audio';
    else if (mimeType.startsWith('video/')) kind = 'video';
  }
  const label = kind === 'image' || kind === 'audio' || kind === 'video'
    ? (extensionOf(fileName).toUpperCase() || LABELS[kind])
    : LABELS[kind];
  return {
    kind,
    label,
    supported: kind !== 'unknown',
    readableInBrowser: kind === 'text' || kind === 'markdown',
  };
}

/** The production app rejects request bodies over 4 MB. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
