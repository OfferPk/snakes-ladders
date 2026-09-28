# Snakes & Ladders — Premium Offline v2 (Phase A)

Classic 1–100 Snakes & Ladders for **2–4 local players** (pass-and-play) with optional bots.  
Vanilla HTML/CSS/JS + Capacitor. **No WebSockets, no backend, no cloud sync, no online multiplayer.**

**Win rule:** exact landing on square **100**. Rolls that would go past 100 are ignored.


## Play & download (test links)

| Platform | Link / how |
|----------|------------|
| **Browser (PC / Android Chrome)** | https://offerpk.github.io/snakes-ladders/ |
| **Windows** | Download zip → extract → double-click `PLAY-WINDOWS.bat` or open `index.html`: [snakes-ladders-web-windows.zip](https://github.com/OfferPk/snakes-ladders/releases/latest/download/snakes-ladders-web-windows.zip) |
| **Android phone** | Same browser link above in Chrome (Add to Home Screen for app-like PWA). **APK not published yet** (needs JDK/Android SDK to build signed APK). |

Repo: https://github.com/OfferPk/snakes-ladders

## Phase A features

| # | Feature | How it works |
|---|---------|--------------|
| 1 | **Board themes** | Classic (free), Deep Sea, Tactical Zone — unlock in Shop with coins; apply via setup dropdown |
| 2 | **Local profile** | Name + emblems (swords, skull, tactical, neon, …) + avatar borders — CSS/SVG look |
| 3 | **Juicy FX** | CSS 3D-ish dice tumble, screen shake on snake bite, particle burst on ladder |
| 4 | **Power-up tiles** | Shield / Double Dice / Teleport Swap on board; also buyable stash in Shop — single-use inventory |
| 5 | **Moving hazards** | Snake heads drift ±1 row every N turns; optional extra 💥 tiles (setup toggle) knock back 3 |
| 6 | **Branching board** | Tactical theme fork @22; or enable “Branch board” for classic forks @40 & @70 (safe vs risk) |
| 7 | **Coin economy** | Start with coins; earn on match end; optional wager pot (winner takes) |
| 8 | **Progression shop** | Themes, dice skins, borders, consumable power-ups — all `localStorage` |
| 9 | **Rewarded ads** | Second-chance after snake; post-match 2× coins — `window.Ads.showRewarded` (stub UI grants) |

## Quick start

```bash
cd /workspace/games/snakes-and-ladders
npm start                 # http://localhost:4173
# or: npm run start:py
```

`file://` works for play; PWA/service worker needs `http://`.

### How to test each feature

1. **Themes** — Shop → buy Deep Sea / Tactical → Setup → Board theme → Start  
2. **Profile** — Profile → name + emblem (⚔️💀🎯✦) → Save; P1 token shows emblem  
3. **FX** — Climb a ladder (particles + flash); hit a snake (screen shake)  
4. **Power-ups** — Land on marked tiles or buy in Shop; tap inventory chip on your turn  
5. **Moving hazards** — Play several turns; pulsing snake heads / dashed paths move; with “Moving hazards” on, 💥 tiles appear and shift  
6. **Branching** — Theme **Tactical** (fork 22) **or** check Branch board (forks 40/70) → choose Safe vs Risk  
7. **Coins / wager** — Set wager → finish match → coin pill updates; winner gets pot  
8. **Shop** — Spend coins; Equip; reload page — unlocks persist  
9. **Second chance** — Human hits snake → Second chance → stub **Grant reward** → stay put  
10. **2× coins** — Win modal → 2× rewarded stub  
11. **Exact-100** — Near 100, overshoot leaves piece in place  
12. **PWA** — DevTools → Application → SW cache `sl-v2-phaseA-*`

## Layout

```
index.html
css/styles.css          # theme skins + FX
js/profile.js           # profile, coins, unlocks, shop catalog
js/economy.js           # wager helpers + extra shop power-ups
js/themes.js            # body data-theme helpers
js/powerups.js          # persistent power-up stash
js/hazards.js           # optional 💥 moving hazard tiles
js/fx.js                # shake / particles / dice tumble
js/board.js             # themes, snakes/ladders, forks, drifting snakes
js/game.js              # Phase A controller
js/ads.js               # banner / interstitial / rewarded stubs
js/ai.js  js/audio.js  js/i18n.js
manifest.webmanifest  sw.js
scripts/build-web.js → www/
android/                # Capacitor
```

## Capacitor / Android

```bash
npm install && npm run build:web && npm run cap:sync
# APK needs JDK 17+ & Android SDK:
npm run android:build
```

## Ads

Core play is offline. Optional:

```html
<script>
  window.ADMOB_CONFIG = {
    enabled: true,
    bannerId: 'ca-app-pub-xxx/yyy',
    interstitialId: 'ca-app-pub-xxx/yyy',
    rewardedId: 'ca-app-pub-xxx/yyy'
  };
</script>
```

`Ads.showRewarded('second_chance' | 'coin_multiplier' | skinId)` — without IDs, stub modal still appears and grants on confirm.

## License

CEO BOT Games / Mia Smith — MIT
