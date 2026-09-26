import { el } from '../lib/dom';
import type { TypeCount } from '../lib/document';
import { entityLabel } from '../lib/format';

/**
 * Toggle chips, one per entity type, that double as the highlight legend.
 * `onChange` receives the set of types that are switched on.
 */
export function renderTypeFilter(
  container: HTMLElement,
  counts: readonly TypeCount[],
  active: ReadonlySet<string>,
  onChange: (active: Set<string>) => void,
) {
  const group = el('div', { className: 'chips', role: 'group', 'aria-label': 'Entity types' });
  for (const { type, count } of counts) {
    const pressed = active.has(type);
    const chip = el('button', {
      type: 'button',
      className: `chip entity--${type.toLowerCase()}`,
      'aria-pressed': String(pressed),
      'data-type': type,
    }, el('span', { className: 'chip__swatch', 'aria-hidden': 'true' }), entityLabel(type), el('span', { className: 'chip__count' }, String(count)));
    chip.addEventListener('click', () => {
      const next = new Set(active);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      onChange(next);
    });
    group.append(chip);
  }
  container.replaceChildren(group);
  return group;
}
