import type { Match, TeamRef } from './types';
import { playerId } from './util';

export interface Stats {
  played: number;
  won: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  golden: number;
  tiebreaks: number;
}
const zero = (): Stats => ({
  played: 0,
  won: 0,
  setsWon: 0,
  setsLost: 0,
  gamesWon: 0,
  gamesLost: 0,
  golden: 0,
  tiebreaks: 0,
});

const sideOf = (m: Match, name: string): 0 | 1 | -1 => {
  const id = playerId(name);
  if (m.teams[0].players.some((p) => playerId(p) === id)) return 0;
  if (m.teams[1].players.some((p) => playerId(p) === id)) return 1;
  return -1;
};

function add(st: Stats, m: Match, side: 0 | 1) {
  const r = m.result!;
  const o = (1 - side) as 0 | 1;
  st.played++;
  if (r.winner === side) st.won++;
  for (const [a, b] of r.sets) {
    const [mine, theirs] = side === 0 ? [a, b] : [b, a];
    if (mine > theirs) st.setsWon++;
    else st.setsLost++;
  }
  st.gamesWon += r.games[side];
  st.gamesLost += r.games[o];
  st.golden += r.golden[side];
  st.tiebreaks += r.tiebreaks[side];
}

export const finished = (ms: Match[]) => ms.filter((m) => m.result);

export function playerNames(matches: Match[], extra: string[] = []): string[] {
  const seen = new Map<string, string>();
  for (const n of [...matches.flatMap((m) => m.teams.flatMap((t) => t.players)), ...extra]) {
    if (n.trim()) seen.set(playerId(n), seen.get(playerId(n)) ?? n.trim());
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function playerStats(matches: Match[], name: string) {
  const st = zero();
  const form: ('W' | 'L')[] = [];
  const partners = new Map<string, { name: string; played: number; won: number }>();
  const mine = finished(matches)
    .filter((m) => sideOf(m, name) >= 0)
    .sort((a, b) => b.endedAt! - a.endedAt!);
  for (const m of mine) {
    const side = sideOf(m, name) as 0 | 1;
    add(st, m, side);
    const won = m.result!.winner === side;
    if (form.length < 10) form.push(won ? 'W' : 'L');
    const partner = m.teams[side].players.find((p) => playerId(p) !== playerId(name));
    if (partner) {
      const p = partners.get(playerId(partner)) ?? { name: partner, played: 0, won: 0 };
      p.played++;
      if (won) p.won++;
      partners.set(playerId(partner), p);
    }
  }
  return { ...st, form, partners: [...partners.values()].sort((a, b) => b.played - a.played), matches: mine };
}

const teamKey = (t: { players: string[] }) => t.players.map(playerId).sort().join('+');
export const teamsKey = teamKey;

/** All distinct pairs seen in saved matches (for the head-to-head pickers). */
export function knownTeams(matches: Match[]): TeamRef[] {
  const out = new Map<string, TeamRef>();
  for (const m of finished(matches)) for (const t of m.teams) out.set(teamKey(t), t);
  return [...out.values()];
}

export function headToHead(matches: Match[], a: TeamRef, b: TeamRef) {
  const ka = teamKey(a);
  const kb = teamKey(b);
  const sa = zero();
  const sb = zero();
  const meetings: Match[] = [];
  for (const m of finished(matches)) {
    const k = m.teams.map(teamKey);
    if (!((k[0] === ka && k[1] === kb) || (k[0] === kb && k[1] === ka))) continue;
    meetings.push(m);
    add(sa, m, k[0] === ka ? 0 : 1);
    add(sb, m, k[0] === kb ? 0 : 1);
  }
  return { a: sa, b: sb, meetings: meetings.sort((x, y) => y.endedAt! - x.endedAt!) };
}
