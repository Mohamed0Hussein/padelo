# Padel score: React Native + Expo app

You are building a mobile app (Android first, iOS should also work) from a finished design. Read these first:

1. `docs/SPEC.md`: screens, navigation, behaviour, data model
2. `docs/SCORING.md`: padel scoring rules (golden point, advantage, star point, tiebreaks, change of ends)
3. `design/tokens.json`: colours (dark + light), type, shapes, sizes
4. `design/screens/*.dc.html`: the exact mockup for each screen (how to read them is at the end of SPEC.md)
5. `reference/engine.js` + `reference/scoring-fixtures.json`: the working scoring logic and the expected results it must reproduce

## Stack

Use the latest stable Expo SDK and check each library is maintained and compatible with it before installing (`npx expo install` for anything Expo ships).

- Expo + TypeScript (strict), Expo Router for navigation (file-based, tabs for Home / Matches / Tournaments / Players).
- **Development build (`expo-dev-client`), not Expo Go**: volume-key scoring needs native code.
- UI: React Native Paper (Material 3) as the component base, themed from `tokens.json`. Build our own `GlassSurface`, `GlowBackground`, `SegmentedButtons`, `ScorePad` on top where Paper doesn't match the design.
- Frosted glass: `expo-blur` `BlurView` (on Android use its experimental blur method; if it's too slow on a mid-range phone, fall back to the same translucent colours without blur, decided by a single flag).
- Fonts: Roboto + Roboto Mono via `@expo-google-fonts`; icons: Material Symbols Rounded loaded with `expo-font` (or `@expo/vector-icons` MaterialIcons if a symbol is missing).
- State: Zustand stores; data: `expo-sqlite` (Drizzle ORM optional, say which you chose); settings in the same DB or `expo-secure-store`/AsyncStorage.
- Device features: `expo-keep-awake`, `expo-haptics`, `expo-speech` (call the score aloud), `expo-screen-orientation` (Courtside landscape), `react-native-view-shot` + `expo-sharing` (result card), `react-native-qrcode-svg` (Share live).
- Volume keys: try `react-native-volume-manager` (listen for up/down, suppress the system volume UI). If it can't stop the volume from actually changing on Android, write a small Expo native module (Kotlin) that intercepts `KEYCODE_VOLUME_UP/DOWN` only while scoring is active.
- Tests: Jest via `jest-expo`, React Native Testing Library for components.

## How to work

- **Build in phases and stop after each one to show me what was done.**
  1. Project setup (Expo Router, TypeScript, lint/format), theme (both palettes from `tokens.json`, fonts, icons, `GlassSurface`, `GlowBackground`), tab + stack navigation with empty screens, dark/light/system theme switch.
  2. Scoring engine in `src/engine/` as pure TypeScript (no React). Port `reference/engine.js`, then import `scoring-fixtures.json` straight into Jest and assert every case. All must pass before phase 3.
  3. New match → Live scoring → Courtside → Share result, including undo, point history and rules bottom sheets, volume-key scoring (with its on/off toggle), keep-awake, haptics, speech.
  4. Persistence (SQLite) and Home: recent matches, live match card.
  5. Tournaments: Create, hub (groups, matches, knockout), Bracket, Results, Ranking rules, Courts.
  6. Americano.
  7. Players: profile, head to head (stats derived from saved matches).
  8. Settings, Welcome / empty states, Share live (UI + stubbed sync interface).
- Match the mockups closely: spacing, radii, colours from `tokens.json`, copy from the screens. Sample names and numbers in the mockups are placeholders; use real data.
- Every touchable is at least 48×48, has an `accessibilityLabel` and the right `accessibilityRole`, and text meets 4.5:1 contrast in both themes.
- Keep the engine immutable: `point(state, team) => State`, `undo(state) => State`. Screens never change scores directly; they dispatch to a store that calls the engine.
- Write unit tests for the engine, tournament draw / standings / ranking order, and Americano rotation.
- Don't commit, push, publish to stores or add backend services unless I ask.
