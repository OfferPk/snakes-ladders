# STATUS — Snakes & Ladders Premium Offline v2 (Phase A)

**Path:** `/workspace/games/snakes-and-ladders`  
**Owner:** Mia Smith  
**Updated:** 2026-09-28 ~02:40 Asia/Karachi (PKT)  
**Version:** 2.0.0-phaseA

## Phase A shipped ✅

- [x] Unlockable boards: Classic (free), Deep Sea, Tactical — Shop + setup selector (`localStorage`)
- [x] Local profile: name, emblems (swords/skull/tactical/neon/…), CSS avatar borders
- [x] Juicy FX: dice tumble, snake screen-shake, ladder particle burst (`js/fx.js`)
- [x] Power-up tiles + shop stash: shield, double-dice, teleport swap — single-use inventory
- [x] Moving hazards: drifting snake heads every N turns; optional 💥 tiles (`js/hazards.js`)
- [x] Branching: Tactical fork @22; optional classic forks @40/@70 (Safe vs Risk)
- [x] Local coins + pass-and-play wager pot
- [x] Progression shop: themes, dice skins, borders, consumable PUs
- [x] Rewarded hooks: second-chance snake undo; post-match 2× coins (`Ads.showRewarded` stub)
- [x] Kept: Capacitor + vanilla web, exact-100, 2–4 local + bots, PWA (`sl-v2-phaseA-20260928b`)
- [x] README + STATUS updated; `www/` rebuilt

## Verified on this box

- Node syntax check on all `js/*.js`
- Integration smoke: themes unlock, tactical/classic forks, snake drift, 💥 hazards, rewarded stub grant, exact-100 bounce
- HTTP 200 for `index.html`, `js/game.js`, `js/profile.js` via `python3 -m http.server 4173`
- `npm run build:web` → `www/` includes Phase A modules

## Remaining gaps (not Phase A) ⏳

- [ ] Online multiplayer / WebSockets / cloud sync (explicitly out of scope)
- [ ] Real AdMob plugin + production IDs
- [ ] Signed release APK/AAB — **blocked here** (no JDK / Android SDK)
- [ ] Full Urdu i18n pack
- [ ] True 3D/physics dice engine (CSS 3D-ish only)
- [ ] iOS Capacitor target
- [ ] Smarter bots for power-ups / path choice
- [ ] Phase B+ boards / seasons


## How to try features

| Feature | How |
|---------|-----|
| Themes | Shop → buy Deep Sea/Tactical → setup **Board theme** → Start |
| Profile | **Profile** → name + emblem → Save (P1 token shows emblem) |
| FX | Climb ladder (particles); hit snake (shake) |
| Power-ups | Land on 🛡️/🎲/🔄 tiles **or** buy in Shop → chips appear on turn |
| Moving snakes | Play several turns — dashed heads drift |
| Extra 💥 | Setup → Moving hazards ON → land on 💥 → back 3 squares |
| Branch | Setup → **Branch board** ON (classic) → land on 40/70 → choose; or theme Tactical → fork @22 |
| Wager | Setup wager → finish → coins update |
| Second chance | Human snake bite → Second chance → stub Grant |
| 2× coins | Win modal → rewarded stub |
| Classic MVP | Leave Branch/theme default Classic — still exact-100 playable |

## How to open

```bash
cd /workspace/games/snakes-and-ladders
npm start
# → http://localhost:4173
```

## APK

`android/` Capacitor project ready. Build on a machine with JDK 17+ and Android SDK:

```bash
npm run android:build
# → android/app/build/outputs/apk/debug/app-debug.apk
```

## Blockers

1. APK not built on this box (no Java/SDK).  
2. AdMob stubs only until real app IDs are provided.
