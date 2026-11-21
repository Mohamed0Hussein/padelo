# Padelo

[![Test](https://github.com/Mohamed0Hussein/padelo/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/Mohamed0Hussein/padelo/actions/workflows/test.yml)

Score padel matches point by point and run tournaments from your phone. Works fully offline: everything is stored on the device.

Built with Expo and React Native. Android first; iOS works too.

## Features

- **Live scoring** with golden point, advantage or star point at 40–40, tiebreaks, super tiebreak, change-of-ends alerts, serve tracking, faults and double faults, undo and a full point history.
- **Courtside view**: landscape, huge numbers, lockable pads, screen stays on.
- **Volume-key scoring** (Android): volume up gives the point to team 1, volume down to team 2, and the system volume doesn't change.
- **Haptics and spoken score** after every point (both optional).
- **Tournaments**: round robin, groups + knockout, knockout with byes, and Americano. Automatic draw, group tables, bracket, court assignment, configurable ranking rules, results and CSV export.
- **Players**: profiles, form, partner win rates and head-to-head, all worked out from saved matches.
- **Share**: a result card image, plus a Share live screen (the live sync is a stub for now, see below).
- **Dark and light "Material glass" themes**, or follow the system.

## Getting started

You need Node 24 and, for Android, Android Studio with an emulator or a phone with USB debugging.

```bash
npm ci
npx expo run:android   # or: npx expo run:ios (macOS only)
```

The app uses its own native code (volume keys), so it runs as a **development build**, not in Expo Go. `expo run:android` builds and installs it. After that, `npm start` is enough while you edit JavaScript.

To build in the cloud instead, use EAS:

```bash
npx eas-cli@latest build --profile development --platform android   # dev build APK
npx eas-cli@latest build --profile preview --platform android       # installable test APK
npx eas-cli@latest build --profile production --platform android    # Play Store bundle
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the dev server |
| `npm run android` / `npm run ios` | Build and run the development build |
| `npm test` | Run all Jest tests |
| `npm run lint` | ESLint on `src` and `modules` |
| `npx tsc --noEmit` | Typecheck |
| `npm run format` | Prettier on `src` |

Every push and pull request runs install, typecheck, lint and tests on GitHub Actions.

## Project layout

```
src/
  app/          Screens (Expo Router: tabs for Home, Matches, Tournaments, Players + stack screens)
  engine/       Scoring engine: pure TypeScript, point(state, team) and undo(state)
  store/        Zustand store; screens never change scores directly
  db/           SQLite persistence (expo-sqlite, one table of JSON documents)
  tournament/   Draw, knockout, standings, ranking order, Americano rotation
  lib/          Stats, sync interface, scoring controls (haptics, speech, volume keys)
  ui/           Shared components (GlassSurface, ScorePad, Sheet, Segmented, ...)
  theme/        Dark and light palettes from design/tokens.json
  test/         Jest setup and helpers for screen tests
  __tests__/    Screen tests
modules/volume-keys/   Small Expo native module (Kotlin) that catches the volume keys
plugins/               Config plugin that wires that module into MainActivity
docs/                  Product spec and scoring rules
design/                Design tokens and screen mockups
reference/             Original scoring engine and the fixtures it must reproduce
```

## Tests

```bash
npm test
```

- **Engine**: every case in `reference/scoring-fixtures.json`, plus undo, immutability and log limits.
- **Logic**: tournament draw, standings and ranking order, Americano rotation, player stats.
- **Store flows**: whole matches and tournaments played through the store with an in-memory database.
- **Screens**: every screen rendered with React Native Testing Library, with the router, database and device APIs faked in `src/test/setup.ts`.

## Docs

- [docs/SPEC.md](docs/SPEC.md): screens, navigation, behaviour and data model
- [docs/SCORING.md](docs/SCORING.md): padel scoring rules as implemented
- [CLAUDE.md](CLAUDE.md): stack choices and build phases

## Known limits

- **Share live** has no backend yet. The screen and the public data model exist, but the network part is a stub (`src/lib/sync.ts`) and the link is a placeholder.
- **Volume-key scoring** is Android only.
- **Frosted blur** is on for iOS only. Android uses the same translucent colours without blur (`GLASS_BLUR` in `src/theme`).
