import type { Banner, MatchRules, ScoringState, Snapshot, Team } from './types';

export * from './types';

export const DEFAULT_RULES: MatchRules = { bestOf: 3, games: 6, deuce: 'golden', tiebreak: true, superTb: true };
export const POINT_LABELS = ['0', '15', '30', '40', 'Ad'] as const;
const LOG_MAX = 40;

export function init(
  rules: MatchRules = DEFAULT_RULES,
  names: [string, string] = ['Team 1', 'Team 2'],
  preset: Partial<ScoringState> = {},
): ScoringState {
  return {
    rules,
    names,
    sets: [],
    games: [0, 0],
    points: [0, 0],
    tiebreak: false,
    superTiebreak: false,
    server: 0,
    winner: -1,
    deuceCount: 0,
    golden: [0, 0],
    changeEnds: false,
    log: [],
    history: [],
    ...preset,
  };
}

function snapshot(s: ScoringState): Snapshot {
  const { sets, games, points, tiebreak, superTiebreak, server, winner, deuceCount, golden, changeEnds, log } = s;
  return { sets, games, points, tiebreak, superTiebreak, server, winner, deuceCount, golden, changeEnds, log };
}

export function pointLabel(s: ScoringState, team: Team): string {
  return s.tiebreak || s.superTiebreak ? String(s.points[team]) : POINT_LABELS[s.points[team]];
}

/** Returns the same state once the match is over. */
export function point(s: ScoringState, t: Team): ScoringState {
  if (s.winner >= 0) return s;
  const o = (1 - t) as Team;
  const R = s.rules;
  const names = s.names;

  let sets = s.sets;
  let games: [number, number] = [...s.games];
  let points: [number, number] = [...s.points];
  let tiebreak = s.tiebreak;
  let superTiebreak = s.superTiebreak;
  let server = s.server;
  let winner: Team | -1 = -1;
  let deuceCount = s.deuceCount;
  let golden: [number, number] = [...s.golden];
  let changeEnds = false;
  let gameWon = false;
  let setWon = false;
  let entry = '';

  if (superTiebreak || tiebreak) {
    points[t]++;
    const target = superTiebreak ? 10 : 7;
    if (points[t] >= target && points[t] - points[o] >= 2) {
      setWon = true;
      if (superTiebreak) sets = [...sets, { games: [...points], winner: t, superTiebreak: true }];
      else {
        games[t]++;
        gameWon = true;
      }
    }
    if ((points[0] + points[1]) % 2 === 1) server = (1 - server) as Team;
    if (!setWon && (points[0] + points[1]) % 6 === 0) changeEnds = true;
    entry = `${superTiebreak ? 'Super tiebreak' : 'Tiebreak'} ${points[0]}–${points[1]}`;
  } else {
    const deciding =
      points[t] === 3 && points[o] === 3 && (R.deuce === 'golden' || (R.deuce === 'star' && deuceCount >= 3));
    if (deciding || (points[t] === 3 && points[o] < 3) || points[t] === 4) gameWon = true;
    else if (points[t] === 3 && points[o] === 4) {
      points[o] = 3;
      deuceCount++;
      entry = 'Back to deuce';
    } else {
      points[t]++;
      if (points[0] === 3 && points[1] === 3) {
        deuceCount++;
        entry = 'Deuce';
      }
    }
    if (gameWon) {
      games[t]++;
      if (deciding) golden[t]++;
      server = (1 - server) as Team;
      deuceCount = 0;
      entry = `${deciding ? (R.deuce === 'star' ? 'Star point' : 'Golden point') + ' · game' : 'Game'} ${names[t]}`;
      if (games[t] >= R.games && games[t] - games[o] >= 2) setWon = true;
      else if ((games[0] + games[1]) % 2 === 1) changeEnds = true;
    } else if (!entry) {
      entry = `${POINT_LABELS[points[0]]}–${POINT_LABELS[points[1]]}`;
    }
  }

  if (gameWon || setWon) points = [0, 0];

  if (setWon) {
    if (!superTiebreak) {
      sets = [...sets, { games: [...games], winner: t, superTiebreak: false }];
      if ((games[0] + games[1]) % 2 === 1) changeEnds = true;
    }
    const last = sets[sets.length - 1];
    entry = `Set ${names[t]} · ${last.games.join('–')}`;
    games = [0, 0];
    tiebreak = false;
    superTiebreak = false;
    const won = sets.filter((x) => x.winner === t).length;
    if (won === (R.bestOf + 1) / 2) {
      winner = t;
      entry = `Match ${names[t]}`;
      changeEnds = false;
    } else if (R.superTb && R.bestOf > 1 && sets.length === R.bestOf - 1) superTiebreak = true;
  } else if (gameWon && R.tiebreak && games[0] === R.games && games[1] === R.games) {
    tiebreak = true;
    entry += ' · tiebreak';
  }

  return {
    ...s,
    sets,
    games,
    points,
    tiebreak,
    superTiebreak,
    server,
    winner,
    deuceCount,
    golden,
    changeEnds,
    log: [{ text: entry, team: t }, ...s.log].slice(0, LOG_MAX),
    history: [...s.history, snapshot(s)],
  };
}

