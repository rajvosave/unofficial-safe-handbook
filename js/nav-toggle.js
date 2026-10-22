// Disclosure button that collapses the section navigation on narrow screens.
// CSS hides the button (and keeps the nav visible) on wide screens and when
// JavaScript is off (html.no-js), so only the narrow, scripted case collapses.

export const NAV_NARROW_QUERY = '(max-width: 720px)';

// Pure state transition: `open` is whether the nav is expanded on a narrow screen.
export function navReducer(open, event) {
  switch (event) {
    case 'toggle': return !open;
    case 'navigate':
    case 'escape':
    case 'wide': return false;
    default: return open;
  }
}

export function mountNavToggle(button, nav, win = window) {
  let open = false;
  const mq = win.matchMedia?.(NAV_NARROW_QUERY);

  function apply() {
    button.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  }
  function dispatch(event) {
    open = navReducer(open, event);
    apply();
  }

  button.setAttribute('aria-controls', nav.id);
  button.addEventListener('click', () => dispatch('toggle'));
  const onEscape = (e) => {
    if (e.key === 'Escape' && open && mq?.matches) {
      dispatch('escape');
      button.focus();
    }
  };
  button.addEventListener('keydown', onEscape);
  // Picking a link closes the menu even when it points at the current page.
  nav.addEventListener('click', (e) => { if (e.target.closest?.('a')) dispatch('navigate'); });
  nav.addEventListener('keydown', onEscape);
  mq?.addEventListener?.('change', (e) => { if (!e.matches) dispatch('wide'); });
  apply();

  return {
    // Called after every route change; on a narrow screen the menu closes.
    navigated() { dispatch('navigate'); },
  };
}
