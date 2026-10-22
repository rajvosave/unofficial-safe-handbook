export function parseHash(hash) {
  if (typeof hash !== 'string') return { section: null, topic: null, route: '/' };
  const parts = hash.replace(/^#/, '').toLowerCase().split('/').filter(Boolean);
  const section = parts[0] ?? null;
  const topic = section ? (parts[1] ?? null) : null;
  const route = section ? (topic ? `/${section}/${topic}` : `/${section}`) : '/';
  return { section, topic, route };
}

export function startRouter(onRoute, win = window) {
  const fire = () => onRoute(parseHash(win.location.hash));
  win.addEventListener('hashchange', fire);
  fire();
}
