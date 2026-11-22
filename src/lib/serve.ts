import type { Match } from './types';

/** Which of the serving team's two players serves right now (they alternate service games). */
export function servingPlayer(m: Match): string {
  const s = m.state;
  const played =
    s.sets.filter((x) => !x.superTiebreak).reduce((n, x) => n + x.games[0] + x.games[1], 0) + s.games[0] + s.games[1];
  const nth = Math.floor((s.server === 0 ? played : played - 1) / 2);
  const ps = m.teams[s.server].players.filter(Boolean);
  return ps[Math.max(0, nth) % ps.length] ?? '';
}

export interface PlayerFaults {
  player: string;
  /** every serve fault, including both faults of a double fault */
  faults: number;
  doubles: number;
}

/** Faults per serving player, in the order players first faulted. */
export function faultsByPlayer(m: Match): PlayerFaults[] {
  const rows = new Map<string, PlayerFaults>();
  for (const f of m.faultLog ?? []) {
    const r = rows.get(f.player) ?? { player: f.player, faults: 0, doubles: 0 };
    r.faults++;
    if (f.kind === 'double') r.doubles++;
    rows.set(f.player, r);
  }
  return [...rows.values()];
}

/** e.g. "Faults · Youssef 3 (1 double) · Lucas 1", or "No faults yet". */
export function faultLine(m: Match): string {
  const rows = faultsByPlayer(m);
  if (!rows.length) {
    // matches saved before faults were recorded per player only have team totals
    const f = m.faults ?? [0, 0];
    return f[0] || f[1]
      ? `Faults ${f.join(' – ')} · Double faults ${(m.doubleFaults ?? [0, 0]).join(' – ')}`
      : 'No faults yet';
  }
  const one = (r: PlayerFaults) => `${r.player} ${r.faults}${r.doubles ? ` (${r.doubles} double)` : ''}`;
  return `Faults · ${rows.map(one).join(' · ')}`;
}
