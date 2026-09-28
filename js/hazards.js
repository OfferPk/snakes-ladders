/**
 * Phase A — Moving hazards (local, turn-based).
 * Rule: 1–2 hazards occupy a square. Every HAZARD_PERIOD turns they shift
 * to a new random square (avoiding 1, 100, and occupied forks).
 * Landing on a hazard: go back HAZARD_BACK squares (min 1). Documented in STATUS.
 */
(function (global) {
  'use strict';

  const HAZARD_PERIOD = 3; // shift every N completed turns
  const HAZARD_BACK = 3;
  const COUNT = 2;

  let enabled = false;
  let hazards = []; // square numbers
  let turnCounter = 0;

  function pickSquare(avoid) {
    const set = new Set(avoid || []);
    for (let tries = 0; tries < 40; tries++) {
      const n = 5 + Math.floor(Math.random() * 90); // 5..94
      if (!set.has(n) && n !== 1 && n !== 100) return n;
    }
    return 50;
  }

  function reset(on) {
    enabled = !!on;
    turnCounter = 0;
    hazards = [];
    if (!enabled) return hazards;
    const avoid = [];
    for (let i = 0; i < COUNT; i++) {
      const n = pickSquare(avoid.concat(hazards));
      hazards.push(n);
      avoid.push(n);
    }
    return hazards.slice();
  }

  function get() {
    return hazards.slice();
  }

  function isEnabled() {
    return enabled;
  }

  /** Call after each turn completes (before next player). */
  function onTurnEnd() {
    if (!enabled) return false;
    turnCounter += 1;
    if (turnCounter % HAZARD_PERIOD !== 0) return false;
    const next = [];
    const avoid = [];
    for (let i = 0; i < hazards.length; i++) {
      const n = pickSquare(avoid.concat(next));
      next.push(n);
      avoid.push(n);
    }
    hazards = next;
    return true;
  }

  /**
   * If player landed on hazard, return penalty.
   * { hit: true, backTo: number, skipped?: false }
   * Rule used: go back HAZARD_BACK squares (not skip-turn) — clearer for pass-and-play.
   */
  function checkLanding(pos) {
    if (!enabled) return { hit: false };
    if (hazards.indexOf(pos) === -1) return { hit: false };
    const backTo = Math.max(1, pos - HAZARD_BACK);
    return { hit: true, backTo: backTo, amount: HAZARD_BACK };
  }

  function paint(boardEl) {
    if (!boardEl) return;
    boardEl.querySelectorAll('.sq.hazard').forEach((el) => {
      el.classList.remove('hazard');
      const mark = el.querySelector('.hazard-mark');
      if (mark) mark.remove();
    });
    if (!enabled) return;
    hazards.forEach((n) => {
      const sq = boardEl.querySelector('.sq[data-n="' + n + '"]');
      if (!sq) return;
      sq.classList.add('hazard');
      if (!sq.querySelector('.hazard-mark')) {
        const m = document.createElement('span');
        m.className = 'hazard-mark';
        m.textContent = '💥';
        m.title = 'Hazard: go back ' + HAZARD_BACK;
        sq.appendChild(m);
      }
    });
  }

  global.Hazards = {
    HAZARD_PERIOD, HAZARD_BACK, COUNT,
    reset, get, isEnabled, onTurnEnd, checkLanding, paint
  };
})(window);
