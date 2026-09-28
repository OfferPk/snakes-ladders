/**
 * Phase A — Themes: classic / deep-sea / tactical.
 * Persists choice in localStorage; applies data-theme on <body>.
 */
(function (global) {
  'use strict';

  const KEY = 'sl_theme';
  const THEMES = {
    classic: { id: 'classic', label: 'Classic', locked: false, price: 0 },
    deepsea: { id: 'deepsea', label: 'Deep Sea', locked: true, price: 80 },
    tactical: { id: 'tactical', label: 'Tactical', locked: true, price: 120 }
  };

  function load() {
    try {
      const t = localStorage.getItem(KEY);
      if (t && THEMES[t]) return t;
    } catch (_) {}
    return 'classic';
  }

  function save(id) {
    try { localStorage.setItem(KEY, id); } catch (_) {}
  }

  function isUnlocked(id) {
    if (!THEMES[id] || !THEMES[id].locked) return true;
    if (typeof Profile !== 'undefined' && Profile.isUnlocked) {
      if (Profile.isUnlocked('themes', id)) return true;
    }
    if (typeof Economy !== 'undefined' && Economy.hasUnlock) {
      return Economy.hasUnlock('theme:' + id);
    }
    try {
      const raw = localStorage.getItem('sl_unlocks');
      const list = raw ? JSON.parse(raw) : [];
      return list.indexOf('theme:' + id) !== -1;
    } catch (_) {
      return false;
    }
  }

  function apply(id) {
    const theme = THEMES[id] && isUnlocked(id) ? id : 'classic';
    document.body.setAttribute('data-theme', theme);
    save(theme);
    return theme;
  }

  function init() {
    apply(load());
  }

  function list() {
    return Object.keys(THEMES).map((k) => {
      const t = THEMES[k];
      return Object.assign({}, t, { unlocked: isUnlocked(k) });
    });
  }

  global.Themes = { KEY, THEMES, load, save, apply, init, list, isUnlocked };
})(window);
