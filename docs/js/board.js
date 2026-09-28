/**
 * Multi-theme boards, power-up tiles, moving hazards, branching paths.
 * Win rule: exact landing on 100 required (overshoot stays put).
 */
(function (global) {
  'use strict';

  const COLORS = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f'];

  const POWER_TYPES = {
    shield: { icon: '🛡️', label: 'Shield' },
    double: { icon: '🎲', label: 'Double Dice' },
    swap: { icon: '🔄', label: 'Teleport Swap' }
  };

  /** Classic Milton-Bradley-style. */
  const CLASSIC = {
    id: 'classic',
    snakes: {
      16: 6, 47: 26, 49: 11, 56: 53, 62: 19,
      64: 60, 87: 24, 93: 73, 95: 75, 98: 78
    },
    ladders: {
      1: 38, 4: 14, 9: 31, 21: 42, 28: 84,
      36: 44, 51: 67, 71: 91, 80: 100
    },
    powerUps: { 10: 'shield', 25: 'double', 40: 'swap', 55: 'shield', 70: 'double' },
    movingSnakes: [62, 87], // heads that drift ±1 row
    moveEvery: 3,
    forks: null,
    marks: { snake: '🐍', ladder: '🪜' }
  };

  /** Deep Sea — aquatic look, more mid-board hazards. */
  const DEEPSEA = {
    id: 'deepsea',
    snakes: {
      17: 7, 19: 5, 34: 12, 48: 28, 54: 33,
      63: 22, 68: 50, 86: 45, 92: 70, 97: 58, 99: 79
    },
    ladders: {
      2: 23, 8: 30, 15: 44, 20: 41, 32: 72,
      46: 65, 60: 82, 74: 94, 78: 100
    },
    powerUps: { 6: 'shield', 27: 'double', 39: 'swap', 52: 'shield', 76: 'double' },
    movingSnakes: [63, 86, 97],
    moveEvery: 3,
    forks: null,
    marks: { snake: '🦑', ladder: '🫧' }
  };

  /**
   * Tactical Zone — branching board.
   * Fork at 22: Safe corridor (→24) vs Risk shortcut (→38) with denser snakes.
   */
  const TACTICAL = {
    id: 'tactical',
    snakes: {
      14: 4, 38: 18, 43: 21, 45: 25, 57: 35,
      66: 46, 69: 48, 85: 55, 90: 72, 94: 67, 96: 61, 98: 77
    },
    ladders: {
      3: 20, 7: 29, 12: 33, 24: 42, 31: 50,
      47: 68, 53: 75, 64: 83, 79: 99, 81: 100
    },
    powerUps: { 11: 'shield', 30: 'double', 41: 'swap', 58: 'shield', 73: 'double' },
    movingSnakes: [45, 85, 96],
    moveEvery: 2,
    forks: {
      22: {
        label: 'Path Fork',
        safe: { to: 24, label: 'Safe corridor (longer)' },
        risk: { to: 38, label: 'Risk shortcut (snakes ahead)' }
      }
    },
    marks: { snake: '⚠️', ladder: '📡' }
  };

  const THEMES = { classic: CLASSIC, deepsea: DEEPSEA, tactical: TACTICAL };

  let active = cloneTheme(CLASSIC);
  let turnCounter = 0;
  let branchModeForced = false;

  const CLASSIC_FORKS = {
    40: {
      label: 'Path Fork',
      safe: { to: 52, label: 'Left branch → 52 (rejoins)' },
      risk: { to: 41, label: 'Right / main path' }
    },
    70: {
      label: 'Path Fork',
      safe: { to: 85, label: 'Left branch → 85 (rejoins)' },
      risk: { to: 71, label: 'Right / main path' }
    }
  };

  function cloneTheme(t) {
    return {
      id: t.id,
      snakes: Object.assign({}, t.snakes),
      ladders: Object.assign({}, t.ladders),
      powerUps: Object.assign({}, t.powerUps),
      movingSnakes: (t.movingSnakes || []).slice(),
      moveEvery: t.moveEvery || 3,
      forks: t.forks ? JSON.parse(JSON.stringify(t.forks)) : null,
      marks: Object.assign({}, t.marks),
      baseSnakes: Object.assign({}, t.snakes)
    };
  }

  function setTheme(id) {
    const t = THEMES[id] || THEMES.classic;
    active = cloneTheme(t);
    turnCounter = 0;
    if (branchModeForced && active.id !== 'tactical') {
      active.forks = JSON.parse(JSON.stringify(CLASSIC_FORKS));
    }
    return active.id;
  }

  /**
   * Optional branching paths. Classic/deepsea get forks at 40 & 70.
   * Tactical theme already includes a fork at 22.
   * Left = shortcut rejoin; Right = continue main path.
   */
  function setBranchMode(on) {
    branchModeForced = !!on;
    if (active.id === 'tactical') {
      if (!active.forks && THEMES.tactical.forks) {
        active.forks = JSON.parse(JSON.stringify(THEMES.tactical.forks));
      }
      return true;
    }
    if (branchModeForced) {
      active.forks = JSON.parse(JSON.stringify(CLASSIC_FORKS));
    } else {
      active.forks = null;
    }
    return branchModeForced;
  }

  function isBranchMode() {
    return !!(branchModeForced || (active.forks && Object.keys(active.forks).length));
  }

  function getThemeId() { return active.id; }

  function getSnakes() { return active.snakes; }
  function getLadders() { return active.ladders; }
  function getPowerUps() { return active.powerUps; }
  function getForks() { return active.forks; }

  function squareToGrid(n) {
    const idx = n - 1;
    const rowFromBottom = Math.floor(idx / 10);
    const colInRow = idx % 10;
    const row = 9 - rowFromBottom;
    const col = rowFromBottom % 2 === 0 ? colInRow : 9 - colInRow;
    return { row, col };
  }

  function gridCenterPercent(n) {
    const { row, col } = squareToGrid(n);
    return {
      left: ((col + 0.5) / 10) * 100,
      top: ((row + 0.5) / 10) * 100
    };
  }

  /** Shift a square by ±1 row (10 squares), clamp 1–99 heads. */
  function shiftByRow(n, dir) {
    const next = n + dir * 10;
    if (next < 1 || next > 99) return n;
    return next;
  }

  /**
   * Call after each full round of turns (or each N turns).
   * Moving snake heads drift ±1 row; tails stay relative when possible.
   */
  function tickHazards() {
    turnCounter++;
    if (turnCounter % active.moveEvery !== 0) return { moved: false };
    const moved = [];
    const dirs = [1, -1];
    active.movingSnakes.forEach((head, idx) => {
      if (!active.snakes[head]) return;
      const tail = active.snakes[head];
      const dir = dirs[(turnCounter + idx) % 2];
      let newHead = shiftByRow(head, dir);
      // avoid landing on ladder bottoms / other snake heads / power / forks / 100
      let tries = 0;
      while (
        tries < 4 &&
        (newHead === head ||
          active.ladders[newHead] ||
          (active.snakes[newHead] && newHead !== head) ||
          active.powerUps[newHead] ||
          (active.forks && active.forks[newHead]) ||
          newHead >= 100)
      ) {
        newHead = shiftByRow(head, -dir);
        tries++;
        if (tries > 1) break;
      }
      if (newHead === head || newHead < 1 || newHead > 99) return;
      // keep drop distance roughly similar
      let newTail = shiftByRow(tail, dir);
      if (newTail < 1) newTail = Math.max(1, tail - 5);
      if (newTail >= newHead) newTail = Math.max(1, newHead - 10);
      delete active.snakes[head];
      active.snakes[newHead] = newTail;
      active.movingSnakes[idx] = newHead;
      moved.push({ from: head, to: newHead, tail: newTail });
    });
    return { moved: moved.length > 0, changes: moved };
  }

  function buildBoard(boardEl) {
    boardEl.innerHTML = '';
    boardEl.dataset.theme = active.id;
    const marks = active.marks;
    for (let visualRow = 0; visualRow < 10; visualRow++) {
      const rowFromBottom = 9 - visualRow;
      for (let visualCol = 0; visualCol < 10; visualCol++) {
        const colInRow = rowFromBottom % 2 === 0 ? visualCol : 9 - visualCol;
        const n = rowFromBottom * 10 + colInRow + 1;
        const sq = document.createElement('div');
        sq.className = 'sq ' + ((visualRow + visualCol) % 2 === 0 ? 'light' : 'dark');
        if (n === 1) sq.classList.add('start');
        if (n === 100) sq.classList.add('finish');
        if (active.powerUps[n]) sq.classList.add('power', 'power-' + active.powerUps[n]);
        if (active.forks && active.forks[n]) sq.classList.add('fork');
        if (active.movingSnakes.indexOf(n) !== -1) sq.classList.add('hazard-move');
        sq.dataset.n = String(n);
        const num = document.createElement('span');
        num.className = 'sq-num';
        num.textContent = String(n);
        sq.appendChild(num);
        if (active.snakes[n]) {
          const m = document.createElement('span');
          m.className = 'mark';
          m.textContent = marks.snake;
          sq.appendChild(m);
        } else if (active.ladders[n]) {
          const m = document.createElement('span');
          m.className = 'mark';
          m.textContent = marks.ladder;
          sq.appendChild(m);
        }
        if (active.powerUps[n]) {
          const m = document.createElement('span');
          m.className = 'mark power-mark';
          m.textContent = POWER_TYPES[active.powerUps[n]].icon;
          sq.appendChild(m);
        }
        if (active.forks && active.forks[n]) {
          const m = document.createElement('span');
          m.className = 'mark fork-mark';
          m.textContent = '🔀';
          sq.appendChild(m);
        }
        boardEl.appendChild(sq);
      }
    }
  }

  function themeColors() {
    if (active.id === 'deepsea') {
      return {
        snake0: '#00bbf9', snake1: '#0077b6',
        ladder0: '#80ffdb', ladder1: '#56cfe1'
      };
    }
    if (active.id === 'tactical') {
      return {
        snake0: '#e9c46a', snake1: '#bc4749',
        ladder0: '#90be6d', ladder1: '#43aa8b'
      };
    }
    return {
      snake0: '#ef476f', snake1: '#9b2226',
      ladder0: '#06d6a0', ladder1: '#118ab2'
    };
  }

  function drawOverlays(svg) {
    svg.innerHTML = '';
    const ns = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(ns, 'defs');
    const tc = themeColors();

    const snakeGrad = document.createElementNS(ns, 'linearGradient');
    snakeGrad.setAttribute('id', 'snakeGrad');
    snakeGrad.innerHTML =
      '<stop offset="0%" stop-color="' + tc.snake0 + '"/><stop offset="100%" stop-color="' + tc.snake1 + '"/>';
    defs.appendChild(snakeGrad);

    const ladderGrad = document.createElementNS(ns, 'linearGradient');
    ladderGrad.setAttribute('id', 'ladderGrad');
    ladderGrad.innerHTML =
      '<stop offset="0%" stop-color="' + tc.ladder0 + '"/><stop offset="100%" stop-color="' + tc.ladder1 + '"/>';
    defs.appendChild(ladderGrad);

    const marker = document.createElementNS(ns, 'marker');
    marker.setAttribute('id', 'arrowSnake');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('refX', '5');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    marker.innerHTML = '<path d="M0,0 L6,3 L0,6 Z" fill="' + tc.snake1 + '"/>';
    defs.appendChild(marker);

    const markerL = document.createElementNS(ns, 'marker');
    markerL.setAttribute('id', 'arrowLadder');
    markerL.setAttribute('markerWidth', '6');
    markerL.setAttribute('markerHeight', '6');
    markerL.setAttribute('refX', '5');
    markerL.setAttribute('refY', '3');
    markerL.setAttribute('orient', 'auto');
    markerL.innerHTML = '<path d="M0,0 L6,3 L0,6 Z" fill="' + tc.ladder1 + '"/>';
    defs.appendChild(markerL);

    svg.appendChild(defs);
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    function pathBetween(from, to, color, markerId, dash, extraClass) {
      const a = gridCenterPercent(from);
      const b = gridCenterPercent(to);
      const path = document.createElementNS(ns, 'path');
      const mx = (a.left + b.left) / 2;
      const my = (a.top + b.top) / 2;
      const dx = b.left - a.left;
      const dy = b.top - a.top;
      const cx = mx - dy * 0.15;
      const cy = my + dx * 0.15;
      path.setAttribute('d', 'M ' + a.left + ' ' + a.top + ' Q ' + cx + ' ' + cy + ' ' + b.left + ' ' + b.top);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', '1.8');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('opacity', '0.85');
      path.setAttribute('marker-end', 'url(#' + markerId + ')');
      if (dash) path.setAttribute('stroke-dasharray', dash);
      if (extraClass) path.setAttribute('class', extraClass);
      svg.appendChild(path);
    }

    Object.keys(active.ladders).forEach((from) => {
      pathBetween(+from, active.ladders[+from], 'url(#ladderGrad)', 'arrowLadder', null);
    });
    Object.keys(active.snakes).forEach((from) => {
      const moving = active.movingSnakes.indexOf(+from) !== -1;
      pathBetween(+from, active.snakes[+from], 'url(#snakeGrad)', 'arrowSnake', moving ? '2 2' : '3 2', moving ? 'moving-hazard' : null);
    });

    // fork preview paths (safe dashed green, risk dashed orange)
    if (active.forks) {
      Object.keys(active.forks).forEach((from) => {
        const f = active.forks[+from];
        pathBetween(+from, f.safe.to, '#90be6d', 'arrowLadder', '4 3');
        pathBetween(+from, f.risk.to, '#f4a261', 'arrowSnake', '4 3');
      });
    }
  }

  function applyTeleport(pos) {
    if (active.ladders[pos]) return { pos: active.ladders[pos], type: 'ladder' };
    if (active.snakes[pos]) return { pos: active.snakes[pos], type: 'snake' };
    return { pos, type: null };
  }

  function resolveMove(from, roll) {
    const tentative = from + roll;
    if (tentative > 100) {
      return { landed: from, final: from, bounce: true, teleport: null };
    }
    const tele = applyTeleport(tentative);
    return {
      landed: tentative,
      final: tele.pos,
      bounce: false,
      teleport: tele.type
    };
  }

  function pickupPower(pos) {
    const type = active.powerUps[pos];
    if (!type) return null;
    delete active.powerUps[pos];
    return type;
  }

  function getFork(pos) {
    return active.forks && active.forks[pos] ? active.forks[pos] : null;
  }

  function tokenOffset(index, total) {
    const offsets = [
      [{ x: 0, y: 0 }],
      [{ x: -12, y: -8 }, { x: 12, y: 8 }],
      [{ x: -14, y: -10 }, { x: 0, y: 4 }, { x: 14, y: -6 }],
      [{ x: -14, y: -10 }, { x: 14, y: -10 }, { x: -14, y: 10 }, { x: 14, y: 10 }]
    ];
    const set = offsets[Math.min(total, 4) - 1] || offsets[0];
    return set[index] || { x: 0, y: 0 };
  }

  // Back-compat aliases used by older code
  Object.defineProperty(global, 'Board', {
    configurable: true,
    writable: true,
    value: {
      get SNAKES() { return active.snakes; },
      get LADDERS() { return active.ladders; },
      COLORS,
      POWER_TYPES,
      THEMES,
      setTheme,
      getThemeId,
      getSnakes,
      getLadders,
      getPowerUps,
      getForks,
      squareToGrid,
      gridCenterPercent,
      buildBoard,
      drawOverlays,
      applyTeleport,
      resolveMove,
      pickupPower,
      getFork,
      tickHazards,
      setBranchMode,
      isBranchMode,
      tokenOffset,
      WIN_RULE: 'exact-100'
    }
  });
})(window);
