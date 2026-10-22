// DOM wiring for the header search combobox. Mounted once; on a language
// change main.js calls rebuild(), which only refreshes the index and results.
import { buildIndex, search, nextActiveIndex, escapeAction } from './search.js';

export function mountSearch({ input, panel, list, empty, status }, { topics, t, navigate }) {
  let index = buildIndex(topics, t);
  let results = [];
  let active = -1;

  const optionId = (i) => `search-opt-${i}`;
  const isOpen = () => !panel.hidden;

  function setActive(i) {
    active = i;
    list.querySelectorAll('[role="option"]').forEach((o, n) => o.setAttribute('aria-selected', String(n === i)));
    if (i >= 0) {
      input.setAttribute('aria-activedescendant', optionId(i));
      list.children[i]?.scrollIntoView?.({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function close() {
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
    results = [];
    list.replaceChildren();
    status.textContent = '';
  }

  function render() {
    const q = input.value;
    if (!q.trim()) {
      close();
      return;
    }
    results = search(index, q);
    list.replaceChildren();
    results.forEach((r, i) => {
      const li = document.createElement('li');
      li.id = optionId(i);
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.dataset.route = r.route;
      const title = document.createElement('span');
      title.className = 'search-title';
      title.textContent = r.title;
      const snip = document.createElement('span');
      snip.className = 'search-snippet';
      snip.textContent = r.snippet;
      li.append(title, snip);
      list.append(li);
    });
    list.hidden = results.length === 0;
    empty.hidden = results.length !== 0;
    empty.textContent = t('ui.search.empty');
    panel.hidden = false;
    // The listbox is only "expanded" when it has options to show.
    input.setAttribute('aria-expanded', String(results.length > 0));
    setActive(-1);
    status.textContent = results.length === 0
      ? t('ui.search.empty')
      : results.length === 1
        ? t('ui.search.count.one')
        : t('ui.search.count.other').replace('{n}', String(results.length));
  }

  function go(route) {
    input.value = '';
    close();
    navigate(route);
  }

  input.addEventListener('input', render);
  input.addEventListener('focus', () => { if (input.value.trim() && !isOpen()) render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const action = escapeAction(isOpen(), input.value);
      if (action !== 'none') e.preventDefault();
      if (action === 'close') close();
      else if (action === 'clear') input.value = '';
    } else if (e.key === 'Enter') {
      if (isOpen() && results.length) {
        e.preventDefault();
        go(results[active >= 0 ? active : 0].route);
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Home/End are left to the text field for caret movement.
      if (!isOpen() && input.value.trim()) render();
      if (results.length) {
        e.preventDefault();
        setActive(nextActiveIndex(active, e.key, results.length));
      }
    }
  });
  // Keep focus in the input while pressing an option; the click then navigates.
  list.addEventListener('mousedown', (e) => e.preventDefault());
  list.addEventListener('click', (e) => {
    const opt = e.target.closest?.('[role="option"]');
    if (opt) go(opt.dataset.route);
  });
  list.addEventListener('mousemove', (e) => {
    const opt = e.target.closest?.('[role="option"]');
    if (opt) {
      const n = [...list.children].indexOf(opt);
      if (n !== active) setActive(n);
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (isOpen() && !panel.contains(e.target) && e.target !== input) close();
  });
  input.addEventListener('focusout', (e) => {
    if (isOpen() && !panel.contains(e.relatedTarget)) close();
  });

  return {
    rebuild() {
      index = buildIndex(topics, t);
      if (input.value.trim()) render();
    },
  };
}
