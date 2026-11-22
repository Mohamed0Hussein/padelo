# Contributing to Padelo

Thanks for helping. Bug reports, rule corrections and pull requests are all welcome.

## Reporting a bug

Open an issue with:
- what you did, what you expected and what happened instead;
- for scoring bugs, the match rules (sets, games, 40–40 rule, tiebreaks) and the score when it went wrong;
- your phone model and Android version.

## Making a change

1. Set up the project as described in [Build from source](README.md#build-from-source).
2. Keep these checks green (GitHub Actions runs them on every pull request too):

   ```bash
   npx tsc --noEmit
   npm run lint
   npm test
   ```

3. Add or update tests for what you change:
   - Scoring rules live in `src/engine` as pure functions. New rule behaviour gets a test there.
   - Tournament logic lives in `src/tournament`.
   - Screen behaviour is tested in `src/__tests__`.
4. Screens never change scores directly; they call the store (`src/store`), which calls the engine.
5. Every button needs an `accessibilityLabel` and a touch target of at least 48×48.

## Scoring rules

[docs/SCORING.md](docs/SCORING.md) describes the rules the engine implements. If you think a rule is wrong, please cite the source (for example the official padel regulations) in the issue.
