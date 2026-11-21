# Padel scoring rules

The reference implementation is `reference/engine.js` (plain JavaScript, ~120 lines). Port it to TypeScript as a pure, immutable state machine (no React imports) and make every case in `reference/scoring-fixtures.json` pass as a Jest test before building UI on top of it.

## Match rules (configurable per match)

| Field | Values | Meaning |
| --- | --- | --- |
| `bestOf` | 1, 3, 5 | Number of sets; first to `(bestOf + 1) / 2` sets wins |
| `games` | 4, 6, 9 | Games to win a set (4 = short set, 6 = normal, 9 = pro set) |
| `deuce` | `golden`, `adv`, `star` | How a game at 40–40 is decided (below) |
| `tiebreak` | true / false | Play a tiebreak at `games`–`games`. Off = play on until 2 games clear |
| `superTb` | true / false | When sets are level before the last set, play a super tiebreak (first to 10, win by 2) instead of the deciding set |

Default: best of 3, sets to 6, golden point, tiebreak on, super tiebreak on.

## Points within a game

Points display as `0, 15, 30, 40, Ad` (internal 0–4).

- **Golden point** (`golden`): at 40–40 the next point wins the game.
- **Advantage / two in a row** (`adv`): at 40–40 (deuce) a team must win two points in a row. Winning one gives `Ad`; losing from `Ad` returns to deuce.
- **Star point** (`star`): played like advantage for the first two deuces. On the third deuce of the game the next point wins (a "star point"). Track a per-game `deuceCount`; reset it when the game ends.
- Switching the rule mid-game from `adv`/`star` to `golden` while a team has `Ad` puts the score back to 40–40.

## Sets

- A set is won at `games` with a 2-game lead.
- At `games`–`games` with `tiebreak` on: tiebreak, first to 7 points, win by 2. The set is recorded as 7–6.
- Super tiebreak replaces the deciding set: first to 10 points, win by 2. Recorded with the point score (e.g. 10–8) and flagged `superTiebreak`.

## Serve

- Serving team alternates every game.
- In a tiebreak / super tiebreak the serve changes after the first point, then every two points (i.e. whenever the total points played is odd).
- Within a team the two players alternate service games. The UI shows "<player> serving".

## Change of ends

Raise a "Change ends" alert:
- after every game where the total games in the set is odd,
- at the end of a set if that set's total games was odd,
- every 6 points in a tiebreak.
The alert clears on the next point.

## Undo and log

- Keep a stack of snapshots; undo restores the previous one exactly.
- Keep a point log, newest first, max 40 entries: `Deuce`, `Back to deuce`, `30–15`, `Game <team>`, `Golden point · game <team>`, `Star point · game <team>`, `Tiebreak 4–3`, `Set <team> · 6–4`, `Match <team>`. Each entry records who won the point.

## Status banner (priority order)

1. `Match over`
2. `Change ends`
3. `Super tiebreak · first to 10`
4. `Tiebreak · first to 7`
5. At 40–40: `Golden point · next point wins` / `Star point · next point wins` / `Deuce N of 3 · star point on the 3rd` / `Deuce · win two points in a row`
6. `Advantage <team>`
7. `<team> serving`

## Americano scoring (separate)

- Each match is played to a fixed number of points (default 24, configurable), no games or sets.
- Each player receives their team's points; partners rotate every round so everyone partners everyone once.
- Leaderboard: total points, then point difference (points won minus points conceded).
- The +/- steppers cap the two sides so they never exceed the total.
