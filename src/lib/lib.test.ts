import { init, point, type MatchRules, type Team } from '@/engine';
import { servingPlayer } from '@/lib/scoring';
import { headToHead, knownTeams, playerNames, playerStats } from '@/lib/stats';
import { publicSnapshot, StubSync } from '@/lib/sync';
import { DEFAULT_RANKING, type Match, type MatchResult, type TeamRef, type Tournament } from '@/lib/types';
import { firstName, initials, mmss, playerId, teamLabel, timeAgo, uid } from '@/lib/util';
import { buildFixtures } from '@/tournament/draw';
import { nextSlot, orderedSlots, placings, playable, progress, scoreText, teamName, toCsv } from '@/tournament/util';

const rules: MatchRules = { bestOf: 3, games: 6, deuce: 'golden', tiebreak: true, superTb: true };
const team = (id: string, a: string, b: string): TeamRef => ({ id, players: [a, b] });
const res = (winner: 0 | 1, sets: [number, number][], extra: Partial<MatchResult> = {}): MatchResult => ({
  sets,
  winner,
  games: sets.reduce<[number, number]>((g, [a, b]) => [g[0] + a, g[1] + b], [0, 0]),
  golden: [0, 0],
  tiebreaks: [0, 0],
  ...extra,
});
const match = (teams: [TeamRef, TeamRef], result: MatchResult | undefined, endedAt = 1): Match => ({
  id: uid(),
  teams,
  rules,
  state: init(rules),
  startedAt: 0,
  endedAt: result ? endedAt : undefined,
  result,
});

describe('util', () => {
  it('initials: first two words, upper case, fallback ?', () => {
    expect(initials('  youssef ali ben ')).toBe('YA');
    expect(initials('sara')).toBe('S');
    expect(initials('   ')).toBe('?');
  });
  it('firstName, playerId, teamLabel', () => {
    expect(firstName('  Omar  Khaled')).toBe('Omar');
    expect(playerId('  Omar Khaled ')).toBe('omar khaled');
    expect(teamLabel(team('x', 'A', 'B'))).toBe('A / B');
    expect(teamLabel({ id: 'x', players: ['A', ''] })).toBe('A');
  });
  it('uid is unique', () => {
    expect(new Set(Array.from({ length: 200 }, uid)).size).toBe(200);
  });
  it('timeAgo buckets', () => {
    const ago = (ms: number) => timeAgo(Date.now() - ms);
    const MIN = 60000;
    expect(ago(30_000)).toBe('Just now');
    expect(ago(5 * MIN)).toBe('5 min ago');
    expect(ago(3 * 60 * MIN)).toBe('3 h ago');
    expect(ago(25 * 60 * MIN)).toBe('Yesterday');
    expect(ago(3 * 24 * 60 * MIN)).toBe('3 days ago');
  });
  it('mmss formats minutes and hours', () => {
    expect(mmss(5 * 60000)).toBe('5 min');
    expect(mmss(125 * 60000)).toBe('2h 05m');
  });
});

describe('stats', () => {
  const ab = team('ab', 'Ali', 'Badr');
  const cd = team('cd', 'Carl', 'Dani');
  const ae = team('ae', 'ali ', 'Eve'); // same player, different spelling
  const ms = [
    match(
      [ab, cd],
      res(
        0,
        [
          [6, 4],
          [7, 6],
        ],
        { golden: [2, 1], tiebreaks: [1, 0] },
      ),
      3,
    ),
    match(
      [cd, ab],
      res(0, [
        [6, 2],
        [3, 6],
        [10, 8],
      ]),
      2,
    ),
    match(
      [ae, cd],
      res(0, [
        [6, 0],
        [6, 0],
      ]),
      1,
    ),
    match([ab, cd], undefined), // live: ignored
  ];

  it('playerNames dedupes by trimmed, case-insensitive name and sorts', () => {
    expect(playerNames(ms, ['Zed', ' '])).toEqual(['Ali', 'Badr', 'Carl', 'Dani', 'Eve', 'Zed']);
  });
  it('playerStats sums sets, games, golden, tiebreaks; form newest first; partners', () => {
    const s = playerStats(ms, 'ALI');
    expect(s.played).toBe(3);
    expect(s.won).toBe(2);
    expect([s.setsWon, s.setsLost]).toEqual([5, 2]);
    expect([s.gamesWon, s.gamesLost]).toEqual([6 + 7 + 2 + 6 + 8 + 12, 4 + 6 + 6 + 3 + 10]);
    expect(s.golden).toBe(2);
    expect(s.tiebreaks).toBe(1);
    expect(s.form).toEqual(['W', 'L', 'W']);
    expect(s.partners).toEqual([
      { name: 'Badr', played: 2, won: 1 },
      { name: 'Eve', played: 1, won: 1 },
    ]);
  });
  it('knownTeams lists distinct finished pairs', () => {
    expect(
      knownTeams(ms)
        .map((t) => t.id)
        .sort(),
    ).toEqual(['ab', 'ae', 'cd']);
  });
  it('headToHead counts both orientations and ignores other pairs', () => {
    const h = headToHead(ms, team('x', 'Badr', 'Ali'), cd);
    expect(h.meetings).toHaveLength(2);
    expect([h.a.won, h.b.won]).toEqual([1, 1]);
    expect([h.a.setsWon, h.b.setsWon]).toEqual([3, 2]);
    expect(h.meetings[0].endedAt).toBe(3);
  });
});

