/**
 * Phase A — Local coins, wager, shop (all localStorage).
 */
(function (global) {
  'use strict';

  const COINS_KEY = 'sl_coins';
  const UNLOCKS_KEY = 'sl_unlocks';
  const START_COINS = 150;
  const MATCH_REWARD = 25;

  /** @type {number|null} wager for current match */
  let pendingWager = 0;

  const SHOP = [
    { id: 'theme:deepsea', type: 'theme', ref: 'deepsea', label: 'Deep Sea theme', price: 80 },
    { id: 'theme:tactical', type: 'theme', ref: 'tactical', label: 'Tactical theme', price: 120 },
    { id: 'emblem:crown', type: 'emblem', ref: 'crown', label: 'Crown emblem', price: 50 },
    { id: 'emblem:dragon', type: 'emblem', ref: 'dragon', label: 'Dragon emblem', price: 100 },
    { id: 'emblem:robot', type: 'emblem', ref: 'robot', label: 'Robot emblem', price: 60 },
    { id: 'emblem:gem', type: 'emblem', ref: 'gem', label: 'Gem emblem', price: 90 },
    { id: 'emblem:fire', type: 'emblem', ref: 'fire', label: 'Fire emblem', price: 70 },
    { id: 'pu:shield', type: 'powerup', ref: 'shield', label: 'Shield ×1', price: 30, qty: 1 },
    { id: 'pu:double', type: 'powerup', ref: 'double', label: 'Double roll ×1', price: 35, qty: 1 },
    { id: 'pu:swap', type: 'powerup', ref: 'swap', label: 'Swap ×1', price: 40, qty: 1 },
    { id: 'cosmetic:trail', type: 'cosmetic', ref: 'trail', label: 'Sparkle trail', price: 55 }
  ];

  function getCoins() {
    if (typeof Profile !== 'undefined' && Profile.getCoins) return Profile.getCoins();
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
    if (typeof Profile !== 'undefined' && Profile.setCoins) return Profile.setCoins(v);
    try { localStorage.setItem(COINS_KEY, String(v)); } catch (_) {}
    return v;
  }

  function addCoins(delta) {
    return setCoins(getCoins() + delta);
  }

  function spend(amount) {
    const c = getCoins();
    if (c < amount) return false;
    setCoins(c - amount);
    return true;
  }

  function getUnlocks() {
    try {
      const raw = localStorage.getItem(UNLOCKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveUnlocks(list) {
    try { localStorage.setItem(UNLOCKS_KEY, JSON.stringify(list)); } catch (_) {}
  }

  function hasUnlock(id) {
    return getUnlocks().indexOf(id) !== -1;
  }

  function grantUnlock(id) {
    const list = getUnlocks();
    if (list.indexOf(id) === -1) {
      list.push(id);
      saveUnlocks(list);
    }
  }

  function buy(shopId) {
    const item = SHOP.find((s) => s.id === shopId);
    if (!item) return { ok: false, reason: 'unknown' };
    if (item.type !== 'powerup' && hasUnlock(item.id)) {
      return { ok: false, reason: 'owned' };
    }
    if (!spend(item.price)) return { ok: false, reason: 'broke' };

    if (item.type === 'powerup') {
      if (typeof PowerUps !== 'undefined') {
        PowerUps.add(item.ref, item.qty || 1);
      }
    } else {
      grantUnlock(item.id);
      if (typeof Profile !== 'undefined' && Profile.unlock) {
        if (item.type === 'theme') Profile.unlock('themes', item.ref);
        if (item.type === 'emblem') Profile.unlock('emblem', item.ref); // free emblems already unlocked
        if (item.type === 'cosmetic') Profile.unlock('cosmetic', item.ref);
      }
    }
    return { ok: true, item: item };
  }

  function setWager(amount) {
    const a = Math.max(0, Math.floor(amount || 0));
    const max = Math.floor(getCoins() / 2); // each human side conceptually; we take from local purse once
    pendingWager = Math.min(a, max, getCoins());
    return pendingWager;
  }

  function getWager() {
    return pendingWager;
  }

  function lockWagerForMatch() {
    if (pendingWager <= 0) return { pot: 0, locked: 0 };
    const w = pendingWager;
    if (!spend(w)) {
      pendingWager = 0;
      return { pot: 0, locked: 0 };
    }
    // Pot = wager * 2 (imaginary opponent ante matched from thin air for local PvP fun,
    // or for bot matches house matches). Documented: winner takes pot = 2× wager.
    return { pot: w * 2, locked: w };
  }

  function payoutWin(pot, multiplier) {
    const m = multiplier && multiplier > 1 ? multiplier : 1;
    const gain = Math.floor((pot || 0) * m) + Math.floor(MATCH_REWARD * m);
    addCoins(gain);
    pendingWager = 0;
    return gain;
  }

  function refundOnLeave(locked) {
    if (locked > 0) addCoins(locked);
    pendingWager = 0;
  }

  function shopList() {
    return SHOP.map((s) => Object.assign({}, s, {
      owned: s.type !== 'powerup' && hasUnlock(s.id)
    }));
  }

  global.Economy = {
    START_COINS, MATCH_REWARD, SHOP,
    getCoins, setCoins, addCoins, spend,
    hasUnlock, grantUnlock, buy, shopList,
    setWager, getWager, lockWagerForMatch, payoutWin, refundOnLeave
  };
})(window);