/** Returns the same state when there is nothing to undo. */
export function undo(s: ScoringState): ScoringState {
  const prev = s.history[s.history.length - 1];
  if (!prev) return s;
  return { ...s, ...prev, history: s.history.slice(0, -1) };
}

/** Who won each point so far, oldest first (recovered from the undo history). */
export function pointWinners(s: ScoringState): Team[] {
  const n = s.history.length;
  // history[k + 1] is the state right after point k; its newest log entry names the winner
  return Array.from({ length: n }, (_, k) => (k < n - 1 ? s.history[k + 1].log[0].team : s.log[0].team));
}

/**
 * Takes `team`'s most recent point away, even if the other team scored after it, by replaying
 * every other point. Returns the same state when `team` has no points.
 * ponytail: replays with the current rules; a 40–40 rule changed mid-match applies from the start.
 */
export function removePoint(s: ScoringState, team: Team): ScoringState {
  const winners = pointWinners(s);
  const i = winners.lastIndexOf(team);
  if (i < 0) return s;
  winners.splice(i, 1);
  return winners.reduce((st, t) => point(st, t), init(s.rules, s.names));
}

export function banner(s: ScoringState): Banner {
  const R = s.rules;
  const [a, b] = s.points;
  if (s.winner >= 0) return { text: 'Match over', icon: 'flag', hot: false };
  if (s.changeEnds) return { text: 'Change ends', icon: 'swap_horiz', hot: true };
  if (s.superTiebreak) return { text: 'Super tiebreak · first to 10', icon: 'bolt', hot: true };
  if (s.tiebreak) return { text: 'Tiebreak · first to 7', icon: 'bolt', hot: true };
  if (a === 3 && b === 3) {
    if (R.deuce === 'golden') return { text: 'Golden point · next point wins', icon: 'star', hot: true };
    if (R.deuce === 'star' && s.deuceCount >= 3)
      return { text: 'Star point · next point wins', icon: 'star', hot: true };
    if (R.deuce === 'star')
      return { text: `Deuce ${s.deuceCount} of 3 · star point on the 3rd`, icon: 'balance', hot: true };
    return { text: 'Deuce · win two points in a row', icon: 'balance', hot: true };
  }
  if (a === 4 || b === 4) return { text: `Advantage ${s.names[a === 4 ? 0 : 1]}`, icon: 'trending_up', hot: true };
  return { text: `${s.names[s.server]} serving`, icon: 'sports_tennis', hot: false };
}

export function rulesLine(R: MatchRules): string {
  const d = { golden: 'golden point', adv: 'advantage', star: 'star point' }[R.deuce];
  const sets = R.bestOf === 1 ? '1 set' : `Best of ${R.bestOf}`;
  const last = R.bestOf > 1 ? (R.superTb ? ' · super tiebreak' : ' · full final set') : '';
  return `${sets} · sets to ${R.games} · ${d}${last}`;
}
