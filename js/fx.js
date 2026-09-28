/**
 * Phase A — Juicy FX for game.js: dice tumble, shake, particles, status flash.
 */
(function (global) {
  'use strict';

  function ensureLayer() {
    let layer = document.getElementById('fx-layer');
    if (!layer) {
      const wrap = document.querySelector('.board-wrap') || document.getElementById('app');
      layer = document.createElement('div');
      layer.id = 'fx-layer';
      layer.className = 'fx-layer';
      layer.setAttribute('aria-hidden', 'true');
      if (wrap) wrap.appendChild(layer);
    }
    return layer;
  }

  function shake(el, ms) {
    if (!el) return;
    el.classList.remove('fx-shake', 'fx-shake-hard');
    void el.offsetWidth;
    el.classList.add('fx-shake-hard');
    setTimeout(() => el.classList.remove('fx-shake-hard'), ms || 450);
  }

  function diceShake(diceEl) {
    if (!diceEl) return;
    diceEl.classList.remove('fx-shake');
    void diceEl.offsetWidth;
    diceEl.classList.add('fx-shake');
    setTimeout(() => diceEl.classList.remove('fx-shake'), 500);
  }

  async function tumbleDice(diceEl, faceEl, value, faces, sleepFn) {
    const sleep = sleepFn || ((ms) => new Promise((r) => setTimeout(r, ms)));
    if (diceEl) {
      diceEl.classList.add('rolling', 'fx-shake');
    }
    for (let i = 0; i < 8; i++) {
      if (faceEl) faceEl.textContent = faces[Math.floor(Math.random() * 6)];
      await sleep(45 + i * 12);
    }
    if (faceEl) faceEl.textContent = faces[value - 1];
    if (diceEl) {
      diceEl.classList.remove('rolling', 'fx-shake');
    }
  }

  function burst(xPct, yPct, color, count) {
    const layer = ensureLayer();
    const n = count || 14;
    const colors = color ? [color, '#fff', color] : ['#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#fff'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'fx-particle';
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.35;
      const dist = 26 + Math.random() * 48;
      p.style.left = xPct + '%';
      p.style.top = yPct + '%';
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      p.style.background = colors[i % colors.length];
      layer.appendChild(p);
      setTimeout(() => p.remove(), 720);
    }
  }

  function burstAtSquare(n, color) {
    if (typeof Board === 'undefined' || !n) {
      burst(50, 50, color, 12);
      return;
    }
    const c = Board.gridCenterPercent(n);
    burst(c.left, c.top, color, 16);
  }

  function flashStatus(kind) {
    const app = document.getElementById('app');
    if (!app) return;
    const cls = kind === 'snake' ? 'fx-flash-snake' : 'fx-flash-ladder';
    app.classList.remove('fx-flash-snake', 'fx-flash-ladder');
    void app.offsetWidth;
    app.classList.add(cls);
    setTimeout(() => app.classList.remove(cls), 420);
  }

  function winBurst() {
    burst(50, 40, '#ffd166', 22);
    setTimeout(() => burst(30, 55, '#06d6a0', 12), 100);
    setTimeout(() => burst(70, 55, '#ef476f', 12), 180);
  }

  global.FX = {
    ensureLayer, shake, diceShake, tumbleDice,
    burst, burstAtSquare, flashStatus, winBurst,
    boardShake: function () { shake(document.querySelector('.board-wrap'), 550); },
    pieceShake: function (el) { shake(el, 450); }
  };
})(window);
