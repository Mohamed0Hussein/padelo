import fixtures from '../../reference/scoring-fixtures.json';
import {
  banner,
  init,
  point,
  pointWinners,
  removePoint,
  undo,
  type MatchRules,
  type ScoringState,
  type Team,
} from './index';

const play = (rules: MatchRules, points: string): ScoringState =>
  [...points].reduce((s, c) => point(s, (c === 'A' ? 0 : 1) as Team), init(rules, ['A', 'B']));

describe.each(fixtures)('fixture: $name', ({ rules, points, expect: e }) => {
  const s = play(rules as MatchRules, points);
  it('matches expected state', () => {
    expect({
      sets: s.sets,
      games: s.games,
      points: s.points,
      tiebreak: s.tiebreak,
      superTiebreak: s.superTiebreak,
      server: s.server,
      winner: s.winner,
      deuceCount: s.deuceCount,
      changeEnds: s.changeEnds,
      lastLog: s.log[0].text,
      banner: banner(s).text,
    }).toEqual(e);
  });
  it('undoing every point returns to the start', () => {
    let u = s;
    for (let i = 0; i < points.length; i++) u = undo(u);
    expect(u).toEqual(init(rules as MatchRules, ['A', 'B']));
  });
});

describe('engine behaviour', () => {
  const rules: MatchRules = { bestOf: 3, games: 6, deuce: 'golden', tiebreak: true, superTb: true };
  it('is immutable', () => {
    const s0 = init(rules, ['A', 'B']);
    const frozen = JSON.stringify(s0);
    point(s0, 0);
    expect(JSON.stringify(s0)).toBe(frozen);
  });
  it('ignores points after the match is over', () => {
    const s = play({ ...rules, bestOf: 1 }, 'AAAA'.repeat(6));
    expect(s.winner).toBe(0);
    expect(point(s, 1)).toBe(s);
  });
  it('undo with empty history is a no-op', () => {
    const s = init(rules);
    expect(undo(s)).toBe(s);
  });
  it('caps the log at 40 entries', () => {
    expect(play(rules, 'A'.repeat(50)).log).toHaveLength(40);
  });
});

describe('removePoint (hold on a pad)', () => {
  const toTeams = (points: string) => [...points].map((c) => (c === 'A' ? 0 : 1) as Team);

  it('pointWinners recovers the order of every point', () => {
    for (const f of fixtures) expect(pointWinners(play(f.rules as MatchRules, f.points))).toEqual(toTeams(f.points));
  });

  it.each(fixtures.map((f) => [f.name, f] as const))(
    '%s: same as never having played that team’s last point',
    (_name, f) => {
      const rules = f.rules as MatchRules;
      for (const team of [0, 1] as Team[]) {
        const seq = toTeams(f.points);
        const i = seq.lastIndexOf(team);
        if (i < 0) continue;
        const expected = play(
          rules,
          seq
            .filter((_, k) => k !== i)
            .map((t) => 'AB'[t])
            .join(''),
        );
        expect(removePoint(play(rules, f.points), team)).toEqual(expected);
      }
    },
  );

  it('removes an earlier point when the other team scored after it', () => {
    const rules: MatchRules = { bestOf: 3, games: 6, deuce: 'golden', tiebreak: true, superTb: true };
    const s = removePoint(play(rules, 'AAB'), 0); // 30–15 → 15–15
    expect(s.points).toEqual([1, 1]);
    expect(undo(s).points).toEqual([1, 0]); // undo history is rebuilt
  });

  it('returns the same state when the team has no points', () => {
    const rules: MatchRules = { bestOf: 3, games: 6, deuce: 'golden', tiebreak: true, superTb: true };
    const s = play(rules, 'AAA');
    expect(removePoint(s, 1)).toBe(s);
    expect(removePoint(init(rules), 0)).toEqual(init(rules));
  });
});
