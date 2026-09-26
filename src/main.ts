import './styles/tokens.css';
import './styles/app.css';
import { createDropzone } from './components/dropzone';
import { renderDocumentViewer } from './components/documentViewer';
import { renderEntityTable, type TableState } from './components/entityTable';
import { createProcessingView, STAGE_LABELS } from './components/processing';
import { initTabs } from './components/tabs';
import { renderTypeFilter } from './components/typeFilter';
import { ExtractionError, createMockExtractor } from './extractor/mockExtractor';
import { SAMPLE_RESULTS } from './extractor/fixtures';
import { announce, focusElement, prefersReducedMotion } from './lib/a11y';
import { el, icon } from './lib/dom';
import { averageConfidence, countByType, uniqueEntities } from './lib/document';
import { detectFileType } from './lib/fileTypes';
import { formatDuration, formatFileSize, formatPercent } from './lib/format';
import { applyTheme, initialTheme, type Theme } from './lib/theme';
import type { ExtractedEntity, ExtractionInput, ExtractionResult } from './types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const ORIGIN_LABELS: Record<string, string> = {
  'public-domain': 'Public domain',
  'original-article': 'Original article',
  synthetic: 'Synthetic',
};

const extractor = createMockExtractor({ stageDelayMs: prefersReducedMotion() ? 120 : 450 });

interface State {
  result: ExtractionResult | null;
  entities: ExtractedEntity[];
  activeTypes: Set<string>;
  table: TableState;
  running: AbortController | null;
}

const state: State = {
  result: null,
  entities: [],
  activeTypes: new Set(),
  table: { sort: 'start', direction: 'ascending', query: '' },
  running: null,
};

// Header link to the hosted app (optional override, see .env.example)
const liveAppUrl = import.meta.env.VITE_LIVE_APP_URL as string | undefined;
if (liveAppUrl) document.querySelector<HTMLAnchorElement>('[data-live-app]')?.setAttribute('href', liveAppUrl);

// Theme
let theme: Theme = initialTheme();
const themeToggle = $<HTMLButtonElement>('theme-toggle');
const renderThemeToggle = () => {
  const next = theme === 'dark' ? 'light' : 'dark';
  themeToggle.setAttribute('aria-label', `Switch to ${next} theme`);
  themeToggle.replaceChildren(icon(theme === 'dark' ? 'sun' : 'moon'));
};
applyTheme(theme);
renderThemeToggle();
themeToggle.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme, true);
  renderThemeToggle();
});

// Samples
const sampleList = $<HTMLUListElement>('samples');
for (const sample of SAMPLE_RESULTS) {
  const info = detectFileType(sample.document.fileName, sample.document.mimeType ?? '');
  const button = el('button', {
    type: 'button', className: 'sample', 'data-sample': sample.document.id, 'aria-pressed': 'false',
  },
  icon(info.kind === 'image' ? 'image' : 'file', 'icon sample__icon'),
  el('span', { className: 'sample__text' },
    el('span', { className: 'sample__title' }, sample.document.title),
    el('span', { className: 'sample__meta' },
      `${info.label} · ${formatFileSize(sample.document.sizeBytes)} · ${ORIGIN_LABELS[sample.document.origin] ?? 'Sample'}`)));
  button.addEventListener('click', () => run({ kind: 'sample', id: sample.document.id }, button));
  sampleList.append(el('li', {}, button));
}

// Upload
createDropzone($('dropzone'), {
  accept: '.txt,.md,.markdown,text/plain,text/markdown',
  onFile: (file) => run({ kind: 'file', file }),
});

// Processing and results
const processing = createProcessingView($('processing'), () => state.running?.abort());
processing.hide();
const tabs = initTabs($('tabs'));

