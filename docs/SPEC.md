# Padel score — product spec

Mobile app (Android first, iOS comes free with Expo) to score padel matches and host, run and record tournaments. Works fully offline; everything is stored on the phone. Dark and light "Material glass" themes (see `design/tokens.json`).

## Screens

Each screen has a design file in `design/screens/<Name>.dc.html` (see "Reading the design files" below). Phone screens are 390×844 pt; Courtside is landscape 844×390.

| # | Screen | File | Purpose & key elements | Navigates to |
| --- | --- | --- | --- | --- |
| 1 | Welcome | `Welcome` | First launch / empty state. Court illustration, headline, 3 benefits, "Score my first match", "Host a tournament", "Skip for now" | New match, Create tournament, Home |
| 2 | Home | `Main` | Live match card, New match / Host tournament tiles, "Your tournaments" (progress), recent matches, bottom nav (Home, Matches, Tournaments, Players), settings button | Live scoring, New match, Create tournament, Tournament, Americano, Results, Settings, Player |
| 3 | New match | `NewMatch` | Player names (2 per team), segmented buttons for match length, games per set, 40–40 rule, deciding set; tiebreak switch; summary line; Start match | Live scoring |
| 4 | Live scoring | `LiveScore` | Score table (sets + current games), serving player, 40–40 rule switcher, status banner, two large tap pads, undo, rules bottom sheet (length, games, deciding set, tiebreak, volume-key scoring, theme), point-history bottom sheet, Restart, End & save | Courtside, Share result |
| 5 | Courtside | `Courtside` | Landscape. Huge points, compact set table, banner, "Screen stays on", Volume keys toggle, Lock (disables pads), undo | Live scoring |
| 6 | Share result | `ResultCard` | Shareable image card (3 styles: Glass, Tinted, Minimal), share targets (Message, Save image, Copy link, More) | Bracket |
| 7 | Create tournament | `TournamentCreate` | Name, date, venue; format cards (Round robin, Groups + knockout, Knockout, Americano) with computed match count; match rules; "different rules for the final"; team count stepper + team chips; shuffle; Create & make draw | Tournament |
| 8 | Tournament hub | `Tournament` | Stage + progress, format chips, tabs: Groups (A–D tables, qualifiers marked), Matches (by round, live highlighted), Knockout (open bracket, rules); FAB "Score a match"; header buttons Courts, Share live | Live scoring, Bracket, Results, Courts, Share live, Ranking rules |
| 9 | Knockout bracket | `Bracket` | Horizontally scrolling QF → SF → Final with connector lines, live/winner/upcoming states, "Next match" footer | Tournament, Live scoring, Results |
| 10 | Tournament results | `TournamentResults` | Champions card, final placings, stats, knockout results, Export CSV, Share | Home, Head to head |
| 11 | Americano | `Americano` | Rounds tab (round chips R1–R7, courts with +/- point entry, rotation note), Leaderboard tab; "Lock results · start next round" | Share live |
| 12 | Courts | `Courts` | Each court: status (Playing / Live / Free), match + score, elapsed time; "Assign <match> here" on free courts; Auto-assign switch; Up next queue (drag to reorder) | Live scoring |
| 13 | Ranking rules | `RankingRules` | Points for win / loss / 2–0 bonus (steppers), tie-break order (move up/down), live preview text, Save | Tournament |
| 14 | Share live | `ShareLive` | QR code + link, Copy / Share, what spectators can see (switches), Pause sharing | — |
| 15 | Player profile | `PlayerProfile` | Avatar, details, level, stats grid, last-10 form, partner win rates, head-to-head link, bottom nav | Head to head |
| 16 | Head to head | `HeadToHead` | Two team pickers, overall record, comparison bars (matches, sets, games, golden points, tiebreaks), past meetings | — |
| 17 | Settings | `Settings` | Theme (System / Dark / Light), default match rules, switches (volume-key scoring, keep screen awake, vibrate per point, change-ends reminder, call score aloud), ranking rules, live sharing, Export CSV, Back up | New match, Ranking rules, Share live |

## Behaviour notes

- **Theme** is one app-wide setting (System / Dark / Light). The per-screen theme buttons in the mockups are only for previewing; in the app they read and write the same setting.
- **Rules flow**: rules chosen on New match (or the tournament's rules) are passed to Live scoring. They can still be changed mid-match from the rules sheet.
- **Volume-key scoring**: a global setting (on by default) that can also be toggled from the Live scoring rules sheet and the Courtside top bar. When on and a scoring screen is visible: volume up = point to team 1, volume down = point to team 2, and the system volume does not change. When off, hints say "Tap for point".
- **Keep screen awake** on Live scoring and Courtside while the setting is on.
- **Haptics**: short vibration per point, double on game point.
- **Call score aloud**: text-to-speech after each point, e.g. "30–15, Youssef serving".
- **Courtside lock**: pads ignore taps until unlocked; volume keys also ignored.
- **End & save**: saves the match (with full point log) to history and to the tournament if it belongs to one, then updates tables / bracket.
- **Tournament draw**: Groups of 4, top 2 advance, seeds 1–4 kept apart; knockout fills automatically when the group stage ends. Byes for knockout when team count isn't a power of 2.
- **Share live** needs a backend; for v1 build the screen and the read-only data model, but stub the network part behind an interface.

## Data model (suggested)

- `Player(id, name, initials, side?, level?)`
- `Team(id, playerIds[2], name)`
- `MatchRules(bestOf, games, deuce, tiebreak, superTb)`
- `Match(id, teamIds[2], rules, courtLabel?, tournamentId?, roundLabel?, startedAt, endedAt?, state: ScoringState, log)`
- `Tournament(id, name, date, venue, format: ROUND_ROBIN | GROUPS_KNOCKOUT | KNOCKOUT | AMERICANO, rules, finalRules?, rankingRules, teamIds, groups, rounds, courts)`
- `RankingRules(winPoints=3, lossPoints=0, straightSetsBonus=1, order=[SET_DIFF, GAME_DIFF, HEAD_TO_HEAD, GAMES_WON, GOLDEN_POINTS])`
- `AmericanoRound(index, matches[{court, playerIds[4], pointsA, pointsB}])`
- `Settings(theme, defaultRules, volumeKeys, keepAwake, haptics, changeEndsReminder, callScore)`

Stats on Player profile / Head to head are derived from saved matches and their point logs (wins, sets, games, golden points won, tiebreaks won).

## Reading the design files

`design/screens/*.dc.html` are the exact mockups exported from the design canvas. They are HTML with a small template language:
- `{{name}}` reads a value computed in the `<script data-dc-script>` block at the bottom (`renderVals()`).
- `<sc-for list="{{items}}" as="item">` repeats; `<sc-if value="{{cond}}">` shows conditionally.
- Most styles are composed in JS from a palette (`PAL`) and a style map (`st`) at the top of the script — read those to get exact colours, radii and sizes.
- `<span class="ms">icon_name</span>` is a Material Symbols Rounded icon by name.
- Sample names and numbers in the files are placeholder data.
They won't render in a normal browser on their own; use them as a precise reference, not as code to ship.
