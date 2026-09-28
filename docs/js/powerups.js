/**
 * Phase A — Power-ups: shield, double, swap (local inventory).
 * shield: block one snake bite
 * double: next roll ×2 (capped at 12)
 * swap: swap positions with another player
 */
(function (global) {
  'use strict';

  const KEY = 'sl_powerups';
  const TYPES = ['shield', 'double', 'swap'];

  function loadInv() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const o = JSON.parse(raw);
        return {
          shield: Math.max(0, o.shield | 0),
          double: Math.max(0, o.double | 0),
          swap: Math.max(0, o.swap | 0)
        };
      }
    } catch (_) {}
    return { shield: 1, double: 1, swap: 0 }; // starter pack
  }

  function saveInv(inv) {
    try { localStorage.setItem(KEY, JSON.stringify(inv)); } catch (_) {}
  }

  function get() {
    return loadInv();
  }

  function add(type, qty) {
    if (TYPES.indexOf(type) === -1) return get();
    const inv = loadInv();
    inv[type] = (inv[type] || 0) + (qty || 1);
    saveInv(inv);
    return inv;
  }

  function consume(type) {
    const inv = loadInv();
    if (!inv[type] || inv[type] < 1) return false;
    inv[type] -= 1;
    saveInv(inv);
    return true;
  }

  /** Per-match runtime state (not persisted). */
  let match = {
    shieldArmed: false,
    doubleArmed: false
  };

  function resetMatch() {
    match = { shieldArmed: false, doubleArmed: false };
  }

  function armShield() {
    if (match.shieldArmed) return { ok: false, reason: 'armed' };
    if (!consume('shield')) return { ok: false, reason: 'none' };
    match.shieldArmed = true;
    return { ok: true };
  }

  function armDouble() {
    if (match.doubleArmed) return { ok: false, reason: 'armed' };
    if (!consume('double')) return { ok: false, reason: 'none' };
    match.doubleArmed = true;
    return { ok: true };
  }

  function useDoubleOnRoll(value) {
    if (!match.doubleArmed) return value;
    match.doubleArmed = false;
    return Math.min(12, value * 2);
  }

  function tryBlockSnake() {
    if (!match.shieldArmed) return false;
    match.shieldArmed = false;
    return true;
  }

  function isShieldArmed() { return !!match.shieldArmed; }
  function isDoubleArmed() { return !!match.doubleArmed; }

  /**
   * Swap positions between two players (mutates).
   * Returns false if invalid.
   */
  function doSwap(players, aIdx, bIdx) {
    if (!players || aIdx === bIdx) return false;
    if (aIdx < 0 || bIdx < 0 || aIdx >= players.length || bIdx >= players.length) return false;
    if (!consume('swap')) return false;
    const tmp = players[aIdx].pos;
    players[aIdx].pos = players[bIdx].pos;
    players[bIdx].pos = tmp;
    return true;
  }

  global.PowerUps = {
    TYPES, get, add, consume, resetMatch,
    armShield, armDouble, useDoubleOnRoll, tryBlockSnake,
    isShieldArmed, isDoubleArmed, doSwap
  };
})(window);
