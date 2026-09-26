/**
 * WAI-ARIA tabs: arrow keys, Home and End move between tabs; only the
 * selected tab is in the tab order.
 */
export function initTabs(tablist: HTMLElement, onChange?: (id: string) => void) {
  const tabs = [...tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

  const select = (tab: HTMLButtonElement, focus = true) => {
    for (const other of tabs) {
      const selected = other === tab;
      other.setAttribute('aria-selected', String(selected));
      other.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(other.getAttribute('aria-controls') ?? '');
      if (panel) panel.hidden = !selected;
    }
    if (focus) tab.focus();
    onChange?.(tab.id);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(tabs[(next + tabs.length) % tabs.length]);
    });
  });

  return { select: (id: string) => {
    const tab = tabs.find((candidate) => candidate.id === id);
    if (tab) select(tab, false);
  } };
}
