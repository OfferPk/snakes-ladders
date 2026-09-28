/**
 * Lightweight Web Audio beeps — no asset files required.
 */
(function (global) {
  'use strict';

  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  function setEnabled(on) {
    enabled = !!on;
    try { localStorage.setItem('sl_sound', enabled ? '1' : '0'); } catch (_) {}
  }

  function isEnabled() {
    return enabled;
  }

  function loadPref() {
    try {
      const v = localStorage.getItem('sl_sound');
      if (v === '0') enabled = false;
      if (v === '1') enabled = true;
    } catch (_) {}
    return enabled;
  }

  function beep(freq, dur, type, gain) {
    if (!enabled) return;
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.value = gain == null ? 0.08 : gain;
    osc.connect(g);
    g.connect(c.destination);
    const now = c.currentTime;
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function roll() {
    beep(220, 0.06, 'square', 0.05);
    setTimeout(() => beep(330, 0.06, 'square', 0.05), 80);
    setTimeout(() => beep(440, 0.08, 'square', 0.06), 160);
  }

  function move() {
    beep(520, 0.05, 'triangle', 0.06);
  }

  function ladder() {
    beep(400, 0.08, 'sine', 0.07);
    setTimeout(() => beep(600, 0.1, 'sine', 0.07), 90);
    setTimeout(() => beep(800, 0.12, 'sine', 0.07), 180);
  }

  function snake() {
    beep(400, 0.1, 'sawtooth', 0.05);
    setTimeout(() => beep(250, 0.15, 'sawtooth', 0.05), 100);
  }

  function win() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => beep(f, 0.18, 'sine', 0.09), i * 140);
    });
  }

  function click() {
    beep(700, 0.04, 'square', 0.04);
  }

  global.SFX = {
    setEnabled,
    isEnabled,
    loadPref,
    roll,
    move,
    ladder,
    snake,
    win,
    click
  };
})(window);
