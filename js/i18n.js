const STORAGE_KEY = 'safe.lang';
const FALLBACK_LANG = 'en';

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function createI18n({ dicts = {}, defaultLang = FALLBACK_LANG, storage } = {}) {
  const store = storage === undefined ? defaultStorage() : storage;

  const has = (lang) => typeof lang === 'string' && Object.hasOwn(dicts, lang);

  let current = has(defaultLang) ? defaultLang : FALLBACK_LANG;
  try {
    const saved = store?.getItem(STORAGE_KEY);
    if (has(saved)) current = saved;
  } catch {
    // storage unavailable; keep default
  }

  function lookup(lang, key) {
    const dict = dicts[lang];
    return dict && Object.hasOwn(dict, key) ? dict[key] : undefined;
  }

  return {
    t(key) {
      return lookup(current, key) ?? lookup(FALLBACK_LANG, key) ?? key;
    },
    setLang(lang) {
      if (!has(lang)) return;
      current = lang;
      try {
        store?.setItem(STORAGE_KEY, lang);
      } catch {
        // ignore persistence failures
      }
    },
    getLang() {
      return current;
    },
  };
}
