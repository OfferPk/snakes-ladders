#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const chromeCandidates = [
  process.env.CHROMIUM_PATH,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome'
].filter(Boolean);
const chromium = chromeCandidates.find((candidate) => fs.existsSync(candidate));
if (!chromium) {
  throw new Error('Chromium is required for this browser regression (set CHROMIUM_PATH if needed).');
}

const fixtureBridge = `
  window.__SL_ACCESSIBILITY_TEST__ = {
    prepareExactWin: function () {
      players = [
        { name: 'Synthetic Winner', color: Board.COLORS[0], isBot: false, pos: 99, inventory: [], shield: false },
        { name: 'Synthetic Opponent', color: Board.COLORS[1], isBot: false, pos: 0, inventory: [], shield: false }
      ];
      current = 0;
      rolling = false;
      gameOver = false;
      doubleDicePending = false;
      pendingSnakeUndo = null;
      secondChanceUsed = true;
      wagerStake = 0;
      wagerPot = 0;
      if (typeof Board.setBranchMode === 'function') Board.setBranchMode(false);
      if (typeof Hazards !== 'undefined') Hazards.reset(false);
      els['modal-win'].hidden = true;
      placeTokens();
      renderHud();
      updateTurnUI();
      setStatus('Rolled 1');
    },
    runExactWin: async function () {
      const originalRandom = Math.random;
      Math.random = function () { return 0; };
      try {
        await doTurn();
      } finally {
        Math.random = originalRandom;
      }
    },
    snapshot: function () {
      return {
        players: players.map(function (player) { return { name: player.name, pos: player.pos }; }),
        current: current,
        rolling: rolling,
        gameOver: gameOver,
        status: els['status-msg'].textContent,
        modalHidden: els['modal-win'].hidden,
        dialogRole: els['modal-win'].getAttribute('role'),
        ariaModal: els['modal-win'].getAttribute('aria-modal'),
        labelledBy: els['modal-win'].getAttribute('aria-labelledby'),
        title: els['win-title'].textContent,
        titleTabIndex: els['win-title'].tabIndex,
        titleLive: els['win-title'].getAttribute('aria-live'),
        titleAtomic: els['win-title'].getAttribute('aria-atomic'),
        activeElementId: document.activeElement && document.activeElement.id
      };
    }
  };
`;

function mimeType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webmanifest': 'application/manifest+json; charset=utf-8'
  })[ext] || 'application/octet-stream';
}

function createSiteServer(siteRoot) {
  const absoluteRoot = path.resolve(siteRoot);
  return http.createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    } catch (_) {
      res.writeHead(400).end('Bad request');
      return;
    }
    let relative = pathname.replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(absoluteRoot, relative);
    if (file !== absoluteRoot && !file.startsWith(absoluteRoot + path.sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    fs.readFile(file, (error, content) => {
      if (error) {
        res.writeHead(404).end('Not found');
        return;
      }
      if (relative === 'js/game.js') {
        const source = content.toString('utf8');
        const closing = /\n\}\)\(\);\s*$/;
        if (!closing.test(source)) {
          res.writeHead(500).end('Test fixture could not instrument the game controller');
          return;
        }
        content = Buffer.from(source.replace(closing, '\n' + fixtureBridge + '\n})();\n'));
      }
      res.writeHead(200, {
        'Content-Type': mimeType(file),
        'Cache-Control': 'no-store'
      });
      res.end(content);
    });
  });
}

function once(emitter, event) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      emitter.removeListener(event, onEvent);
      reject(error);
    };
    const onEvent = (...args) => {
      emitter.removeListener('error', onError);
      resolve(args);
    };
    emitter.once(event, onEvent);
    emitter.once('error', onError);
  });
}

function createCdp(wsUrl) {
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  let nextId = 0;
  socket.addEventListener('message', (event) => {
    let message;
    try {
      message = JSON.parse(String(event.data));
    } catch (_) {
      return;
    }
    if (!message.id) return;
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    clearTimeout(waiter.timer);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result || {});
  });
  socket.addEventListener('error', () => {
    for (const waiter of pending.values()) waiter.reject(new Error('Chromium DevTools connection failed'));
    pending.clear();
  });
  return {
    async open() {
      await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
      });
    },
    send(method, params = {}) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error('Timed out waiting for Chromium DevTools: ' + method));
        }, 15000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      try { socket.close(); } catch (_) {}
    }
  };
}

