export function parseHash(hash) {
  if (typeof hash !== 'string') return { section: null, topic: null, route: '/' };
  const parts = hash.replace(/^#/, '').toLowerCase().split('/').filter(Boolean);
  const section = parts[0] ?? null;
  const topic = section ? (parts[1] ?? null) : null;
  const route = section ? (topic ? `/${section}/${topic}` : `/${section}`) : '/';
  return { section, topic, route };
}

export function startRouter(onRoute, win = window) {
  // A prerendered page (/events/pi-planning/) names its topic on <body>; it
  // applies while the hash is empty, so the app shows what the URL says.
  const fire = () => {
    const hash = win.location.hash;
    const base = win.document?.body?.dataset?.route;
    onRoute(parseHash(base && (!hash || hash === '#') ? `#${base}` : hash));
  };
  win.addEventListener('hashchange', fire);
  fire();
}
