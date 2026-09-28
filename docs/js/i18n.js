/**
 * EN labels with structure ready for Urdu later.
 */
(function (global) {
  'use strict';

  const STRINGS = {
    en: {
      title: 'Snakes & Ladders',
      tagline: 'Premium Offline · Pass & play · v2',
      players: 'Players',
      add_player: '+ Player',
      add_bot: '+ Bot',
      players_hint: '2–4 players. Bots move automatically.',
      options: 'Options',
      sound: 'Sound',
      language: 'Language',
      board_theme: 'Board theme',
      wager: 'Wager (coins)',
      dice_skin: 'Dice skin',
      unlock_skin: 'Unlock dice skin (rewarded ad)',
      start: 'Start Game',
      roll: 'Roll Dice',
      play_again: 'Play Again',
      change_setup: 'Change Setup',
      leave_title: 'Leave game?',
      leave_body: 'Progress will be lost.',
      stay: 'Stay',
      leave: 'Leave',
      your_turn: 'Your turn',
      bot_thinking: 'Bot is thinking…',
      rolled: 'Rolled {n}',
      climbed: 'Climbed a ladder to {n}!',
      slid: 'Slid down a snake to {n}!',
      need_exact: 'Need exact roll to finish',
      winner: '{name} wins!',
      player_default: 'Player {n}',
      bot_default: 'Bot {n}'
    },
    ur: {
      title: 'سانپ اور سیڑھیاں',
      tagline: 'پریمیئم آف لائن',
      players: 'کھلاڑی',
      start: 'گیم شروع',
      roll: 'پانسا پھینکیں'
    }
  };

  let lang = 'en';

  function t(key, vars) {
    const pack = STRINGS[lang] || STRINGS.en;
    let s = pack[key] || STRINGS.en[key] || key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        s = s.replace('{' + k + '}', vars[k]);
      });
    }
    return s;
  }

  function setLang(code) {
    lang = STRINGS[code] ? code : 'en';
    try { localStorage.setItem('sl_lang', lang); } catch (_) {}
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    return lang;
  }

  function loadLang() {
    try {
      const v = localStorage.getItem('sl_lang');
      if (v && STRINGS[v]) lang = v;
    } catch (_) {}
    return lang;
  }

  global.I18n = { t, setLang, loadLang, STRINGS };
})(window);
