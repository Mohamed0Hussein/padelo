import type { TMatch, Tournament } from '@/lib/types';
import { teamLabel } from '@/lib/util';
import { tournamentChampion } from './draw';
import { standings } from './standings';

export const teamName = (t: Tournament, id: string | null) => {
  const team = t.teams.find((x) => x.id === id);
  return team ? teamLabel(team) : 'TBD';
};

export const playable = (m: TMatch) => !!m.a && !!m.b && !m.bye && !m.result;

/** Group stage first, then knockout by round. */
export const orderedSlots = (t: Tournament) =>
  [...t.matches].sort((x, y) =>
    x.stage === y.stage ? x.round - y.round || x.idx - y.idx : x.stage === 'group' ? -1 : 1,
  );

export const nextSlot = (t: Tournament) => orderedSlots(t).find(playable);

export const scoreText = (m: TMatch) => (m.result ? m.result.sets.map((s) => s.join('–')).join('  ') : '');

export function progress(t: Tournament) {
  if (t.format === 'AMERICANO') return { done: t.rounds!.filter((r) => r.locked).length, total: t.rounds!.length };
  const real = t.matches.filter((m) => !m.bye);
  return { done: real.filter((m) => m.result).length, total: real.length };
}

/** Final placings: champion, runner-up, then by knockout depth, then group/league standings. */
export function placings(t: Tournament): string[] {
  const all = t.teams.map((x) => x.id);
  const group = t.matches.filter((m) => m.stage === 'group');
  const rank = new Map<string, number>();
  t.groups.forEach((g) =>
    standings(
      g.teamIds,
      group.filter((m) => m.group === g.name),
      t.rankingRules,
    ).forEach((r, i) => rank.set(r.teamId, i)),
  );
  const depth = new Map<string, number>();
  for (const m of t.matches.filter((x) => x.stage === 'ko'))
    for (const id of [m.a, m.b]) if (id) depth.set(id, Math.max(depth.get(id) ?? 0, m.round + 1));
  const champ = tournamentChampion(t);
  const finalists = t.matches.filter((m) => m.stage === 'ko').sort((a, b) => b.round - a.round)[0] ?? null;
  const runner = champ && finalists ? (finalists.a === champ ? finalists.b : finalists.a) : null;
  const rest = all
    .filter((id) => id !== champ && id !== runner)
    .sort((a, b) => (depth.get(b) ?? 0) - (depth.get(a) ?? 0) || (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
  return [champ, runner, ...rest].filter(Boolean) as string[];
}

export function toCsv(t: Tournament): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [['Stage', 'Round', 'Team A', 'Team B', 'Score', 'Winner'].join(',')];
  for (const m of orderedSlots(t).filter((x) => !x.bye)) {
    rows.push(
      [
        m.stage === 'group' ? `Group ${m.group}` : 'Knockout',
        m.roundLabel,
        teamName(t, m.a),
        teamName(t, m.b),
        scoreText(m),
        m.result ? teamName(t, m.result.winner === 0 ? m.a : m.b) : '',
      ]
        .map(esc)
        .join(','),
    );
  }
  return rows.join('\n');
}
