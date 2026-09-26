import { el, icon } from '../lib/dom';
import { detectFileType, MAX_UPLOAD_BYTES } from '../lib/fileTypes';
import { formatFileSize } from '../lib/format';

export interface DropzoneOptions {
  onFile: (file: File) => void;
  maxBytes?: number;
  accept?: string;
}

/**
 * A keyboard- and screen-reader-friendly drop target. Clicking, pressing
 * Enter/Space, or dropping a file all end in `onFile`; files that are too
 * large are rejected with a message instead.
 */
export function createDropzone(container: HTMLElement, { onFile, maxBytes = MAX_UPLOAD_BYTES, accept }: DropzoneOptions) {
  const input = el('input', { type: 'file', className: 'visually-hidden', tabindex: -1, 'aria-hidden': 'true', accept });
  const hint = el('p', { className: 'dropzone__hint', id: 'dropzone-hint' },
    `TXT or MD, up to ${formatFileSize(maxBytes)}. Nothing leaves your browser.`);
  const error = el('p', { className: 'dropzone__error', role: 'alert' });
  const zone = el('div', {
    className: 'dropzone',
    role: 'button',
    tabindex: 0,
    'aria-describedby': 'dropzone-hint',
    'data-testid': 'dropzone',
  },
  icon('upload', 'icon icon--xl'),
  el('p', { className: 'dropzone__title' }, el('strong', {}, 'Drop a file'), ' or browse'),
  hint);

  const accept_ = (file: File | undefined) => {
    error.textContent = '';
    if (!file) return;
    if (file.size > maxBytes) {
      error.textContent = `${file.name} is ${formatFileSize(file.size)}; the limit is ${formatFileSize(maxBytes)}.`;
      return;
    }
    const type = detectFileType(file.name, file.type);
    zone.setAttribute('aria-label', `Selected ${file.name}, ${type.label}, ${formatFileSize(file.size)}`);
    onFile(file);
  };

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });
  input.addEventListener('change', () => {
    accept_(input.files?.[0]);
    input.value = '';
  });

  let depth = 0;
  zone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    depth += 1;
    zone.classList.add('is-dragging');
  });
  zone.addEventListener('dragover', (event) => event.preventDefault());
  zone.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) zone.classList.remove('is-dragging');
  });
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    depth = 0;
    zone.classList.remove('is-dragging');
    accept_(event.dataTransfer?.files?.[0]);
  });

  container.replaceChildren(zone, input, error);
  return { zone, input, error };
}
