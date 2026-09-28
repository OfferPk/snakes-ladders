/**
 * AdMob-ready stubs. Core play never requires ads or network.
 * window.Ads.showRewarded(reason) — stub resolves with UI confirm.
 */
(function (global) {
  'use strict';

  const CONFIG = global.ADMOB_CONFIG || {
    enabled: false,
    bannerId: null,
    interstitialId: null,
    rewardedId: null
  };

  const REASON_LABELS = {
    dice_skin: 'Unlock dice skin',
    second_chance: 'Second-chance re-roll (undo snake bite)',
    coin_multiplier: '2× post-match coins',
    neon: 'Unlock neon dice',
    gold: 'Unlock gold dice'
  };

  function showBanner() {
    if (!CONFIG.enabled || !CONFIG.bannerId) {
      const el = document.getElementById('ad-banner');
      if (el) el.hidden = true;
      return Promise.resolve({ shown: false, reason: 'stub' });
    }
    return Promise.resolve({ shown: false, reason: 'no-plugin' });
  }

  function hideBanner() {
    const el = document.getElementById('ad-banner');
    if (el) el.hidden = true;
    return Promise.resolve();
  }

  function showInterstitial() {
    if (!CONFIG.enabled || !CONFIG.interstitialId) {
      return Promise.resolve({ shown: false, reason: 'stub' });
    }
    return Promise.resolve({ shown: false, reason: 'no-plugin' });
  }

  /**
   * @param {string} reason - skin id or 'second_chance' | 'coin_multiplier' | 'dice_skin'
   * @returns {Promise<{rewarded:boolean, stub?:boolean, reason?:string}>}
   */
  function showRewarded(reason) {
    return new Promise((resolve) => {
      const label = REASON_LABELS[reason] || ('Reward: ' + reason);

      if (!CONFIG.enabled || !CONFIG.rewardedId) {
        // Modal-style stub via custom event UI if present, else confirm
        const host = document.getElementById('modal-ad-stub');
        if (host) {
          const title = host.querySelector('.ad-stub-title');
          const body = host.querySelector('.ad-stub-body');
          if (title) title.textContent = 'Rewarded Ad (stub)';
          if (body) body.textContent = label + '\n\nNo AdMob ID configured. Grant reward for this session?';
          host.hidden = false;
          const onYes = () => {
            cleanup();
            // legacy skin unlock path
            if (reason === 'neon' || reason === 'gold' || reason === 'obsidian' || reason === 'coral') {
              if (global.Profile) global.Profile.unlock('dice', reason);
            }
            resolve({ rewarded: true, stub: true, reason: reason });
          };
          const onNo = () => {
            cleanup();
            resolve({ rewarded: false, stub: true, reason: reason });
          };
          function cleanup() {
            host.hidden = true;
            host.querySelector('[data-ad-yes]')?.removeEventListener('click', onYes);
            host.querySelector('[data-ad-no]')?.removeEventListener('click', onNo);
          }
          host.querySelector('[data-ad-yes]')?.addEventListener('click', onYes);
          host.querySelector('[data-ad-no]')?.addEventListener('click', onNo);
          return;
        }
        const ok = confirm('Rewarded ad stub (no AdMob ID).\n\n' + label + '\n\nGrant reward?');
        if (ok && (reason === 'neon' || reason === 'gold')) {
          if (global.Profile) global.Profile.unlock('dice', reason);
        }
        resolve({ rewarded: !!ok, stub: true, reason: reason });
        return;
      }
      resolve({ rewarded: false, reason: 'no-plugin' });
    });
  }

  /** @deprecated prefer global.Profile.isUnlocked('dice', id) */
  function isSkinUnlocked(id) {
    if (global.Profile) return global.Profile.isUnlocked('dice', id);
    return id === 'classic';
  }

  function listUnlocked() {
    if (global.Profile) return global.Profile.getUnlocks().dice;
    return ['classic'];
  }

  global.Ads = {
    CONFIG,
    showBanner,
    hideBanner,
    showInterstitial,
    showRewarded,
    isSkinUnlocked,
    listUnlocked
  };
})(window);
