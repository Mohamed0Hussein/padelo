import type { ScoringState } from '@/engine';
import type { MatchResult, RankKey, RankingRules, TMatch, Tournament } from '@/lib/types';

export interface Row {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
  golden: number;
  points: number;
}

/** Summarises a finished scoring state. */
export function resultFromState(s: ScoringState): MatchResult {
  const games: [number, number] = [0, 0];
  const tiebreaks: [number, number] = [0, 0];
  for (const set of s.sets) {
    games[0] += set.games[0];
    games[1] += set.games[1];
    const [hi, lo] = [Math.max(...set.games), Math.min(...set.games)];
    // tiebreak set: won by exactly one game from level, or a super tiebreak
    if (set.superTiebreak || (hi - lo === 1 && lo >= 4)) tiebreaks[set.winner]++;
  }
  return {
    sets: s.sets.map((x) => [...x.games] as [number, number]),
    winner: (s.winner < 0
      ? s.sets.filter((x) => x.winner === 0).length >= s.sets.filter((x) => x.winner === 1).length
        ? 0
        : 1
      : s.winner) as 0 | 1,
    games,
    golden: [...s.golden],
    tiebreaks,
  };
}

const setsWon = (r: MatchResult, side: 0 | 1) =>
  r.sets.length ? r.sets.filter(([a, b]) => (side === 0 ? a > b : b > a)).length : 0;

export function standings(teamIds: string[], matches: TMatch[], rules: RankingRules): Row[] {
  const rows = new Map<string, Row>(
    teamIds.map((id) => [
      id,
      {
        teamId: id,
        played: 0,
        won: 0,
        lost: 0,
        setsFor: 0,
        setsAgainst: 0,
        gamesFor: 0,
        gamesAgainst: 0,
        golden: 0,
        points: 0,
      },
    ]),
  );
  const h2h = new Map<string, number>(); // "a|b" -> 1 if a beat b
  for (const m of matches) {
    if (!m.result || !m.a || !m.b) continue;
    const r = m.result;
    const sides: [string, 0 | 1][] = [
      [m.a, 0],
      [m.b, 1],
    ];
    for (const [id, side] of sides) {
      const row = rows.get(id);
      if (!row) continue;
      const won = r.winner === side;
      row.played++;
      row[won ? 'won' : 'lost']++;
      row.setsFor += setsWon(r, side);
      row.setsAgainst += setsWon(r, (1 - side) as 0 | 1);
      row.gamesFor += r.games[side];
      row.gamesAgainst += r.games[1 - side];
      row.golden += r.golden[side];
      row.points += won ? rules.winPoints : rules.lossPoints;
      if (won && setsWon(r, (1 - side) as 0 | 1) === 0) row.points += rules.straightSetsBonus;
    }
    const [w, l] = r.winner === 0 ? [m.a, m.b] : [m.b, m.a];
    h2h.set(`${w}|${l}`, 1);
  }
  const val: Record<Exclude<RankKey, 'HEAD_TO_HEAD'>, (r: Row) => number> = {
    SET_DIFF: (r) => r.setsFor - r.setsAgainst,
    GAME_DIFF: (r) => r.gamesFor - r.gamesAgainst,
    GAMES_WON: (r) => r.gamesFor,
    GOLDEN_POINTS: (r) => r.golden,
  };
  // ponytail: head-to-head is pairwise; a 3-way tie can be non-transitive. Upgrade to mini-league if it matters.
  return [...rows.values()].sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    for (const k of rules.order) {
      const d =
        k === 'HEAD_TO_HEAD'
          ? (h2h.get(`${y.teamId}|${x.teamId}`) ?? 0) - (h2h.get(`${x.teamId}|${y.teamId}`) ?? 0)
          : val[k](y) - val[k](x);
      if (d) return d;
    }
    return 0;
  });
}

export function groupStandings(t: Tournament, group: string): Row[] {
  const g = t.groups.find((x) => x.name === group)!;
  return standings(
    g.teamIds,
    t.matches.filter((m) => m.stage === 'group' && m.group === group),
    t.rankingRules,
  );
}

/** Group winners first, then runners-up, in group order: feeds bracketOrder without same-group rematches. */
export function qualifiers(t: Tournament, perGroup = 2): string[] {
  const tables = t.groups.map((g) => groupStandings(t, g.name));
  const out: string[] = [];
  for (let p = 0; p < perGroup; p++) for (const tb of tables) if (tb[p]) out.push(tb[p].teamId);
  return out;
}

export const RANK_LABEL: Record<RankKey, string> = {
  SET_DIFF: 'Set difference',
  GAME_DIFF: 'Game difference',
  HEAD_TO_HEAD: 'Head to head',
  GAMES_WON: 'Games won',
  GOLDEN_POINTS: 'Golden points won',
};
