import type { AmericanoRound, AmericanoMatch } from '@/lib/types';

/**
 * Partner rotation for n players (n a multiple of 4): n-1 rounds, every player partners every other once.
 * Circle method makes the pairs; pairs are then matched against each other.
 */
export function americanoRounds(players: string[]): AmericanoRound[] {
  const n = players.length;
  if (n < 4 || n % 4) throw new Error('Americano needs 4, 8, 12 … players');
  const xs = [...players];
  const rounds: AmericanoRound[] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) pairs.push([xs[i], xs[n - 1 - i]]);
    const matches: AmericanoMatch[] = [];
    // rotate which pairs meet so opponents vary round to round
    const ps = r % 2 ? [...pairs.slice(1), pairs[0]] : pairs;
    for (let m = 0; m < ps.length / 2; m++)
      matches.push({ court: m + 1, a: ps[m], b: ps[ps.length - 1 - m], pointsA: 0, pointsB: 0 });
    rounds.push({ index: r, matches, locked: false });
    xs.splice(1, 0, xs.pop()!);
  }
  return rounds;
}

export interface AmericanoRow {
  name: string;
  played: number;
  pts: number;
  diff: number;
}

/** Total points, then point difference. Only locked rounds count. */
export function americanoBoard(players: string[], rounds: AmericanoRound[]): AmericanoRow[] {
  const rows = new Map<string, AmericanoRow>(players.map((name) => [name, { name, played: 0, pts: 0, diff: 0 }]));
  for (const r of rounds.filter((x) => x.locked))
    for (const m of r.matches)
      for (const [side, mine, theirs] of [
        [m.a, m.pointsA, m.pointsB],
        [m.b, m.pointsB, m.pointsA],
      ] as const)
        for (const p of side) {
          const row = rows.get(p)!;
          row.played++;
          row.pts += mine;
          row.diff += mine - theirs;
        }
  return [...rows.values()].sort((a, b) => b.pts - a.pts || b.diff - a.diff || a.name.localeCompare(b.name));
}

/** +/- stepper: each side stays >= 0 and the two never exceed the total. */
export function setAmericanoScore(m: AmericanoMatch, side: 'A' | 'B', delta: 1 | -1, total: number): AmericanoMatch {
  const key = side === 'A' ? 'pointsA' : 'pointsB';
  const other = side === 'A' ? m.pointsB : m.pointsA;
  const v = Math.min(total - other, Math.max(0, m[key] + delta));
  return { ...m, [key]: v };
}
