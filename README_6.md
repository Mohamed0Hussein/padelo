# Padel score: handoff for Claude Code

1. Make an empty folder for the app and unzip this into it.
2. Install Node LTS, then open a terminal in that folder and run `claude`. To run the app on your phone later you need a development build (Claude Code will set it up: `npx expo run:android` with a phone connected, or EAS Build).
3. Paste:

   > Read CLAUDE.md and everything it points to. Start phase 1 and stop when it's done so I can check it.

Contents:
- `CLAUDE.md`: instructions Claude Code loads automatically (stack, phases, rules)
- `docs/SPEC.md`: all 17 screens, navigation, behaviour, data model
- `docs/SCORING.md`: the scoring rules in plain words
- `design/tokens.json`: colours, type, shapes for dark and light themes
- `design/screens/`: the exact mockup source for every screen
- `reference/engine.js`: working scoring logic to port
- `reference/scoring-fixtures.json`: 15 point-by-point test cases with expected results

Tip: export the canvas as images (Share › Export) and put them in `design/images/`; Claude Code can look at them to compare its screens.
