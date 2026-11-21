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

## Releasing

Releases come in two kinds. Most changes only touch JavaScript and ship **over the air**, with no new build. Changes to native code need a **new build**, which you make on your own machine, so neither uses EAS Build quota.

### JavaScript-only change → over-the-air update

```bash
npm run update -- --message "Fix tiebreak serve order"
```

This publishes an [EAS Update](https://docs.expo.dev/eas-update/introduction/) to the `production` channel. Installed apps check on launch, download it in the background and use it from the next start. **Settings › Check for updates** fetches it straight away. EAS Update has its own free-plan limits (monthly users, bandwidth); see [expo.dev/pricing](https://expo.dev/pricing).

### Native change → local build

Native changes are new native libraries, `modules/`, `plugins/`, or plugin and permission settings in `app.json`.

```bash
npm run build:android            # signed APK to install directly
npm run build:android -- --aab   # app bundle for the Play Store
```

The script runs `expo prebuild` and then Gradle, and prints the output path. Install the APK with `adb install -r <path>` or copy it to the phone.

**Windows:** keep the project in a short folder such as `C:\dev\padelo`. Native libraries compile to paths that contain the project path twice, and the Android build tools fail beyond 260 characters. The script stops early with a message if the path is too long.

`runtimeVersion` uses the **fingerprint** policy: a hash of the native code. An update only reaches builds with the same fingerprint, so a JavaScript update can never land on an app missing the native code it needs. When the native code changes, make a new build first, then publish updates for it.

### Signing key (one-time setup)

Without a key, release builds are signed with the debug key. That's fine for trying things out, but Android only installs an upgrade signed with the same key as the installed app, so set up your own key before giving the app to anyone.

1. Create a key, choosing your own passwords when asked. Store the file somewhere safe outside the repo and back it up: if you lose it, you can't update the app.

   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore padelo-upload.jks -alias padelo -keyalg RSA -keysize 2048 -validity 10000
   ```

   If the app was installed before from an EAS build, download that key instead (`npx eas-cli@latest credentials -p android`). Otherwise uninstall the old app before installing a locally signed one.

2. Add the key to `~/.gradle/gradle.properties` (your user folder, never the repo):

   ```properties
   PADELO_UPLOAD_STORE_FILE=C:/path/to/padelo-upload.jks
   PADELO_UPLOAD_STORE_PASSWORD=...
   PADELO_UPLOAD_KEY_ALIAS=padelo
   PADELO_UPLOAD_KEY_PASSWORD=...
   ```

`plugins/withReleaseSigning.js` reads these values. The build script warns when they're missing.

### Build on GitHub

[.github/workflows/build-android.yml](.github/workflows/build-android.yml) runs the same `npm run build:android` on GitHub's Linux runners, which have no Windows path limit. It uses your GitHub Actions minutes instead of EAS Build quota. Private repositories get a monthly allowance; see [GitHub's billing docs](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions).

- **Manual build:** Actions › Build Android › Run workflow, choosing APK or AAB. The file is attached to the run as an artifact.
- **Release:** push a version tag and the APK is attached to a GitHub Release:

  ```bash
  git tag v1.0.1
  git push origin v1.0.1
  ```

To sign builds with your key, add four repository secrets under Settings › Secrets and variables › Actions. Without them, builds are debug-signed and the run shows a warning.

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | The `.jks` file, base64-encoded |
| `PADELO_UPLOAD_STORE_PASSWORD` | Keystore password |
| `PADELO_UPLOAD_KEY_ALIAS` | Key alias, e.g. `padelo` |
| `PADELO_UPLOAD_KEY_PASSWORD` | Key password |

With the GitHub CLI (PowerShell), each command asks for the value:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\padelo-upload.jks")) | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set PADELO_UPLOAD_STORE_PASSWORD
gh secret set PADELO_UPLOAD_KEY_ALIAS
gh secret set PADELO_UPLOAD_KEY_PASSWORD
```

Use the same key everywhere (your machine and GitHub). Android only installs upgrades signed with the key the installed app was signed with.

`.gitattributes` keeps line endings LF on every machine. The update fingerprint hashes native config files, so a Windows checkout with CRLF would otherwise produce a different fingerprint from the GitHub build, and updates published from one machine would not reach apps built on the other.

### EAS Build (optional)

EAS Build still works and uses quota: `npx eas-cli@latest build --profile production --platform android`. Its `preview` and `production` profiles set the matching update channel.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the dev server |
| `npm run android` / `npm run ios` | Build and run the development build |
| `npm test` | Run all Jest tests |
| `npm run lint` | ESLint on `src` and `modules` |
| `npx tsc --noEmit` | Typecheck |
| `npm run format` | Prettier on `src` |
| `npm run build:android` | Signed release APK built on this machine (`-- --aab` for a bundle) |
| `npm run update -- --message "..."` | Publish an over-the-air update to installed apps |

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
