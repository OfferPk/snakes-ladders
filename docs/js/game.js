/**
 * Snakes & Ladders PREMIUM OFFLINE v2 — Phase A controller.
 * Offline only: local play, coins, shop, power-ups, themes, FX.
 */
(function () {
  'use strict';

  const MAX_PLAYERS = 4;
  const MIN_PLAYERS = 2;
  const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  /** @type {{name:string,color:string,isBot:boolean,pos:number,inventory:string[],shield:boolean}[]} */
  let players = [];
  let current = 0;
  let rolling = false;
  let gameOver = false;
  let botTimer = null;
  let diceSkin = 'classic';
  let themeId = 'classic';
  let wagerStake = 0; // per human player
  let wagerPot = 0;
  let doubleDicePending = false;
  let pendingSnakeUndo = null; // { playerIndex, fromPos, toPos }
  let secondChanceUsed = false;

  const els = {};
  function $(id) { return document.getElementById(id); }
  function cacheEls() {
    [
      'screen-setup', 'screen-game', 'screen-profile', 'screen-shop',
      'player-slots', 'btn-add-player', 'btn-add-bot', 'btn-start',
      'opt-sound', 'opt-lang', 'opt-theme', 'opt-wager', 'opt-branch', 'opt-hazards',
      'btn-menu', 'btn-sound', 'turn-token', 'turn-name', 'board', 'board-overlays',
      'tokens-layer', 'fx-layer', 'dice', 'dice-face', 'btn-roll', 'status-msg', 'player-hud',
      'inventory-bar', 'coin-hud', 'setup-coins',
      'modal-win', 'win-title', 'win-sub', 'win-coins', 'btn-again', 'btn-setup', 'btn-multiplier',
      'modal-leave', 'btn-leave-cancel', 'btn-leave-confirm',
      'modal-fork', 'fork-title', 'fork-safe', 'fork-risk',
      'modal-second-chance', 'btn-sc-yes', 'btn-sc-no',
      'modal-ad-stub', 'ad-banner',
      'profile-name', 'emblem-grid', 'btn-save-profile', 'btn-open-profile', 'btn-open-shop',
      'btn-profile-back', 'btn-shop-back', 'shop-list', 'shop-coins',
      'avatar-preview', 'profile-coins-display'
    ].forEach((id) => { els[id] = $(id); });
  }

  function defaultSetup() {
    const p = Profile.getProfile();
    return [
      { name: p.name || I18n.t('player_default', { n: 1 }), color: Board.COLORS[0], isBot: false },
      { name: I18n.t('player_default', { n: 2 }), color: Board.COLORS[1], isBot: false }
    ];
  }

  let setupList = [];

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function refreshCoinsUI() {
    const c = Profile.getCoins();
    document.querySelectorAll('[data-coins]').forEach((el) => { el.textContent = String(c); });
    if (els['setup-coins']) els['setup-coins'].textContent = String(c);
    if (els['shop-coins']) els['shop-coins'].textContent = String(c);
    if (els['profile-coins-display']) els['profile-coins-display'].textContent = String(c);
    if (els['coin-hud']) els['coin-hud'].textContent = '🪙 ' + c;
  }

  function renderSetupSlots() {
    const root = els['player-slots'];
    root.innerHTML = '';
    setupList.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'player-row';
      row.innerHTML =
        '<span class="swatch" style="background:' + p.color + '"></span>' +
        '<input type="text" maxlength="16" aria-label="Player ' + (i + 1) + ' name" value="' + escapeAttr(p.name) + '" data-i="' + i + '" />' +
        (p.isBot ? '<span class="badge">BOT</span>' : '') +
        (setupList.length > MIN_PLAYERS
          ? '<button type="button" class="btn-remove" data-remove="' + i + '" aria-label="Remove">×</button>'
          : '');
      root.appendChild(row);
    });
    root.querySelectorAll('input[type="text"]').forEach((inp) => {
      inp.addEventListener('change', () => {
        const i = +inp.dataset.i;
        setupList[i].name = inp.value.trim() || I18n.t(setupList[i].isBot ? 'bot_default' : 'player_default', { n: i + 1 });
      });
      inp.addEventListener('input', () => {
        setupList[+inp.dataset.i].name = inp.value;
      });
    });
    root.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setupList.splice(+btn.dataset.remove, 1);
        setupList.forEach((p, idx) => { p.color = Board.COLORS[idx]; });
        renderSetupSlots();
        SFX.click();
      });
    });
    els['btn-add-player'].disabled = setupList.length >= MAX_PLAYERS;
    els['btn-add-bot'].disabled = setupList.length >= MAX_PLAYERS || setupList.filter((p) => p.isBot).length >= 3;
  }

  function addPlayer(isBot) {
    if (setupList.length >= MAX_PLAYERS) return;
    if (isBot && setupList.filter((p) => p.isBot).length >= 3) return;
    const n = setupList.length + 1;
    setupList.push({
      name: I18n.t(isBot ? 'bot_default' : 'player_default', { n }),
      color: Board.COLORS[setupList.length],
      isBot: !!isBot
    });
    renderSetupSlots();
    SFX.click();
  }

  function refreshThemeSelect() {
    const sel = els['opt-theme'];
    if (!sel) return;
    sel.innerHTML = '';
    Profile.THEMES.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.id;
      const owned = Profile.isUnlocked('themes', t.id);
      opt.textContent = t.label + (owned ? '' : ' 🔒 ' + t.price + '🪙');
      opt.disabled = !owned;
      sel.appendChild(opt);
    });
    const pref = Profile.getProfile().theme;
    sel.value = Profile.isUnlocked('themes', pref) ? pref : 'classic';
  }

  function showScreen(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    $(name).classList.add('active');
  }

  function setStatus(msg) {
    els['status-msg'].textContent = msg || '';
  }

  function updateTurnUI() {
    const p = players[current];
    els['turn-name'].textContent = p.name + (p.isBot ? ' 🤖' : '');
    els['turn-token'].style.background = p.color;
    els['btn-roll'].disabled = rolling || gameOver || p.isBot;
    document.querySelectorAll('.hud-chip').forEach((c, i) => {
      c.classList.toggle('active', i === current);
    });
    document.querySelectorAll('.token').forEach((t) => {
      t.classList.toggle('active', +t.dataset.i === current);
    });
    renderInventory();
  }

  function renderHud() {
    const hud = els['player-hud'];
    hud.innerHTML = '';
    players.forEach((p, i) => {
      const chip = document.createElement('div');
      chip.className = 'hud-chip' + (i === current ? ' active' : '');
      const shield = p.shield ? '🛡️' : '';
      chip.innerHTML =
        '<span class="dot" style="background:' + p.color + '"></span>' +
        '<span>' + escapeAttr(p.name) + shield + '</span>' +
        '<span class="pos">' + p.pos + '</span>';
      hud.appendChild(chip);
    });
  }

  function renderInventory() {
    const bar = els['inventory-bar'];
    if (!bar) return;
    const p = players[current];
    if (!p || p.isBot) {
      bar.innerHTML = '<span class="inv-hint">Power-ups appear when you pick them up</span>';
      return;
    }
    bar.innerHTML = '';
    const items = p.inventory || [];
    if (!items.length && !p.shield) {
      bar.innerHTML = '<span class="inv-hint">No power-ups yet</span>';
      return;
    }
    if (p.shield) {
      const b = document.createElement('span');
      b.className = 'inv-chip passive';
      b.textContent = '🛡️ Shield armed';
      bar.appendChild(b);
    }
    items.forEach((type, idx) => {
      const meta = Board.POWER_TYPES[type];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inv-chip btn';
      btn.textContent = (meta ? meta.icon + ' ' + meta.label : type);
      btn.disabled = rolling || gameOver;
      btn.addEventListener('click', () => usePowerUp(idx));
      bar.appendChild(btn);
    });
  }

  function placeTokens(animateIndex) {
    const layer = els['tokens-layer'];
    const byPos = {};
    players.forEach((p, i) => {
      const key = p.pos === 0 ? 'start' : String(p.pos);
      if (!byPos[key]) byPos[key] = [];
      byPos[key].push(i);
    });
    const prof = Profile.getProfile();
    players.forEach((p, i) => {
      let tok = layer.querySelector('.token[data-i="' + i + '"]');
      if (!tok) {
        tok = document.createElement('div');
        tok.className = 'token border-' + (i === 0 ? prof.border : 'none');
        tok.dataset.i = String(i);
        tok.style.background = p.color;
        if (i === 0) {
          const em = Profile.emblemMeta(prof.emblem);
          tok.innerHTML = '<span class="tok-em">' + em.svg + '</span>';
        }
        layer.appendChild(tok);
      }
      const key = p.pos === 0 ? 'start' : String(p.pos);
      const group = byPos[key];
      const idxInGroup = group.indexOf(i);
      const off = Board.tokenOffset(idxInGroup, group.length);
      let left, top;
      if (p.pos === 0) {
        const c = Board.gridCenterPercent(1);
        left = c.left - 6;
        top = c.top + 8;
      } else {
        const c = Board.gridCenterPercent(p.pos);
        left = c.left;
        top = c.top;
      }
      tok.style.left = 'calc(' + left + '% + ' + (off.x * 0.15) + '%)';
      tok.style.top = 'calc(' + top + '% + ' + (off.y * 0.15) + '%)';
      tok.classList.toggle('active', i === current);
      if (animateIndex === i) {
        tok.classList.remove('bounce');
        void tok.offsetWidth;
        tok.classList.add('bounce');
      }
    });
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function rollDiceValue() {
    return 1 + Math.floor(Math.random() * 6);
  }

  async function animateDice(value) {
    SFX.roll();
    await FX.tumbleDice(els['dice'], els['dice-face'], value, DICE_FACES, sleep);
  }

  async function stepMove(playerIndex, from, to) {
    const p = players[playerIndex];
    if (to > from && to - from <= 12) {
      for (let s = from + 1; s <= to; s++) {
        p.pos = s;
        placeTokens(playerIndex);
        SFX.move();
        renderHud();
        await sleep(220);
      }
    } else {
      p.pos = to;
      placeTokens(playerIndex);
      renderHud();
      await sleep(400);
    }
  }

  async function usePowerUp(invIndex) {
    if (rolling || gameOver) return;
    const p = players[current];
    if (!p || p.isBot) return;
    const type = p.inventory[invIndex];
    if (!type) return;
    p.inventory.splice(invIndex, 1);
    SFX.click();

    if (type === 'shield') {
      p.shield = true;
      setStatus('Shield armed — blocks next snake!');
      renderHud();
      renderInventory();
      return;
    }
    if (type === 'double') {
      doubleDicePending = true;
      setStatus('Double Dice armed — next roll ×2!');
      renderInventory();
      return;
    }
    if (type === 'swap') {
      // swap with nearest opponent ahead, else any other
      let target = -1;
      let best = 999;
      players.forEach((o, i) => {
        if (i === current) return;
        const d = Math.abs(o.pos - p.pos);
        if (o.pos !== p.pos && d < best) {
          best = d;
          target = i;
        }
      });
      if (target < 0) {
        setStatus('No opponent to swap with');
        p.inventory.push('swap');
        renderInventory();
        return;
      }
      const tmp = p.pos;
      p.pos = players[target].pos;
      players[target].pos = tmp;
      setStatus('Swapped with ' + players[target].name + '!');
      placeTokens(current);
      placeTokens(target);
      renderHud();
      renderInventory();
      FX.burstAtSquare(p.pos, '#118ab2');
      await sleep(400);
    }
  }

  function offerSecondChance(playerIndex, fromPos, snakeTo) {
    return new Promise((resolve) => {
      pendingSnakeUndo = { playerIndex, fromPos, toPos: snakeTo };
      els['modal-second-chance'].hidden = false;
      const yes = () => {
        cleanup();
        resolve(true);
      };
      const no = () => {
        cleanup();
        resolve(false);
      };
      function cleanup() {
        els['modal-second-chance'].hidden = true;
        els['btn-sc-yes'].removeEventListener('click', yes);
        els['btn-sc-no'].removeEventListener('click', no);
      }
      els['btn-sc-yes'].addEventListener('click', yes);
      els['btn-sc-no'].addEventListener('click', no);
    });
  }

  function offerFork(fork) {
    return new Promise((resolve) => {
      els['fork-title'].textContent = fork.label || 'Choose your path';
      els['fork-safe'].textContent = '🛡️ ' + fork.safe.label;
      els['fork-risk'].textContent = '⚡ ' + fork.risk.label;
      els['modal-fork'].hidden = false;
      const onSafe = () => { cleanup(); resolve('safe'); };
      const onRisk = () => { cleanup(); resolve('risk'); };
      function cleanup() {
        els['modal-fork'].hidden = true;
        els['fork-safe'].removeEventListener('click', onSafe);
        els['fork-risk'].removeEventListener('click', onRisk);
      }
      els['fork-safe'].addEventListener('click', onSafe);
      els['fork-risk'].addEventListener('click', onRisk);
    });
  }

  async function doTurn() {
    if (rolling || gameOver) return;
    rolling = true;
    els['btn-roll'].disabled = true;
    const p = players[current];
    setStatus(p.isBot ? I18n.t('bot_thinking') : '');

    // Bots auto-use double if held sometimes
    if (p.isBot && p.inventory && p.inventory.indexOf('double') !== -1 && Math.random() < 0.35) {
      const idx = p.inventory.indexOf('double');
      p.inventory.splice(idx, 1);
      doubleDicePending = true;
    }
    if (p.isBot && !p.shield && p.inventory && p.inventory.indexOf('shield') !== -1 && Math.random() < 0.4) {
      const idx = p.inventory.indexOf('shield');
      p.inventory.splice(idx, 1);
      p.shield = true;
    }

    let value = rollDiceValue();
    await animateDice(value);

    if (doubleDicePending) {
      doubleDicePending = false;
      value = Math.min(12, value * 2);
      setStatus('Double Dice! Moved ' + value);
      await sleep(400);
    } else {
      setStatus(I18n.t('rolled', { n: value }));
    }

    const startPos = p.pos;
    let landTarget = startPos + value;
    if (landTarget > 100) {
      setStatus(I18n.t('need_exact'));
      await sleep(700);
      rolling = false;
      nextTurn(I18n.t('need_exact'));
      return;
    }

    await stepMove(current, startPos, landTarget);

    // Power-up pickup
    const power = Board.pickupPower(p.pos);
    if (power) {
      if (!p.inventory) p.inventory = [];
      if (p.inventory.length < 3) {
        p.inventory.push(power);
        setStatus('Picked up ' + (Board.POWER_TYPES[power] || {}).label + '!');
        SFX.click();
        Board.buildBoard(els['board']);
        Board.drawOverlays(els['board-overlays']);
        placeTokens();
        renderInventory();
        await sleep(500);
      }
    }

    // Fork choice (humans); bots pick risk 40%
    const fork = Board.getFork(p.pos);
    if (fork) {
      let choice;
      if (p.isBot) {
        choice = Math.random() < 0.4 ? 'risk' : 'safe';
        setStatus('Bot chose ' + choice + ' path');
        await sleep(500);
      } else {
        choice = await offerFork(fork);
      }
      const dest = choice === 'risk' ? fork.risk.to : fork.safe.to;
      await stepMove(current, p.pos, dest);
      FX.burstAtSquare(dest, choice === 'risk' ? '#f4a261' : '#90be6d');
    }

    let handoffStatus = null;
    const tele = Board.applyTeleport(p.pos);
    if (tele.type === 'ladder') {
      SFX.ladder();
      FX.flashStatus('ladder');
      FX.burstAtSquare(p.pos, '#06d6a0');
      handoffStatus = I18n.t('climbed', { n: tele.pos });
      setStatus(handoffStatus);
      await sleep(350);
      p.pos = tele.pos;
      placeTokens(current);
      renderHud();
      FX.burstAtSquare(tele.pos, '#ffd166');
      await sleep(500);
    } else if (tele.type === 'snake') {
      const biteFrom = p.pos;
      if (p.shield) {
        p.shield = false;
        setStatus('Shield blocked the snake!');
        SFX.click();
        FX.burstAtSquare(biteFrom, '#118ab2');
        renderHud();
        await sleep(600);
      } else {
        SFX.snake();
        FX.flashStatus('snake');
        FX.shake(document.getElementById('app'), 480);
        setStatus(I18n.t('slid', { n: tele.pos }));
        await sleep(300);

        // Second-chance rewarded ad (once per match, human only)
        let undone = false;
        if (!p.isBot && !secondChanceUsed) {
          const want = await offerSecondChance(current, biteFrom, tele.pos);
          if (want) {
            const res = await Ads.showRewarded('second_chance');
            if (res.rewarded) {
              secondChanceUsed = true;
              // stay on biteFrom — undo snake
              undone = true;
              setStatus('Second chance! Stayed on ' + biteFrom);
              FX.burstAtSquare(biteFrom, '#ffd166');
            }
          }
        }
        if (!undone) {
          p.pos = tele.pos;
          placeTokens(current);
          renderHud();
          await sleep(500);
        } else {
          placeTokens(current);
          renderHud();
          await sleep(400);
        }
      }
    }


    // Extra moving hazards (💥): go back Hazards.HAZARD_BACK squares
    if (typeof Hazards !== 'undefined' && Hazards.isEnabled()) {
      const hit = Hazards.checkLanding(p.pos);
      if (hit.hit) {
        setStatus('Hazard! Back ' + hit.amount + ' → ' + hit.backTo);
        if (typeof FX !== 'undefined') {
          FX.shake(document.querySelector('.board-wrap'), 500);
          FX.burstAtSquare(p.pos, '#ef476f');
        }
        await sleep(350);
        p.pos = hit.backTo;
        placeTokens(current);
        renderHud();
        await sleep(400);
      }
    }

    if (p.pos === 100) {
      gameOver = true;
      rolling = false;
      SFX.win();
      if (typeof FX !== "undefined" && FX.winBurst) FX.winBurst();
      showWin(p);
      return;
    }

    rolling = false;
    nextTurn(handoffStatus);
  }

  function nextTurn(statusAfterTurn) {
    // hazard tick each turn
    const haz = Board.tickHazards();
    let extraShift = false;
    if (typeof Hazards !== 'undefined' && Hazards.isEnabled()) {
      extraShift = Hazards.onTurnEnd();
    }
    if (haz.moved || extraShift) {
      Board.buildBoard(els['board']);
      Board.drawOverlays(els['board-overlays']);
      if (typeof Hazards !== 'undefined') Hazards.paint(els['board']);
      placeTokens();
      setStatus('Hazards shifted!');
    }
    current = (current + 1) % players.length;
    updateTurnUI();
    renderHud();
    if (statusAfterTurn) setStatus(statusAfterTurn);
    else if (!haz.moved) setStatus('');
    maybeBotTurn();
  }

  function maybeBotTurn() {
    if (gameOver) return;
    clearTimeout(botTimer);
    const p = players[current];
    if (AI.isBot(p)) {
      els['btn-roll'].disabled = true;
      setStatus(I18n.t('bot_thinking'));
      botTimer = AI.scheduleRoll(() => { doTurn(); });
    } else {
      els['btn-roll'].disabled = false;
      renderInventory();
    }
  }

  let lastWinAward = null;

  function showWin(p) {
    const hero = players[0];
    const heroWon = hero === p;
    lastWinAward = Profile.awardMatchCoins(heroWon, players.length, heroWon ? wagerPot : 0);
    els['win-title'].textContent = I18n.t('winner', { name: p.name });
    let sub = 'Reached 100 · Exact landing';
    if (wagerPot > 0) sub += heroWon ? (' · Won pot ' + wagerPot + '🪙') : (' · Pot lost (' + wagerPot + '🪙)');
    els['win-sub'].textContent = sub;
    els['win-coins'].textContent = (heroWon ? '🏆 ' : '') + '+' + lastWinAward.total + ' coins · balance ' + lastWinAward.coins + '🪙';
    els['btn-multiplier'].hidden = false;
    els['btn-multiplier'].disabled = false;
    els['btn-multiplier'].textContent = '📺 2× coins (rewarded ad)';
    els['modal-win'].hidden = false;
    refreshCoinsUI();
  }

  function applyThemeClass() {
    document.body.dataset.theme = themeId;
    const wrap = document.querySelector('.board-wrap');
    if (wrap) wrap.dataset.theme = themeId;
  }

  function startGame() {
    els['player-slots'].querySelectorAll('input[type="text"]').forEach((inp) => {
      const i = +inp.dataset.i;
      if (setupList[i]) setupList[i].name = inp.value.trim() || setupList[i].name;
    });
    if (setupList.length < MIN_PLAYERS) return;

    themeId = els['opt-theme'].value || 'classic';
    if (!Profile.isUnlocked('themes', themeId)) themeId = 'classic';
    Board.setTheme(themeId === 'deep-sea' ? 'deepsea' : themeId);
    Profile.setTheme(themeId);
    applyThemeClass();
    const branchOn = !!(els['opt-branch'] && els['opt-branch'].checked);
    if (typeof Board.setBranchMode === 'function') Board.setBranchMode(branchOn);
    const hazardsOn = !!(els['opt-hazards'] && els['opt-hazards'].checked);
    if (typeof Hazards !== 'undefined') Hazards.reset(hazardsOn);

    diceSkin = Profile.getProfile().diceSkin || 'classic';
    if (!Profile.isUnlocked('dice', diceSkin)) diceSkin = 'classic';
    els['dice'].className = 'dice skin-' + diceSkin;

    // Wager
    wagerStake = Math.max(0, parseInt(els['opt-wager'].value, 10) || 0);
    const humans = setupList.filter((p) => !p.isBot).length;
    wagerPot = 0;
    if (wagerStake > 0) {
      const cost = wagerStake; // profile pays once representing local human stake; bots don't pay
      if (Profile.getCoins() < cost) {
        alert('Not enough coins for wager (need ' + cost + ')');
        return;
      }
      Profile.spendCoins(cost);
      wagerPot = cost * Math.max(1, humans); // pot = stake × human count (others virtual)
      // For pass-and-play: each human conceptually stakes; we only debit local profile once
      // and pot = stake * humans for winner payout
      refreshCoinsUI();
    }

    // Seed human inventories from PowerUps stash (shop / starter pack)
    const stash = (typeof PowerUps !== 'undefined') ? PowerUps.get() : { shield: 0, double: 0, swap: 0 };
    let seedShield = stash.shield || 0;
    let seedDouble = stash.double || 0;
    let seedSwap = stash.swap || 0;
    players = setupList.map((p) => {
      const inv = [];
      if (!p.isBot) {
        if (seedShield > 0) { inv.push('shield'); seedShield--; if (typeof PowerUps !== 'undefined') PowerUps.consume('shield'); }
        if (seedDouble > 0) { inv.push('double'); seedDouble--; if (typeof PowerUps !== 'undefined') PowerUps.consume('double'); }
        if (seedSwap > 0) { inv.push('swap'); seedSwap--; if (typeof PowerUps !== 'undefined') PowerUps.consume('swap'); }
      }
      return {
        name: p.name,
        color: p.color,
        isBot: p.isBot,
        pos: 0,
        inventory: inv,
        shield: false
      };
    });
    if (typeof PowerUps !== 'undefined') PowerUps.resetMatch();
    current = 0;
    rolling = false;
    gameOver = false;
    doubleDicePending = false;
    secondChanceUsed = false;
    pendingSnakeUndo = null;
    clearTimeout(botTimer);

    Board.buildBoard(els['board']);
    Board.drawOverlays(els['board-overlays']);
    if (typeof Hazards !== 'undefined') Hazards.paint(els['board']);
    els['tokens-layer'].innerHTML = '';
    if (els['fx-layer']) els['fx-layer'].innerHTML = '';
    els['dice-face'].textContent = '?';
    els['modal-win'].hidden = true;
    els['modal-leave'].hidden = true;
    if (els['modal-fork']) els['modal-fork'].hidden = true;
    if (els['modal-second-chance']) els['modal-second-chance'].hidden = true;

    placeTokens();
    renderHud();
    updateTurnUI();
    setStatus(wagerPot ? ('Wager pot: ' + wagerPot + '🪙') : '');
    showScreen('screen-game');
    Ads.hideBanner();
    SFX.click();
    maybeBotTurn();
  }

  function backToSetup() {
    clearTimeout(botTimer);
    els['modal-win'].hidden = true;
    els['modal-leave'].hidden = true;
    showScreen('screen-setup');
    refreshThemeSelect();
    refreshCoinsUI();
    Ads.showBanner();
  }

  /* —— Profile & Shop UI —— */
  function renderEmblems() {
    const grid = els['emblem-grid'];
    if (!grid) return;
    const cur = Profile.getProfile().emblem;
    grid.innerHTML = '';
    Profile.EMBLEMS.forEach((e) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'emblem-btn' + (e.id === cur ? ' selected' : '');
      b.innerHTML = '<span class="em-svg">' + e.svg + '</span><span class="em-label">' + e.label + '</span>';
      b.addEventListener('click', () => {
        Profile.setEmblem(e.id);
        renderEmblems();
        updateAvatarPreview();
        SFX.click();
      });
      grid.appendChild(b);
    });
  }

  function updateAvatarPreview() {
    const p = Profile.getProfile();
    const em = Profile.emblemMeta(p.emblem);
    if (els['avatar-preview']) {
      els['avatar-preview'].className = 'avatar-preview border-' + p.border;
      els['avatar-preview'].innerHTML = '<span>' + em.svg + '</span>';
    }
  }

  function openProfile() {
    const p = Profile.getProfile();
    els['profile-name'].value = p.name;
    renderEmblems();
    updateAvatarPreview();
    refreshCoinsUI();
    showScreen('screen-profile');
    SFX.click();
  }

  function saveProfile() {
    Profile.setName(els['profile-name'].value);
    if (setupList[0] && !setupList[0].isBot) {
      setupList[0].name = Profile.getProfile().name;
      renderSetupSlots();
    }
    updateAvatarPreview();
    refreshCoinsUI();
    showScreen('screen-setup');
    SFX.click();
  }

  function renderShop() {
    const list = els['shop-list'];
    list.innerHTML = '';
    function section(title, cat, catalog, equipFn) {
      const h = document.createElement('h3');
      h.textContent = title;
      list.appendChild(h);
      catalog.forEach((item) => {
        const owned = Profile.isUnlocked(cat, item.id);
        const row = document.createElement('div');
        row.className = 'shop-row' + (owned ? ' owned' : '');
        const prof = Profile.getProfile();
        const equipped =
          (cat === 'dice' && prof.diceSkin === item.id) ||
          (cat === 'themes' && prof.theme === item.id) ||
          (cat === 'borders' && prof.border === item.id);
        row.innerHTML =
          '<div class="shop-info"><strong>' + item.label + '</strong>' +
          (item.desc ? '<span class="shop-desc">' + item.desc + '</span>' : '') +
          '</div>';
        const actions = document.createElement('div');
        actions.className = 'shop-actions';
        if (owned) {
          const eq = document.createElement('button');
          eq.type = 'button';
          eq.className = 'btn secondary';
          eq.textContent = equipped ? 'Equipped' : 'Equip';
          eq.disabled = equipped;
          eq.addEventListener('click', () => {
            equipFn(item.id);
            renderShop();
            refreshThemeSelect();
            updateAvatarPreview();
            refreshCoinsUI();
            SFX.click();
          });
          actions.appendChild(eq);
        } else {
          const buy = document.createElement('button');
          buy.type = 'button';
          buy.className = 'btn primary';
          buy.textContent = (item.price || 0) + '🪙';
          buy.addEventListener('click', () => {
            const res = Profile.buyItem(cat, item.id);
            if (!res.ok) {
              if (res.reason === 'broke') alert('Not enough coins');
              return;
            }
            SFX.win();
            renderShop();
            refreshThemeSelect();
            refreshCoinsUI();
          });
          actions.appendChild(buy);
        }
        row.appendChild(actions);
        list.appendChild(row);
      });
    }
    section('Board Themes', 'themes', Profile.THEMES, (id) => Profile.setTheme(id));
    section('Dice Skins', 'dice', Profile.DICE_SKINS, (id) => Profile.setDiceSkin(id));
    section('Avatar Borders', 'borders', Profile.BORDERS, (id) => Profile.setBorder(id));
    // Consumable power-ups via Economy shop (local coins)
    if (typeof Economy !== 'undefined') {
      const h = document.createElement('h3');
      h.textContent = 'Power-ups';
      list.appendChild(h);
      Economy.shopList().filter((s) => s.type === 'powerup').forEach((item) => {
        const row = document.createElement('div');
        row.className = 'shop-row';
        row.innerHTML = '<div class="shop-info"><strong>' + item.label + '</strong></div>';
        const actions = document.createElement('div');
        actions.className = 'shop-actions';
        const buy = document.createElement('button');
        buy.type = 'button';
        buy.className = 'btn primary';
        buy.textContent = item.price + '🪙';
        buy.addEventListener('click', () => {
          // spend via Economy; grant into next human inventory starter via PowerUps
          const res = Economy.buy(item.id);
          if (!res.ok) {
            if (res.reason === 'broke') alert('Not enough coins');
            return;
          }
          // Also mirror coins with Profile so HUD stays in sync
          // Economy has its own coin key — sync Profile down if needed
          SFX.win();
          refreshCoinsUI();
          alert('Bought ' + item.label + ' (added to power-up stash — pick up on board or use from inventory next match via starter pack)');
          renderShop();
        });
        actions.appendChild(buy);
        row.appendChild(actions);
        list.appendChild(row);
      });
    }
    refreshCoinsUI();
  }

  function openShop() {
    renderShop();
    showScreen('screen-shop');
    SFX.click();
  }

  function bind() {
    els['btn-add-player'].addEventListener('click', () => addPlayer(false));
    els['btn-add-bot'].addEventListener('click', () => addPlayer(true));
    els['btn-start'].addEventListener('click', startGame);
    els['btn-roll'].addEventListener('click', () => doTurn());

    els['opt-sound'].addEventListener('change', () => {
      SFX.setEnabled(els['opt-sound'].checked);
      updateSoundBtn();
    });
    els['btn-sound'].addEventListener('click', () => {
      SFX.setEnabled(!SFX.isEnabled());
      els['opt-sound'].checked = SFX.isEnabled();
      updateSoundBtn();
      SFX.click();
    });
    els['opt-lang'].addEventListener('change', () => I18n.setLang(els['opt-lang'].value));

    els['btn-open-profile'].addEventListener('click', openProfile);
    els['btn-open-shop'].addEventListener('click', openShop);
    els['btn-profile-back'].addEventListener('click', () => { showScreen('screen-setup'); });
    els['btn-shop-back'].addEventListener('click', () => { showScreen('screen-setup'); refreshThemeSelect(); });
    els['btn-save-profile'].addEventListener('click', saveProfile);

    els['btn-menu'].addEventListener('click', () => { els['modal-leave'].hidden = false; });
    els['btn-leave-cancel'].addEventListener('click', () => { els['modal-leave'].hidden = true; });
    els['btn-leave-confirm'].addEventListener('click', backToSetup);

    els['btn-again'].addEventListener('click', async () => {
      els['modal-win'].hidden = true;
      await Ads.showInterstitial();
      // re-stake if wager
      if (wagerStake > 0) {
        if (Profile.getCoins() < wagerStake) {
          alert('Not enough coins to re-wager; starting without wager');
          wagerPot = 0;
          wagerStake = 0;
        } else {
          Profile.spendCoins(wagerStake);
          const humans = players.filter((p) => !p.isBot).length;
          wagerPot = wagerStake * Math.max(1, humans);
          refreshCoinsUI();
        }
      }
      Board.setTheme(themeId);
      if (typeof Hazards !== 'undefined') {
        Hazards.reset(!!(els['opt-hazards'] && els['opt-hazards'].checked));
      }
      players.forEach((p) => { p.pos = 0; p.inventory = []; p.shield = false; });
      current = 0;
      rolling = false;
      gameOver = false;
      doubleDicePending = false;
      secondChanceUsed = false;
      els['tokens-layer'].innerHTML = '';
      els['dice-face'].textContent = '?';
      Board.buildBoard(els['board']);
      Board.drawOverlays(els['board-overlays']);
      if (typeof Hazards !== 'undefined') Hazards.paint(els['board']);
      placeTokens();
      renderHud();
      updateTurnUI();
      setStatus(wagerPot ? ('Wager pot: ' + wagerPot + '🪙') : '');
      maybeBotTurn();
    });

    els['btn-setup'].addEventListener('click', async () => {
      await Ads.showInterstitial();
      backToSetup();
    });

    els['btn-multiplier'].addEventListener('click', async () => {
      if (!lastWinAward) return;
      els['btn-multiplier'].disabled = true;
      const res = await Ads.showRewarded('coin_multiplier');
      if (res.rewarded) {
        const bonus = lastWinAward.total;
        Profile.addCoins(bonus);
        lastWinAward.total *= 2;
        lastWinAward.coins = Profile.getCoins();
        els['win-coins'].textContent = '2× applied! +' + lastWinAward.total + ' total · balance ' + lastWinAward.coins + '🪙';
        refreshCoinsUI();
        SFX.win();
      } else {
        els['btn-multiplier'].disabled = false;
      }
    });
  }

  function updateSoundBtn() {
    els['btn-sound'].textContent = SFX.isEnabled() ? '🔊' : '🔇';
  }

  function init() {
    cacheEls();
    setupList = defaultSetup();
    I18n.setLang(I18n.loadLang());
    const soundOn = SFX.loadPref();
    els['opt-sound'].checked = soundOn;
    updateSoundBtn();
    refreshThemeSelect();
    refreshCoinsUI();
    renderSetupSlots();
    updateAvatarPreview();
    bind();
    Ads.showBanner();
    document.body.dataset.theme = Profile.getProfile().theme || 'classic';

    document.addEventListener('backbutton', (e) => {
      if (!els['screen-game'].classList.contains('active')) return;
      e.preventDefault();
      els['modal-leave'].hidden = false;
    }, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
