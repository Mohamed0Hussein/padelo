import { init, point, type MatchRules, type Team } from '@/engine';
import { DEFAULT_RANKING, type TMatch, type TeamRef, type Tournament } from '@/lib/types';
import { americanoBoard, americanoRounds, setAmericanoScore } from './americano';
import {
  buildFixtures,
  bracketOrder,
  drawGroups,
  fillKnockout,
  knockoutSkeleton,
  matchCount,
  propagate,
  roundRobin,
  tournamentChampion,
} from './draw';
import { groupStandings, qualifiers, resultFromState, standings } from './standings';

const rules: MatchRules = { bestOf: 3, games: 6, deuce: 'golden', tiebreak: true, superTb: true };
const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);
const teams = (n: number): TeamRef[] => ids(n).map((id) => ({ id, players: [`${id}a`, `${id}b`] }));
const win = (
  side: 0 | 1,
  sets: [number, number][] = [
    [6, 0],
    [6, 0],
  ],
) => ({
  sets: sets.map(([a, b]) => (side === 0 ? [a, b] : [b, a])) as [number, number][],
  winner: side,
  games: sets.reduce((g, [a, b]) => [g[0] + (side === 0 ? a : b), g[1] + (side === 0 ? b : a)], [0, 0]) as [
    number,
    number,
  ],
  golden: [0, 0] as [number, number],
  tiebreaks: [0, 0] as [number, number],
});

