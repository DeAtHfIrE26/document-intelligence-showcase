import { el } from '../lib/dom';
import { documentText } from '../lib/document';
import { buildSegments, renderSegments } from '../lib/highlight';
import type { ExtractedEntity, ExtractionResult } from '../types';

/**
 * The document text with entities highlighted. Only entities whose type is
 * in `activeTypes` are marked.
 */
export function renderDocumentViewer(
  container: HTMLElement,
  result: ExtractionResult,
  entities: readonly ExtractedEntity[],
  activeTypes: ReadonlySet<string>,
) {
  const text = documentText(result.chunks);
  const body = el('div', {
    className: 'viewer__text',
    tabindex: 0,
    role: 'region',
    'aria-label': `Text of ${result.document.title}`,
  });
  const spans = entities
    .filter((entity) => activeTypes.has(entity.type))
    .map((entity) => ({ start: entity.start, end: entity.end, type: entity.type, id: entity.id }));
  renderSegments(body, buildSegments(text, spans));
  container.replaceChildren(body);
  return body;
}
