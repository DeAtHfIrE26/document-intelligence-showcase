import { el } from '../lib/dom';
import { confidenceLevel, entityLabel, formatPercent } from '../lib/format';
import type { ExtractedEntity } from '../types';

export type SortKey = 'text' | 'type' | 'confidence' | 'start';
export interface TableState {
  sort: SortKey;
  direction: 'ascending' | 'descending';
  query: string;
}

const COLUMNS: Array<{ key: SortKey; label: string; numeric?: boolean }> = [
  { key: 'text', label: 'Entity' },
  { key: 'type', label: 'Type' },
  { key: 'confidence', label: 'Confidence', numeric: true },
  { key: 'start', label: 'Position', numeric: true },
];

export function sortEntities(entities: readonly ExtractedEntity[], state: TableState): ExtractedEntity[] {
  const query = state.query.trim().toLowerCase();
  const filtered = query
    ? entities.filter((entity) => entity.text.toLowerCase().includes(query) || entity.type.toLowerCase().includes(query))
    : [...entities];
  const factor = state.direction === 'ascending' ? 1 : -1;
  // Types sort by the label people see ("Date" before "Place"), not the raw code
  const value = (entity: ExtractedEntity) => (state.sort === 'type' ? entityLabel(entity.type) : entity[state.sort]);
  return filtered.sort((a, b) => {
    const left = value(a);
    const right = value(b);
    const order = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
    return order * factor || a.start - b.start;
  });
}

/**
 * Sortable, searchable table of extracted entities. Clicking a row calls
 * `onSelect` so the viewer can scroll to the entity.
 */
export function renderEntityTable(
  container: HTMLElement,
  entities: readonly ExtractedEntity[],
  state: TableState,
  onStateChange: (state: TableState) => void,
  onSelect?: (entity: ExtractedEntity) => void,
) {
  const rows = sortEntities(entities, state);
  const search = el('input', {
    type: 'search', className: 'input', placeholder: 'Filter entities…', value: state.query,
    'aria-label': 'Filter entities', 'data-testid': 'entity-search',
  });
  search.addEventListener('input', () => onStateChange({ ...state, query: search.value }));

  const headerRow = el('tr');
  for (const column of COLUMNS) {
    const sorted = state.sort === column.key;
    const button = el('button', { type: 'button', className: 'th-button' }, column.label,
      el('span', { className: 'sort-indicator', 'aria-hidden': 'true' }, sorted ? (state.direction === 'ascending' ? '▲' : '▼') : ''));
    button.addEventListener('click', () => onStateChange({
      ...state,
      sort: column.key,
      direction: sorted && state.direction === 'ascending' ? 'descending' : sorted ? 'ascending' : column.numeric ? 'descending' : 'ascending',
    }));
    headerRow.append(el('th', {
      scope: 'col', className: column.numeric ? 'num' : undefined,
      'aria-sort': sorted ? state.direction : 'none',
    }, button));
  }

  const body = el('tbody');
  for (const entity of rows) {
    const level = confidenceLevel(entity.confidence);
    const row = el('tr', { 'data-entity-id': entity.id },
      el('td', {}, onSelect
        ? el('button', { type: 'button', className: 'link-button' }, entity.text)
        : entity.text),
      el('td', {}, el('span', { className: `tag entity--${entity.type.toLowerCase()}` }, entityLabel(entity.type))),
      el('td', { className: 'num' },
        el('span', { className: `confidence confidence--${level}`, title: `Confidence: ${level}` },
          el('span', { className: 'confidence__bar', style: `--value:${entity.confidence}` }),
          formatPercent(entity.confidence))),
      el('td', { className: 'num' }, `${entity.start}–${entity.end}`));
    if (onSelect) row.querySelector('button')?.addEventListener('click', () => onSelect(entity));
    body.append(row);
  }

  const table = el('table', { className: 'table' },
    el('caption', { className: 'visually-hidden' }, 'Extracted entities'),
    el('thead', {}, headerRow), body);
  const summary = el('p', { className: 'muted', 'aria-live': 'polite' },
    rows.length === entities.length ? `${rows.length} entities` : `${rows.length} of ${entities.length} entities`);
  const empty = rows.length === 0 ? el('p', { className: 'empty' }, 'No entities match this filter.') : null;
  container.replaceChildren(el('div', { className: 'table-toolbar' }, search, summary),
    el('div', { className: 'table-wrap', tabindex: 0, role: 'region', 'aria-label': 'Entities table' }, table), empty ?? '');
  return { table, search };
}
