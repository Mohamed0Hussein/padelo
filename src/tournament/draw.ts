import type { Format, TMatch, TeamRef, Tournament } from '@/lib/types';

export const GROUP_NAMES = 'ABCDEFGHIJKLMNOP';

/** Fisher–Yates; rnd injectable for tests. */
export function shuffle<T>(xs: T[], rnd: () => number = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Groups of ~4. Teams are in seed order; snake distribution keeps seeds 1..G in different groups. */
export function drawGroups(teamIds: string[]): string[][] {
  const g = Math.max(1, Math.round(teamIds.length / 4));
  const groups: string[][] = Array.from({ length: g }, () => []);
  teamIds.forEach((id, i) => {
    const row = Math.floor(i / g);
    const col = i % g;
    groups[row % 2 === 0 ? col : g - 1 - col].push(id);
  });
  return groups;
}

/** Circle-method round robin. Returns rounds of [a, b] pairs (byes dropped). */
export function roundRobin(ids: string[]): [string, string][][] {
  const xs: (string | null)[] = ids.length % 2 ? [...ids, null] : [...ids];
  const n = xs.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = xs[i];
      const b = xs[n - 1 - i];
      if (a && b) round.push(r % 2 && i === 0 ? [b, a] : [a, b]);
    }
    rounds.push(round);
    xs.splice(1, 0, xs.pop()!);
  }
  return rounds;
}

/** Standard bracket slot order for `size` (power of 2): 1v16, 8v9, … so top seeds meet late. */
export function bracketOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order;
}

export function koRoundLabel(roundsLeft: number): string {
  return ['Final', 'Semi-finals', 'Quarter-finals'][roundsLeft - 1] ?? `Round of ${2 ** roundsLeft}`;
}

/** Empty knockout skeleton for `slots` qualifiers: all rounds, nobody placed yet. */
export function knockoutSkeleton(slots: number): TMatch[] {
  const size = 2 ** Math.max(1, Math.ceil(Math.log2(Math.max(2, slots))));
  const rounds = Math.log2(size);
  const out: TMatch[] = [];
  for (let r = 0; r < rounds; r++)
    for (let i = 0; i < size / 2 ** (r + 1); i++)
      out.push({
        id: `ko-${r}-${i}`,
        stage: 'ko',
        round: r,
        idx: i,
        roundLabel: koRoundLabel(rounds - r),
        a: null,
        b: null,
      });
  return out;
}

/** Places seeds (best first) into round 0; missing seeds become byes. Pure: returns new array. */
export function fillKnockout(ko: TMatch[], seeds: string[]): TMatch[] {
  const first = ko.filter((m) => m.round === 0);
  const size = first.length * 2;
  const order = bracketOrder(size);
  const next = ko.map((m) => ({ ...m }));
  first.forEach((m, i) => {
    const a = seeds[order[2 * i] - 1] ?? null;
    const b = seeds[order[2 * i + 1] - 1] ?? null;
    const t = next.find((x) => x.id === m.id)!;
    t.a = a;
    t.b = b;
    t.bye = !a || !b ? true : undefined;
  });
  return propagate(next);
}

/** Pushes winners (and bye advancers) into the next round. Idempotent. */
export function propagate(ko: TMatch[]): TMatch[] {
  const next = ko.map((m) => ({ ...m }));
  const rounds = Math.max(-1, ...next.map((m) => m.round));
  const winnerOf = (m: TMatch): string | null => {
    if (m.bye) return m.a ?? m.b;
    if (!m.result) return null;
    return m.result.winner === 0 ? m.a : m.b;
  };
  for (let r = 1; r <= rounds; r++) {
    for (const m of next.filter((x) => x.round === r)) {
      const [pa, pb] = [2 * m.idx, 2 * m.idx + 1].map((i) => next.find((x) => x.round === r - 1 && x.idx === i)!);
      const a = winnerOf(pa);
      const b = winnerOf(pb);
      if (m.a !== a || m.b !== b) {
        m.a = a;
        m.b = b;
        delete m.result;
        delete m.matchId;
      }
    }
  }
  return next;
}

export function tournamentChampion(t: Tournament): string | null {
  const ko = t.matches.filter((m) => m.stage === 'ko');
  if (!ko.length) return null;
  const last = ko.reduce((p, m) => (m.round > p.round ? m : p));
  if (!last.result) return null;
  return last.result.winner === 0 ? last.a : last.b;
}

/** Builds all fixtures for a new tournament (not Americano). */
export function buildFixtures(
  format: Exclude<Format, 'AMERICANO'>,
  teams: TeamRef[],
): { groups: Tournament['groups']; matches: TMatch[] } {
  const ids = teams.map((t) => t.id);
  const matches: TMatch[] = [];
  let groups: Tournament['groups'] = [];
  if (format === 'KNOCKOUT') {
    const ko = fillKnockout(knockoutSkeleton(ids.length), ids);
    return { groups, matches: ko };
  }
  const parts = format === 'ROUND_ROBIN' ? [ids] : drawGroups(ids);
  groups = parts.map((teamIds, i) => ({ name: GROUP_NAMES[i], teamIds }));
  groups.forEach((g) => {
    roundRobin(g.teamIds).forEach((round, r) =>
      round.forEach(([a, b], i) =>
        matches.push({
          id: `g${g.name}-${r}-${i}`,
          stage: 'group',
          group: g.name,
          round: r,
          idx: i,
          roundLabel: `Round ${r + 1}`,
          a,
          b,
        }),
      ),
    );
  });
  if (format === 'GROUPS_KNOCKOUT') matches.push(...knockoutSkeleton(groups.length * 2));
  return { groups, matches };
}

export function groupStageDone(t: Tournament): boolean {
  const g = t.matches.filter((m) => m.stage === 'group');
  return g.every((m) => m.result);
}

export function matchCount(format: Format, teams: number): number {
  if (format === 'AMERICANO') return Math.floor(teams / 4) * (teams - 1);
  if (format === 'KNOCKOUT') return teams - 1;
  const g = Math.max(1, Math.round(teams / 4));
  const rr = (n: number) => (n * (n - 1)) / 2;
  if (format === 'ROUND_ROBIN') return rr(teams);
  let total = 0;
  for (let i = 0; i < g; i++) total += rr(Math.floor(teams / g) + (i < teams % g ? 1 : 0));
  return total + g * 2 - 1;
}