describe('servingPlayer', () => {
  const golden: MatchRules = { ...rules, deuce: 'golden' };
  const m = (games: number): Match => {
    let s = init(golden, ['A', 'B']);
    for (let i = 0; i < games * 4; i++) s = point(s, (i % 8 < 4 ? 0 : 1) as Team);
    return { ...match([team('a', 'A1', 'A2'), team('b', 'B1', 'B2')], undefined), state: s };
  };
  it('alternates teams each game and players within a team', () => {
    expect([0, 1, 2, 3, 4].map((g) => servingPlayer(m(g)))).toEqual(['A1', 'B1', 'A2', 'B2', 'A1']);
  });
});

describe('sync', () => {
  const t = {
    id: 'T1',
    name: 'Cup',
    groups: [{ name: 'A', teamIds: ['a'] }],
    matches: [
      { id: 'm', stage: 'group', round: 0, idx: 0, roundLabel: 'R1', a: 'a', b: 'b', court: 'C1', matchId: 'x' },
    ],
  } as unknown as Tournament;
  const off = { liveScores: false, tables: false, bracket: false, courts: false };
  it('publicSnapshot hides what is switched off', () => {
    const s = publicSnapshot(t, off);
    expect(s.groups).toBeUndefined();
    expect(s.matches).toBeUndefined();
  });
  it('publicSnapshot exposes only public match fields', () => {
    const s = publicSnapshot(t, { ...off, tables: true, bracket: true });
    expect(s.groups).toEqual(t.groups);
    expect(Object.keys(s.matches![0]).sort()).toEqual(['a', 'b', 'group', 'id', 'result', 'roundLabel', 'stage']);
  });
  it('StubSync returns a link for the tournament', async () => {
    await expect(StubSync.start(publicSnapshot(t, off))).resolves.toEqual({ url: expect.stringContaining('T1') });
  });
});

describe('tournament util', () => {
  const teams = [team('t1', 'Al "Ace"', 'Bo'), team('t2', 'Cy', 'Di'), team('t3', 'Ed', 'Fi')];
  const ko = (): Tournament => ({
    id: 'k',
    name: 'K',
    date: '',
    venue: '',
    format: 'KNOCKOUT',
    rules,
    rankingRules: DEFAULT_RANKING,
    teams,
    courts: [],
    autoAssign: false,
    createdAt: 0,
    ...buildFixtures('KNOCKOUT', teams),
  });

  it('3-team knockout: one bye, two real matches, semi first', () => {
    const t = ko();
    expect(progress(t)).toEqual({ done: 0, total: 2 });
    const next = nextSlot(t)!;
    expect(next.round).toBe(0);
    expect(playable(next)).toBe(true);
    expect(orderedSlots(t).map((m) => m.round)).toEqual([0, 0, 1]);
    expect(teamName(t, null)).toBe('TBD');
  });

  it('placings, scoreText and CSV after the final', () => {
    const t = ko();
    const semi = t.matches.find((m) => m.round === 0 && !m.bye)!;
    semi.result = res(1, [
      [4, 6],
      [3, 6],
    ]);
    const semiWinner = semi.b!;
    const final = t.matches.find((m) => m.round === 1)!;
    final.a = final.a ?? semiWinner;
    final.b = final.b ?? semiWinner;
    final.result = res(0, [
      [6, 1],
      [6, 1],
    ]);
    expect(placings(t)[0]).toBe(final.a);
    expect(placings(t)[1]).toBe(final.b);
    expect(placings(t)).toHaveLength(3);
    expect(scoreText(final)).toBe('6–1  6–1');
    const csv = toCsv(t).split('\n');
    expect(csv[0]).toBe('Stage,Round,Team A,Team B,Score,Winner');
    expect(csv).toHaveLength(3); // header + 2 real matches, bye skipped
    expect(toCsv(t)).toContain('"Al ""Ace"" / Bo"');
  });
});
