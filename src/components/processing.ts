import { el, icon } from '../lib/dom';
import { STAGES, type Stage } from '../types';

export const STAGE_LABELS: Record<Stage, string> = {
  upload: 'Uploading',
  parse: 'Reading text (PDF, DOCX, OCR)',
  chunk: 'Splitting into chunks',
  extract: 'Extracting entities',
  index: 'Indexing for search',
};

/** The staged progress list shown while a document is processed. */
export function createProcessingView(container: HTMLElement, onCancel?: () => void) {
  const items = new Map<Stage, HTMLLIElement>();
  const list = el('ol', { className: 'stages' });
  for (const stage of STAGES) {
    const item = el('li', { className: 'stage', 'data-stage': stage, 'data-state': 'pending' },
      el('span', { className: 'stage__dot', 'aria-hidden': 'true' }),
      el('span', { className: 'stage__label' }, STAGE_LABELS[stage]),
      el('span', { className: 'visually-hidden stage__status' }, 'pending'));
    items.set(stage, item);
    list.append(item);
  }
  const bar = el('div', { className: 'progress__bar' });
  const progress = el('div', {
    className: 'progress', role: 'progressbar', 'aria-label': 'Processing progress',
    'aria-valuemin': 0, 'aria-valuemax': STAGES.length, 'aria-valuenow': 0,
  }, bar);
  const title = el('h2', { className: 'card__title' }, icon('cpu'), 'Processing');
  const cancel = el('button', { type: 'button', className: 'button button--ghost' }, 'Cancel');
  if (onCancel) cancel.addEventListener('click', onCancel);
  const card = el('section', { className: 'card processing', 'aria-live': 'polite', 'aria-busy': 'false' },
    el('div', { className: 'card__header' }, title, onCancel ? cancel : null), progress, list);
  container.replaceChildren(card);

  const setState = (stage: Stage, state: 'pending' | 'active' | 'done') => {
    const item = items.get(stage);
    if (!item) return;
    item.dataset.state = state;
    const status = item.querySelector('.stage__status');
    if (status) status.textContent = state === 'active' ? 'in progress' : state;
  };

  return {
    element: card,
    start() {
      card.hidden = false;
      card.setAttribute('aria-busy', 'true');
      for (const stage of STAGES) setState(stage, 'pending');
      progress.setAttribute('aria-valuenow', '0');
      bar.style.transform = 'scaleX(0)';
    },
    setStage(stage: Stage) {
      const index = STAGES.indexOf(stage);
      STAGES.forEach((other, i) => setState(other, i < index ? 'done' : i === index ? 'active' : 'pending'));
      progress.setAttribute('aria-valuenow', String(index));
      bar.style.transform = `scaleX(${(index + 0.5) / STAGES.length})`;
    },
    finish() {
      for (const stage of STAGES) setState(stage, 'done');
      progress.setAttribute('aria-valuenow', String(STAGES.length));
      bar.style.transform = 'scaleX(1)';
      card.setAttribute('aria-busy', 'false');
    },
    hide() {
      card.hidden = true;
      card.setAttribute('aria-busy', 'false');
    },
  };
}
