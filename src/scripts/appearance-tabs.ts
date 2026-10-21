export function initializeAppearanceTabs(dialog: HTMLDialogElement): void {
  const tabs = Array.from(dialog.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = dialog.querySelectorAll<HTMLElement>('[role="tabpanel"]');

  function selectTab(selected: HTMLButtonElement): void {
    tabs.forEach(tab => {
      const isSelected = tab === selected;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
    });
    panels.forEach(panel => {
      panel.hidden = panel.id !== selected.getAttribute('aria-controls');
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let nextIndex: number;
      switch (event.key) {
        case 'ArrowRight': nextIndex = (index + 1) % tabs.length; break;
        case 'ArrowLeft': nextIndex = (index - 1 + tabs.length) % tabs.length; break;
        case 'Home': nextIndex = 0; break;
        case 'End': nextIndex = tabs.length - 1; break;
        default: return;
      }
      event.preventDefault();
      const next = tabs[nextIndex];
      selectTab(next);
      next.focus();
    });
  });
}