async function waitFor(predicate, description, timeoutMs = 12000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for ' + description);
}

async function pressTab(cdp, reverse = false) {
  const modifiers = reverse ? 8 : 0;
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers });
}

async function httpJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Chromium DevTools HTTP error: ' + response.status);
  return response.json();
}

async function runSuite(siteRoot, label) {
  const server = createSiteServer(siteRoot);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const sitePort = server.address().port;
  const profileRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'snakes-a11y-test-'));
  const profileDir = path.join(profileRoot, 'profile');
  const browser = spawn(chromium, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-background-networking',
    '--remote-debugging-port=0',
    '--remote-allow-origins=*',
    '--user-data-dir=' + profileDir,
    'about:blank'
  ], { stdio: 'ignore' });
  let cdp;
  try {
    const activePortFile = path.join(profileDir, 'DevToolsActivePort');
    await waitFor(() => fs.existsSync(activePortFile), 'isolated Chromium startup');
    if (browser.exitCode !== null) throw new Error('Chromium exited before the test started');
    const debugPort = fs.readFileSync(activePortFile, 'utf8').split('\n')[0].trim();
    const targets = await httpJson('http://127.0.0.1:' + debugPort + '/json/list');
    const page = targets.find((target) => target.type === 'page');
    if (!page) throw new Error('Could not find the isolated Chromium page target');
    cdp = createCdp(page.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: "try { Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined }); } catch (_) {}"
    });
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:' + sitePort + '/' });

    const evaluate = async (expression, awaitPromise = false) => {
      const result = await cdp.send('Runtime.evaluate', {
        expression,
        awaitPromise,
        returnByValue: true,
        userGesture: true
      });
      if (result.exceptionDetails) {
        throw new Error('Browser fixture error: ' + (result.exceptionDetails.text || 'script exception'));
      }
      return result.result.value;
    };
    await waitFor(async () => evaluate(
      "document.readyState === 'complete' && !!window.__SL_ACCESSIBILITY_TEST__"
    ), label + ' page load');

    await evaluate("document.getElementById('btn-start').click()");
    await waitFor(async () => evaluate(
      "document.getElementById('screen-game').classList.contains('active')"
    ), label + ' game setup');
    await evaluate('window.__SL_ACCESSIBILITY_TEST__.prepareExactWin()');
    await evaluate('window.__SL_ACCESSIBILITY_TEST__.runExactWin()', true);

    let state = await evaluate('window.__SL_ACCESSIBILITY_TEST__.snapshot()');
    assert.equal(state.players[0].pos, 100, label + ': synthetic player must land exactly on square 100');
    assert.equal(state.gameOver, true, label + ': exact-100 must follow the win branch');
    assert.equal(state.modalHidden, false, label + ': winner dialog must open');
    assert.equal(state.dialogRole, 'dialog', label + ': winner overlay must have dialog role');
    assert.equal(state.ariaModal, 'true', label + ': winner dialog must be modal');
    assert.equal(state.labelledBy, 'win-title', label + ': winner dialog must be named by its heading');
    assert.equal(state.title, 'Synthetic Winner wins!', label + ': winner heading must expose the synthetic winner');
    assert.equal(state.titleTabIndex, -1, label + ': winner heading must be programmatically focusable');
    assert.equal(state.titleLive, 'polite', label + ': winner heading must be a live announcement');
    assert.equal(state.titleAtomic, 'true', label + ': live winner heading must be announced atomically');
    assert.equal(state.activeElementId, 'win-title', label + ': focus must enter at the winner heading');
    assert.equal(state.status, '', label + ': stale Rolled n status must be cleared');

    await pressTab(cdp);
    state = await evaluate('window.__SL_ACCESSIBILITY_TEST__.snapshot()');
    assert.equal(state.activeElementId, 'btn-multiplier', label + ': first Tab should advance within the win dialog');

    await pressTab(cdp);
    state = await evaluate('window.__SL_ACCESSIBILITY_TEST__.snapshot()');
    assert.equal(state.activeElementId, 'btn-again', label + ': keyboard must reach Play Again');
    assert.equal(state.players[0].pos, 100, label + ': Tab navigation must not activate Play Again');
    assert.equal(state.modalHidden, false, label + ': Tab navigation must leave the win dialog open');

    await pressTab(cdp);
    state = await evaluate('window.__SL_ACCESSIBILITY_TEST__.snapshot()');
    assert.equal(state.activeElementId, 'btn-setup', label + ': keyboard must reach Change Setup');
    await pressTab(cdp);
    state = await evaluate('window.__SL_ACCESSIBILITY_TEST__.snapshot()');
    assert.equal(state.activeElementId, 'btn-multiplier', label + ': forward Tab from the last control must wrap to 2× coins');

    await pressTab(cdp, true);
    state = await evaluate('window.__SL_ACCESSIBILITY_TEST__.snapshot()');
    assert.equal(state.activeElementId, 'btn-setup', label + ': reverse Tab from the first control must wrap to Change Setup');
    await pressTab(cdp, true);
    state = await evaluate('window.__SL_ACCESSIBILITY_TEST__.snapshot()');
    assert.equal(state.activeElementId, 'btn-again', label + ': reverse traversal must reach Play Again');
    await pressTab(cdp, true);
    state = await evaluate('window.__SL_ACCESSIBILITY_TEST__.snapshot()');
    assert.equal(state.activeElementId, 'btn-multiplier', label + ': reverse traversal must reach 2× coins');
    await pressTab(cdp, true);
    state = await evaluate('window.__SL_ACCESSIBILITY_TEST__.snapshot()');
    assert.equal(state.activeElementId, 'btn-setup', label + ': reverse Tab from the first control must wrap to Change Setup');

    await evaluate("document.getElementById('btn-menu').focus()");
    await pressTab(cdp);
    state = await evaluate('window.__SL_ACCESSIBILITY_TEST__.snapshot()');
    assert.equal(state.activeElementId, 'btn-multiplier', label + ': Tab from outside the open dialog must return focus inside');
    assert.equal(state.players[0].pos, 100, label + ': tab traversal must not activate a game action');
    assert.equal(state.modalHidden, false, label + ': traversal must leave the winner dialog open');

    // Invoke the real Play Again handler only against this disposable page/profile.
    // Navigation must not activate any action; only this synthetic click starts a fresh match.
    await evaluate("document.getElementById('btn-again').click()");
    await waitFor(async () => evaluate(
      "document.getElementById('modal-win').hidden && !window.__SL_ACCESSIBILITY_TEST__.snapshot().gameOver && window.__SL_ACCESSIBILITY_TEST__.snapshot().players.every(function (player) { return player.pos === 0; })"
    ), label + ' isolated Play Again reset');
    state = await evaluate('window.__SL_ACCESSIBILITY_TEST__.snapshot()');
    assert.equal(state.players.length, 2, label + ': Play Again must preserve fixture player count');
    assert.deepEqual(state.players.map((player) => player.name), ['Synthetic Winner', 'Synthetic Opponent'], label + ': Play Again must preserve fixture player identities');
    assert.equal(state.current, 0, label + ': Play Again must restart with the first fixture player');
    assert.equal(state.rolling, false, label + ': Play Again must leave the test match ready');
    assert.equal(state.activeElementId, 'btn-roll', label + ': Play Again must focus the fresh match roll control');
    assert.equal(await evaluate("!document.getElementById('btn-roll').disabled"), true, label + ': fresh human match roll control must be enabled');

    console.log('PASS ' + label + ': exact-100 win, full forward/reverse dialog cycle, no accidental activation, isolated Play Again reset and roll focus');
  } finally {
    if (cdp) cdp.close();
    if (browser.exitCode === null) {
      browser.kill('SIGTERM');
      await Promise.race([once(browser, 'exit').catch(() => {}), new Promise((resolve) => setTimeout(resolve, 1500))]);
      if (browser.exitCode === null) browser.kill('SIGKILL');
    }
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(profileRoot, { recursive: true, force: true });
  }
}

(async () => {
  await runSuite(repoRoot, 'source');
  await runSuite(path.join(repoRoot, 'docs'), 'Pages docs');
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
