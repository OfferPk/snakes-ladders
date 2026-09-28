/**
 * Simple offline bot: roll when prompted, no strategy.
 */
(function (global) {
  'use strict';

  function isBot(player) {
    return !!(player && player.isBot);
  }

  /** Delay before bot rolls (ms). */
  function thinkDelay() {
    return 700 + Math.floor(Math.random() * 500);
  }

  /**
   * Schedule bot roll. Returns timeout id.
   * @param {Function} rollFn - call to perform the roll
   */
  function scheduleRoll(rollFn) {
    return setTimeout(rollFn, thinkDelay());
  }

  global.AI = {
    isBot,
    thinkDelay,
    scheduleRoll
  };
})(window);
