/**
 * Phase A — Local profile, coins, unlocks, shop catalog.
 * API shaped for js/game.js + js/ads.js.
 */
(function (global) {
  'use strict';

  const PROFILE_KEY = 'sl_profile_v2';
  const COINS_KEY = 'sl_coins_v2';
  const UNLOCKS_KEY = 'sl_unlocks_v2';
  const START_COINS = 200;

  const THEMES = [
    { id: 'classic', label: 'Classic', price: 0, desc: 'Familiar board & colors' },
    { id: 'deepsea', label: 'Deep Sea', price: 80, desc: 'Aquatic snakes & bubbles' },
    { id: 'tactical', label: 'Tactical', price: 120, desc: 'Branching fork at 22' }
  ];

  const DICE_SKINS = [
    { id: 'classic', label: 'Classic', price: 0 },
    { id: 'neon', label: 'Neon', price: 60, desc: 'Or unlock via rewarded ad' },
    { id: 'gold', label: 'Gold', price: 90, desc: 'Or unlock via rewarded ad' },
    { id: 'obsidian', label: 'Obsidian', price: 110 },
    { id: 'coral', label: 'Coral', price: 75 }
  ];

  const BORDERS = [
    { id: 'none', label: 'None', price: 0 },
    { id: 'gold', label: 'Gold ring', price: 40 },
    { id: 'neon', label: 'Neon glow', price: 55 },
    { id: 'tactical', label: 'Tactical camo', price: 60 },
    { id: 'deepsea', label: 'Abyssal', price: 60 }
  ];

  const EMBLEMS = [
    { id: 'swords', label: 'Crossed Swords', svg: '⚔️', free: true },
    { id: 'skull', label: 'Skull', svg: '💀', free: true },
    { id: 'tactical', label: 'Tactical', svg: '🎯', free: true },
    { id: 'neon', label: 'Neon', svg: '✦', free: true },
    { id: 'snake', label: 'Serpent', svg: '🐍', free: true },
    { id: 'shield', label: 'Shield', svg: '🛡️', free: true },
    { id: 'crown', label: 'Crown', svg: '👑', free: true },
    { id: 'bolt', label: 'Bolt', svg: '⚡', free: true }
  ];

  function defaultUnlocks() {
    return {
      themes: ['classic'],
      dice: ['classic'],
      borders: ['none'],
      emblem: EMBLEMS.map((e) => e.id)
    };
  }

  function loadUnlocks() {
    try {
      const raw = localStorage.getItem(UNLOCKS_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        const d = defaultUnlocks();
        return {
          themes: uniq([].concat(d.themes, o.themes || o.theme || [])),
          dice: uniq([].concat(d.dice, o.dice || [])),
          borders: uniq([].concat(d.borders, o.borders || [])),
          emblem: uniq([].concat(d.emblem, o.emblem || []))
        };
      }
    } catch (_) {}
    return defaultUnlocks();
  }

  function saveUnlocks(u) {
    try { localStorage.setItem(UNLOCKS_KEY, JSON.stringify(u)); } catch (_) {}
  }

  function uniq(a) { return [...new Set(a.filter(Boolean))]; }

  function getUnlocks() {
    return loadUnlocks();
  }

  function isUnlocked(category, id) {
    // Accept singular aliases from ads.js / Themes
    const cat = category === 'theme' ? 'themes'
      : category === 'border' ? 'borders'
      : category;
    const u = loadUnlocks();
    const list = u[cat] || u[category] || [];
    return list.indexOf(id) !== -1;
  }

  function unlock(category, id) {
    const cat = category === 'theme' ? 'themes'
      : category === 'border' ? 'borders'
      : category;
    const u = loadUnlocks();
    if (!u[cat]) u[cat] = [];
    if (u[cat].indexOf(id) === -1) {
      u[cat].push(id);
      saveUnlocks(u);
    }
    return true;
  }

  function defaultProfile() {
    return {
      name: 'Player',
      emblem: 'swords',
      theme: 'classic',
      diceSkin: 'classic',
      border: 'none'
    };
  }

  function getProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = Object.assign(defaultProfile(), JSON.parse(raw));
        p.name = String(p.name || 'Player').slice(0, 16);
        if (!isUnlocked('themes', p.theme)) p.theme = 'classic';
        if (!isUnlocked('dice', p.diceSkin)) p.diceSkin = 'classic';
        if (!isUnlocked('borders', p.border)) p.border = 'none';
        return p;
      }
    } catch (_) {}
    return defaultProfile();
  }

  function saveProfile(p) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (_) {}
  }

  function setName(name) {
    const p = getProfile();
    p.name = String(name || 'Player').slice(0, 16);
    saveProfile(p);
    return p;
  }

  function setEmblem(id) {
    const p = getProfile();
    if (EMBLEMS.some((e) => e.id === id)) {
      p.emblem = id;
      saveProfile(p);
    }
    return p;
  }

  function setTheme(id) {
    if (!isUnlocked('themes', id)) return getProfile();
    const p = getProfile();
    p.theme = id;
    saveProfile(p);
    try { document.body.dataset.theme = id; } catch (_) {}
    return p;
  }

  function setDiceSkin(id) {
    if (!isUnlocked('dice', id)) return getProfile();
    const p = getProfile();
    p.diceSkin = id;
    saveProfile(p);
    return p;
  }

  function setBorder(id) {
    if (!isUnlocked('borders', id)) return getProfile();
    const p = getProfile();
    p.border = id;
    saveProfile(p);
    return p;
  }

  function emblemMeta(id) {
    return EMBLEMS.find((e) => e.id === id) || EMBLEMS[0];
  }

  function getCoins() {
    try {
      const v = localStorage.getItem(COINS_KEY);
      if (v === null || v === undefined) {
        setCoins(START_COINS);
        return START_COINS;
      }
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? Math.max(0, n) : START_COINS;
    } catch (_) {
      return START_COINS;
    }
  }

  function setCoins(n) {
    const v = Math.max(0, Math.floor(n));
    try { localStorage.setItem(COINS_KEY, String(v)); } catch (_) {}
    return v;
  }

  function addCoins(delta) {
    return setCoins(getCoins() + (delta || 0));
  }

  function spendCoins(amount) {
    const a = Math.max(0, Math.floor(amount || 0));
    if (getCoins() < a) return false;
    setCoins(getCoins() - a);
    return true;
  }

  function catalogFor(cat) {
    if (cat === 'themes') return THEMES;
    if (cat === 'dice') return DICE_SKINS;
    if (cat === 'borders') return BORDERS;
    return [];
  }

  function buyItem(cat, id) {
    if (isUnlocked(cat, id)) return { ok: false, reason: 'owned' };
    const item = catalogFor(cat).find((x) => x.id === id);
    if (!item) return { ok: false, reason: 'unknown' };
    const price = item.price || 0;
    if (price > 0 && !spendCoins(price)) return { ok: false, reason: 'broke' };
    unlock(cat, id);
    return { ok: true, item: item };
  }

  /**
   * @param {boolean} won
   * @param {number} playerCount
   * @param {number} pot
   */
  function awardMatchCoins(won, playerCount, pot) {
    const base = won ? 30 : 8;
    const sizeBonus = Math.max(0, (playerCount || 2) - 2) * 5;
    const wager = won ? Math.max(0, pot || 0) : 0;
    const total = base + sizeBonus + wager;
    const coins = addCoins(total);
    return { total: total, base: base + sizeBonus, wager: wager, coins: coins };
  }

  // seed unlocks
  saveUnlocks(loadUnlocks());

  global.Profile = {
    THEMES, DICE_SKINS, BORDERS, EMBLEMS, START_COINS,
    getProfile, setName, setEmblem, setTheme, setDiceSkin, setBorder,
    emblemMeta, getCoins, setCoins, addCoins, spendCoins,
    isUnlocked, unlock, getUnlocks, buyItem, awardMatchCoins,
    // back-compat aliases used by older modules
    load: getProfile,
    save: saveProfile
  };
})(window);
