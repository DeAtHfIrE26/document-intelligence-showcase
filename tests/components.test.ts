import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDropzone } from '../src/components/dropzone';
import { renderDocumentViewer } from '../src/components/documentViewer';
import { renderEntityTable, sortEntities, type TableState } from '../src/components/entityTable';
import { createProcessingView } from '../src/components/processing';
import { initTabs } from '../src/components/tabs';
import { renderTypeFilter } from '../src/components/typeFilter';
import { findSample } from '../src/extractor/fixtures';
import { announce, focusElement } from '../src/lib/a11y';
import { uniqueEntities } from '../src/lib/document';
import { applyTheme, initialTheme } from '../src/lib/theme';
import type { ExtractedEntity } from '../src/types';

beforeEach(() => {
  document.body.replaceChildren();
});

const entity = (id: number, text: string, type: string, confidence: number, start: number): ExtractedEntity =>
  ({ id, text, type, confidence, start, end: start + text.length, chunkIndex: 0 });

describe('dropzone', () => {
  it('passes dropped files on and rejects files over the limit', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const onFile = vi.fn();
    const { zone, error } = createDropzone(container, { onFile, maxBytes: 10 });

    const drop = (file: File) => {
      const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
      Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } });
      zone.dispatchEvent(event);
    };
    drop(new File(['small'], 'a.txt'));
    expect(onFile).toHaveBeenCalledTimes(1);
    drop(new File(['way more than ten bytes'], 'b.txt'));
    expect(onFile).toHaveBeenCalledTimes(1);
    expect(error.textContent).toContain('b.txt');
  });

  it('is operable from the keyboard', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const { zone, input } = createDropzone(container, { onFile: vi.fn() });
    const click = vi.spyOn(input, 'click').mockImplementation(() => undefined);
    expect(zone.getAttribute('role')).toBe('button');
    expect(zone.tabIndex).toBe(0);
    zone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    zone.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(click).toHaveBeenCalledTimes(2);
  });

  it('shows dragging state and clears it', () => {
    const container = document.createElement('div');
    const { zone } = createDropzone(container, { onFile: vi.fn() });
    zone.dispatchEvent(new Event('dragenter'));
    expect(zone.classList.contains('is-dragging')).toBe(true);
    zone.dispatchEvent(new Event('dragleave'));
    expect(zone.classList.contains('is-dragging')).toBe(false);
  });
});

