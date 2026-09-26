export interface Span {
  start: number;
  end: number;
  type: string;
  id?: number | string;
}

export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'entity'; text: string; type: string; id?: number | string };

/**
 * Split `text` into plain and entity segments.
 *
 * `offset` converts document offsets to positions in `text` (a chunk starts
 * at `offset` in the document). Spans outside the text or empty are dropped;
 * overlapping spans keep the one that starts first (then the longer one).
 * This is the algorithm the app uses to highlight entities, extracted as a
 * pure function so it can be tested without a DOM.
 */
export function buildSegments(text: string, spans: readonly Span[], offset = 0): Segment[] {
  const valid = spans
    .map((span) => ({ ...span, start: span.start - offset, end: span.end - offset }))
    .filter((span) => span.start >= 0 && span.end <= text.length && span.start < span.end)
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const segments: Segment[] = [];
  let position = 0;
  for (const span of valid) {
    if (span.start < position) continue;
    if (span.start > position) segments.push({ kind: 'text', text: text.slice(position, span.start) });
    segments.push({ kind: 'entity', text: text.slice(span.start, span.end), type: span.type, id: span.id });
    position = span.end;
  }
  if (position < text.length) segments.push({ kind: 'text', text: text.slice(position) });
  return segments;
}

/**
 * Render segments into `container` with DOM nodes (never innerHTML), so
 * document text can't inject markup.
 */
export function renderSegments(container: HTMLElement, segments: readonly Segment[]): void {
  const fragment = document.createDocumentFragment();
  for (const segment of segments) {
    if (segment.kind === 'text') {
      fragment.append(document.createTextNode(segment.text));
      continue;
    }
    const mark = document.createElement('mark');
    mark.className = `entity entity--${segment.type.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
    mark.dataset.entityType = segment.type;
    if (segment.id !== undefined) mark.dataset.entityId = String(segment.id);
    mark.textContent = segment.text;
    fragment.append(mark);
  }
  container.replaceChildren(fragment);
}