function renderResults() {
  const { result } = state;
  if (!result) return;
  renderTypeFilter($('type-filter'), countByType(state.entities), state.activeTypes, (active) => {
    state.activeTypes = active;
    renderResults();
  });
  renderDocumentViewer($('viewer'), result, state.entities, state.activeTypes);
  renderEntityTable($('entity-table'), state.entities, state.table, (table) => {
    state.table = table;
    const search = document.activeElement === document.querySelector('[data-testid="entity-search"]');
    renderResults();
    if (search) {
      const input = document.querySelector<HTMLInputElement>('[data-testid="entity-search"]');
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    }
  }, (entity) => {
    tabs.select('tab-document');
    const mark = document.querySelector<HTMLElement>(`#viewer mark[data-entity-id="${entity.id}"]`);
    if (mark) {
      mark.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      mark.classList.add('is-flash');
      window.setTimeout(() => mark.classList.remove('is-flash'), 1600);
    }
  });
}

function showResult(result: ExtractionResult) {
  state.result = result;
  state.entities = uniqueEntities(result.entities);
  state.activeTypes = new Set(countByType(state.entities).map(({ type }) => type));
  state.table = { sort: 'start', direction: 'ascending', query: '' };

  const info = detectFileType(result.document.fileName, result.document.mimeType ?? '');
  $('result-kind').textContent = result.document.origin === 'upload' ? 'Your upload' : 'Sample document';
  $('results-title').textContent = result.document.title;
  $('result-description').textContent = result.document.description;
  $('result-meta').replaceChildren(
    ...[info.label, formatFileSize(result.document.sizeBytes), `${result.document.wordCount.toLocaleString()} words`,
      (result.document.language ?? 'en').toUpperCase()].map((text) => el('li', { className: 'pill' }, text)));

  const types = countByType(state.entities);
  const stats: Array<[string, string]> = [
    ['Chunks', String(result.chunks.length)],
    ['Entities', String(state.entities.length)],
    ['Entity types', String(types.length)],
    ['Avg. confidence', formatPercent(averageConfidence(state.entities))],
    ['Processed in', formatDuration(result.elapsedMs ?? 0)],
  ];
  $('stats').replaceChildren(...stats.map(([label, value]) =>
    el('div', { className: 'stat' }, el('dt', {}, label), el('dd', {}, value))));

  $('json').textContent = JSON.stringify({ ...result, elapsedMs: undefined }, null, 2);
  $('empty').hidden = true;
  $('results').hidden = false;
  tabs.select('tab-document');
  renderResults();
}

async function run(input: ExtractionInput, trigger?: HTMLButtonElement) {
  state.running?.abort();
  const controller = new AbortController();
  state.running = controller;
  for (const button of sampleList.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button === trigger));
  }
  $('results').hidden = true;
  $('empty').hidden = true;
  processing.start();
  announce('Processing started');
  try {
    const result = await extractor.extract(input, {
      signal: controller.signal,
      onStage: (stage) => {
        processing.setStage(stage);
        announce(STAGE_LABELS[stage]);
      },
    });
    if (state.running !== controller) return;
    processing.finish();
    await new Promise((resolve) => window.setTimeout(resolve, prefersReducedMotion() ? 0 : 350));
    processing.hide();
    showResult(result);
    announce(`Done: ${uniqueEntities(result.entities).length} entities found in ${result.document.title}`);
    focusElement($('results-title'));
  } catch (error) {
    if (state.running !== controller) return;
    processing.hide();
    const message = error instanceof ExtractionError && error.code === 'aborted'
      ? 'Processing cancelled.'
      : error instanceof Error ? error.message : 'Something went wrong.';
    const emptyState = $('empty');
    emptyState.hidden = false;
    emptyState.replaceChildren(el('p', { className: 'notice', role: 'alert' }, message));
    for (const button of sampleList.querySelectorAll('button')) button.setAttribute('aria-pressed', 'false');
  } finally {
    if (state.running === controller) state.running = null;
  }
}

$('copy-json').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('json').textContent ?? '');
    announce('JSON copied to the clipboard');
  } catch {
    announce('Copy failed: select the text and copy it instead', 'assertive');
  }
});

// ?sample=<id> opens a sample straight away (used by the README recordings)
const requested = new URLSearchParams(window.location.search).get('sample');
if (requested) {
  const button = sampleList.querySelector<HTMLButtonElement>(`[data-sample="${CSS.escape(requested)}"]`);
  button?.click();
}