describe('processing view', () => {
  it('moves through stages with progress and state for assistive tech', () => {
    const container = document.createElement('div');
    const view = createProcessingView(container);
    view.start();
    view.setStage('chunk');
    const states = [...container.querySelectorAll<HTMLElement>('.stage')].map((item) => item.dataset.state);
    expect(states).toEqual(['done', 'done', 'active', 'pending', 'pending']);
    expect(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('2');
    expect(view.element.getAttribute('aria-busy')).toBe('true');
    view.finish();
    expect(container.querySelectorAll('.stage[data-state="done"]')).toHaveLength(5);
    expect(view.element.getAttribute('aria-busy')).toBe('false');
    view.hide();
    expect(view.element.hidden).toBe(true);
  });
});

describe('document viewer', () => {
  it('highlights only the active types, at the right text', () => {
    const result = findSample('gettysburg-address')!;
    const entities = uniqueEntities(result.entities);
    const container = document.createElement('div');
    renderDocumentViewer(container, result, entities, new Set(['PERSON']));
    const marks = [...container.querySelectorAll('mark')];
    expect(marks.length).toBeGreaterThan(0);
    expect(marks.every((mark) => mark.dataset.entityType === 'PERSON')).toBe(true);
    expect(marks.map((mark) => mark.textContent)).toContain('Abraham Lincoln');
    expect(container.textContent).toContain('Four score and seven years ago');
  });
});

describe('entity table', () => {
  const entities = [
    entity(1, 'Port Merrow', 'GPE', 0.9, 40),
    entity(2, 'Elena Vasquez', 'PERSON', 0.7, 10),
    entity(3, '1987', 'DATE', 0.95, 90),
  ];
  const state: TableState = { sort: 'start', direction: 'ascending', query: '' };

  it('sorts and filters', () => {
    expect(sortEntities(entities, state).map((e) => e.id)).toEqual([2, 1, 3]);
    expect(sortEntities(entities, { ...state, sort: 'confidence', direction: 'descending' }).map((e) => e.id)).toEqual([3, 1, 2]);
    expect(sortEntities(entities, { ...state, sort: 'text' }).map((e) => e.text)).toEqual(['1987', 'Elena Vasquez', 'Port Merrow']);
    expect(sortEntities(entities, { ...state, query: 'per' }).map((e) => e.id)).toEqual([2]);
    // By the visible label: Date, Person, Place (not DATE, GPE, PERSON)
    expect(sortEntities(entities, { ...state, sort: 'type' }).map((e) => e.id)).toEqual([3, 2, 1]);
  });

  it('exposes sort state on headers and reports clicks', () => {
    const container = document.createElement('div');
    const onState = vi.fn();
    const onSelect = vi.fn();
    renderEntityTable(container, entities, { ...state, sort: 'confidence', direction: 'descending' }, onState, onSelect);
    const headers = [...container.querySelectorAll('th')];
    expect(headers.map((th) => th.getAttribute('aria-sort'))).toEqual(['none', 'none', 'descending', 'none']);
    headers[2].querySelector('button')!.click();
    expect(onState).toHaveBeenCalledWith(expect.objectContaining({ sort: 'confidence', direction: 'ascending' }));
    headers[0].querySelector('button')!.click();
    expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'text', direction: 'ascending' }));
    container.querySelector<HTMLButtonElement>('tbody .link-button')!.click();
    expect(onSelect).toHaveBeenCalledWith(entities[2]);
  });

  it('shows an empty message when nothing matches', () => {
    const container = document.createElement('div');
    renderEntityTable(container, entities, { ...state, query: 'zzz' }, vi.fn());
    expect(container.textContent).toContain('No entities match');
    expect(container.textContent).toContain('0 of 3 entities');
  });
});

describe('type filter', () => {
  it('toggles a type', () => {
    const container = document.createElement('div');
    const onChange = vi.fn();
    renderTypeFilter(container, [{ type: 'ORG', count: 2 }, { type: 'DATE', count: 1 }], new Set(['ORG', 'DATE']), onChange);
    const chip = container.querySelector<HTMLButtonElement>('[data-type="ORG"]')!;
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    chip.click();
    expect([...onChange.mock.calls[0][0]]).toEqual(['DATE']);
  });
});

describe('tabs', () => {
  it('supports arrow keys, Home and End', () => {
    document.body.innerHTML = [
      '<div role="tablist" id="list">',
      '<button role="tab" id="a" aria-controls="pa">A</button>',
      '<button role="tab" id="b" aria-controls="pb">B</button>',
      '<button role="tab" id="c" aria-controls="pc">C</button>',
      '</div><div id="pa"></div><div id="pb"></div><div id="pc"></div>',
    ].join('');
    initTabs(document.getElementById('list')!);
    const [a, , c] = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(c.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(c);
    expect(document.getElementById('pc')!.hidden).toBe(false);
    expect(document.getElementById('pa')!.hidden).toBe(true);
    c.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    expect(a.tabIndex).toBe(0);
    expect(c.tabIndex).toBe(-1);
  });
});

describe('a11y and theme helpers', () => {
  it('announces through a live region', async () => {
    vi.useFakeTimers();
    announce('Done');
    vi.runAllTimers();
    const region = document.querySelector('[role="status"]');
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.textContent).toBe('Done');
    vi.useRealTimers();
  });

  it('focuses non-focusable elements', () => {
    const heading = document.createElement('h2');
    document.body.append(heading);
    focusElement(heading);
    expect(document.activeElement).toBe(heading);
    expect(heading.getAttribute('tabindex')).toBe('-1');
  });

  it('reads the theme from the URL and applies it', () => {
    expect(initialTheme('?theme=light')).toBe('light');
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