describe('draw', () => {
  it('splits 16 teams into 4 groups of 4 with seeds 1-4 apart', () => {
    const g = drawGroups(ids(16));
    expect(g.map((x) => x.length)).toEqual([4, 4, 4, 4]);
    expect(g.map((x) => x[0])).toEqual(['t1', 't2', 't3', 't4']);
    expect(new Set(g.flat()).size).toBe(16);
  });
  it('balances 10 teams into 3 groups', () => {
    expect(
      drawGroups(ids(10))
        .map((x) => x.length)
        .sort(),
    ).toEqual([3, 3, 4]);
  });
  it('round robin plays every pair once', () => {
    for (const n of [3, 4, 5, 6]) {
      const pairs = roundRobin(ids(n))
        .flat()
        .map(([a, b]) => [a, b].sort().join());
      expect(pairs).toHaveLength((n * (n - 1)) / 2);
      expect(new Set(pairs).size).toBe(pairs.length);
    }
  });
  it('bracket order keeps top seeds apart', () => {
    expect(bracketOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
  it('byes: 6 teams in an 8 bracket, top 2 seeds skip round 1', () => {
    const ko = fillKnockout(knockoutSkeleton(6), ids(6));
    const first = ko.filter((m) => m.round === 0);
    expect(
      first
        .filter((m) => m.bye)
        .map((m) => m.a ?? m.b)
        .sort(),
    ).toEqual(['t1', 't2']);
    expect(ko.find((m) => m.round === 1 && m.idx === 0)!.a).toBe('t1');
  });
  it('knockout winners propagate to the final', () => {
    let ko = fillKnockout(knockoutSkeleton(4), ids(4));
    ko = ko.map((m) => (m.round === 0 ? { ...m, result: win(0) } : m));
    ko = propagate(ko);
    const fin = ko.find((m) => m.round === 1)!;
    expect([fin.a, fin.b]).toEqual(['t1', 't2']);
    ko = propagate(ko.map((m) => (m.round === 1 ? { ...m, result: win(1) } : m)));
    expect(tournamentChampion({ matches: ko } as Tournament)).toBe('t2');
  });
  it('counts matches', () => {
    expect(matchCount('ROUND_ROBIN', 6)).toBe(15);
    expect(matchCount('KNOCKOUT', 8)).toBe(7);
    expect(matchCount('GROUPS_KNOCKOUT', 8)).toBe(12 + 3);
    expect(buildFixtures('GROUPS_KNOCKOUT', teams(8)).matches).toHaveLength(15);
  });
});

describe('standings & ranking order', () => {
  const m = (id: string, a: string, b: string, result: TMatch['result']): TMatch => ({
    id,
    stage: 'group',
    group: 'A',
    round: 0,
    idx: 0,
    roundLabel: 'R',
    a,
    b,
    result,
  });
  it('3 for a win, +1 for 2-0', () => {
    const rows = standings(['x', 'y'], [m('1', 'x', 'y', win(0))], DEFAULT_RANKING);
    expect(rows[0]).toMatchObject({ teamId: 'x', points: 4, won: 1 });
    expect(rows[1]).toMatchObject({ teamId: 'y', points: 0, lost: 1 });
  });
  it('no bonus for a 2-1 win', () => {
    const rows = standings(
      ['x', 'y'],
      [
        m(
          '1',
          'x',
          'y',
          win(0, [
            [6, 4],
            [3, 6],
            [10, 8],
          ]),
        ),
      ],
      DEFAULT_RANKING,
    );
    expect(rows[0].points).toBe(3);
  });
  it('equal points are split by set difference first', () => {
    // x, y, z each win one: x beats y 2-0 (6-4 6-4), y beats z 2-0 (6-0 6-0), z beats x 2-1.
    const ms = [
      m(
        '1',
        'x',
        'y',
        win(0, [
          [6, 4],
          [6, 4],
        ]),
      ),
      m(
        '2',
        'y',
        'z',
        win(0, [
          [6, 0],
          [6, 0],
        ]),
      ),
      m(
        '3',
        'z',
        'x',
        win(0, [
          [6, 4],
          [3, 6],
          [10, 8],
        ]),
      ),
    ];
    const rows = standings(['x', 'y', 'z'], ms, DEFAULT_RANKING);
    expect(rows.map((r) => r.teamId)).toEqual(['x', 'y', 'z']); // x,y tie on 4 pts; x set diff +1 vs y 0
  });
  it('head to head decides when everything else is equal', () => {
    const rules = { ...DEFAULT_RANKING, order: ['HEAD_TO_HEAD' as const] };
    const ms = [
      m(
        '1',
        'x',
        'y',
        win(0, [
          [6, 4],
          [6, 4],
        ]),
      ),
      m(
        '2',
        'y',
        'z',
        win(0, [
          [6, 4],
          [6, 4],
        ]),
      ),
      m(
        '3',
        'z',
        'x',
        win(0, [
          [6, 4],
          [6, 4],
        ]),
      ),
    ];
    // all equal on points; pairwise h2h is circular -> just assert deterministic & complete
    expect(standings(['x', 'y', 'z'], ms, rules)).toHaveLength(3);
    const two = standings(['x', 'y'], [m('1', 'y', 'x', win(0))], { ...rules, winPoints: 0, straightSetsBonus: 0 });
    expect(two[0].teamId).toBe('y');
  });
  it('order of criteria is respected', () => {
    // equal points; x has better game diff, y better golden points
    const base = { played: 0 };
    void base;
    const a = win(0, [
      [6, 4],
      [6, 4],
    ]);
    const b = win(0, [
      [6, 0],
      [6, 0],
    ]);
    const ms = [m('1', 'x', 'p', b), m('2', 'y', 'q', a)];
    expect(
      standings(['x', 'y', 'p', 'q'], ms, {
        ...DEFAULT_RANKING,
        order: ['GAME_DIFF', 'GOLDEN_POINTS', 'SET_DIFF', 'GAMES_WON', 'HEAD_TO_HEAD'],
      })[0].teamId,
    ).toBe('x');
    const g1 = { ...a, golden: [3, 0] as [number, number] };
    const ms2 = [m('1', 'x', 'p', b), m('2', 'y', 'q', g1)];
    expect(
      standings(['x', 'y', 'p', 'q'], ms2, {
        ...DEFAULT_RANKING,
        order: ['GOLDEN_POINTS', 'GAME_DIFF', 'SET_DIFF', 'GAMES_WON', 'HEAD_TO_HEAD'],
      })[0].teamId,
    ).toBe('y');
  });
  it('qualifiers: winners then runners-up, group order', () => {
    const t = {
      groups: [
        { name: 'A', teamIds: ['a1', 'a2'] },
        { name: 'B', teamIds: ['b1', 'b2'] },
      ],
      rankingRules: DEFAULT_RANKING,
      matches: [m('1', 'a1', 'a2', win(0)), { ...m('2', 'b1', 'b2', win(0)), group: 'B' }],
    } as unknown as Tournament;
    expect(groupStandings(t, 'A')[0].teamId).toBe('a1');
    expect(qualifiers(t)).toEqual(['a1', 'b1', 'a2', 'b2']);
  });
});

describe('resultFromState', () => {
  it('summarises sets, games, tiebreaks, golden points', () => {
    let s = init(rules, ['A', 'B']);
    for (let i = 0; i < 24; i++) s = point(s, 0 as Team); // 6-0
    for (let i = 0; i < 24; i++) s = point(s, 0 as Team); // 6-0 -> match
    const r = resultFromState(s);
    expect(r).toMatchObject({ winner: 0, games: [12, 0], tiebreaks: [0, 0] });
    expect(r.sets).toEqual([
      [6, 0],
      [6, 0],
    ]);
  });
});

describe('americano', () => {
  it.each([4, 8, 12, 16])('%i players: everyone partners everyone exactly once', (n) => {
    const players = Array.from({ length: n }, (_, i) => `p${i}`);
    const rounds = americanoRounds(players);
    expect(rounds).toHaveLength(n - 1);
    const partners = new Set<string>();
    for (const r of rounds) {
      const seen = new Set<string>();
      for (const m of r.matches)
        for (const side of [m.a, m.b]) {
          partners.add([...side].sort().join());
          side.forEach((p) => {
            expect(seen.has(p)).toBe(false);
            seen.add(p);
          });
        }
      expect(seen.size).toBe(n); // everyone plays every round
    }
    expect(partners.size).toBe((n * (n - 1)) / 2);
  });
  it('rejects bad player counts', () => {
    expect(() => americanoRounds(['a', 'b', 'c'])).toThrow();
  });
  it('leaderboard: points, then diff; unlocked rounds ignored', () => {
    const players = ['a', 'b', 'c', 'd'];
    const rounds = americanoRounds(players);
    rounds[0].matches[0] = { ...rounds[0].matches[0], pointsA: 14, pointsB: 10 };
    expect(americanoBoard(players, rounds).every((r) => r.pts === 0)).toBe(true);
    rounds[0].locked = true;
    const board = americanoBoard(players, rounds);
    expect(board.slice(0, 2).map((r) => r.pts)).toEqual([14, 14]);
    expect(board[0].diff).toBe(4);
    expect(board[3].diff).toBe(-4);
  });
  it('stepper caps the total', () => {
    let m = { court: 1, a: ['a', 'b'], b: ['c', 'd'], pointsA: 20, pointsB: 0 } as ReturnType<
      typeof americanoRounds
    >[0]['matches'][0];
    m = setAmericanoScore(m, 'B', 1, 24);
    m = setAmericanoScore(m, 'B', 1, 24);
    m = setAmericanoScore(m, 'B', 1, 24);
    m = setAmericanoScore(m, 'B', 1, 24);
    m = setAmericanoScore(m, 'B', 1, 24);
    expect(m.pointsB).toBe(4);
    expect(setAmericanoScore({ ...m, pointsA: 0, pointsB: 0 }, 'A', -1, 24).pointsA).toBe(0);
  });
});
