/**
 * Integration tests: store + engine + tournament logic + persistence, with SQLite swapped for an in-memory map.
 */
import type { MatchRules, Team } from '@/engine';
import { DEFAULT_RANKING, type TeamRef, type Tournament } from '@/lib/types';
import { americanoBoard } from '@/tournament/americano';
import { tournamentChampion } from '@/tournament/draw';
import { qualifiers } from '@/tournament/standings';
import { nextSlot, placings, progress } from '@/tournament/util';
import { DEFAULT_SETTINGS, finishedMatches, liveMatches, useApp } from './index';

const mockDocs = new Map<string, string>();
jest.mock('@/db', () => ({
  openDb: async () => {},
  loadAll: async (kind: string) =>
    [...mockDocs].filter(([k]) => k.startsWith(`${kind}/`)).map(([, json]) => JSON.parse(json)),
  saveDoc: (kind: string, id: string, doc: unknown) => mockDocs.set(`${kind}/${id}`, JSON.stringify(doc)),
  deleteDoc: (kind: string, id: string) => mockDocs.delete(`${kind}/${id}`),
}));

const quick: MatchRules = { bestOf: 1, games: 4, deuce: 'golden', tiebreak: true, superTb: false };
const teams = (n: number): TeamRef[] =>
  Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, players: [`P${i + 1}a`, `P${i + 1}b`] }));
const app = () => useApp.getState();
const docs = (kind: string) => [...mockDocs.keys()].filter((k) => k.startsWith(`${kind}/`));

/** Scores points for `team` until the match has a winner. */
const winMatch = (id: string, team: Team) => {
  while (app().matches[id].state.winner < 0) app().score(id, team);
};

const newTournament = (format: Tournament['format'], n: number, extra: Partial<Tournament> = {}) =>
  app().createTournament({
    name: 'Cup',
    date: '2026-11-21',
    venue: 'Club',
    format,
    rules: quick,
    rankingRules: DEFAULT_RANKING,
    teams: teams(n),
    ...extra,
  });

/** Starts, wins (side `a` always wins) and saves the slot. */
const playSlot = (tid: string, slotId: string, team: Team = 0) => {
  const id = app().startSlot(tid, slotId)!;
  winMatch(id, team);
  app().endAndSave(id);
  return id;
};

beforeEach(() => {
  mockDocs.clear();
  useApp.setState({ ready: false, settings: DEFAULT_SETTINGS, matches: {}, tournaments: {} });
});

describe('single match flow', () => {
  const start = (rules = quick) =>
    app().startMatch(
      [
        { id: 'a', players: ['Ali', 'Badr'] },
        { id: 'b', players: ['Carl', 'Dani'] },
      ],
      rules,
    );

  it('start → score → undo → end & save, persisted after each step', () => {
    const id = start();
    expect(liveMatches(app().matches).map((m) => m.id)).toEqual([id]);
    expect(app().matches[id].state.names).toEqual(['Ali / Badr', 'Carl / Dani']);

    app().score(id, 0);
    app().score(id, 0);
    expect(app().matches[id].state.points).toEqual([2, 0]);
    app().undoPoint(id);
    expect(app().matches[id].state.points).toEqual([1, 0]);
    expect(JSON.parse(mockDocs.get(`match/${id}`)!).state.points).toEqual([1, 0]);

    winMatch(id, 1);
    app().endAndSave(id);
    const m = app().matches[id];
    expect(m.endedAt).toBeDefined();
    expect(m.result).toMatchObject({ winner: 1, sets: [[0, 4]] });
    expect(finishedMatches(app().matches)).toHaveLength(1);
    expect(liveMatches(app().matches)).toHaveLength(0);

    // a saved match is frozen
    const before = app().matches[id];
    app().score(id, 0);
    app().endAndSave(id);
    expect(app().matches[id]).toBe(before);
  });

  it('fault, double fault and undo of a double fault', () => {
    const id = start();
    app().fault(id); // first serve out
    expect(app().matches[id]).toMatchObject({ pendingFault: true, faults: [1, 0] });
    app().fault(id); // double fault: point to receivers
    expect(app().matches[id]).toMatchObject({ pendingFault: false, faults: [2, 0], doubleFaults: [1, 0] });
    expect(app().matches[id].state.points).toEqual([0, 1]);
    app().undoPoint(id); // back to "first serve was a fault"
    expect(app().matches[id]).toMatchObject({ pendingFault: true, faults: [1, 0], doubleFaults: [0, 0] });
    expect(app().matches[id].state.points).toEqual([0, 0]);
    app().undoPoint(id); // clears the pending fault
    expect(app().matches[id]).toMatchObject({ pendingFault: false, faults: [0, 0] });
  });

  it('switching to golden point while a team has Ad goes back to 40–40', () => {
    const id = start({ ...quick, deuce: 'adv' });
    for (const t of [0, 1, 0, 1, 0, 1, 0] as Team[]) app().score(id, t);
    expect(app().matches[id].state.points).toEqual([4, 3]);
    app().setMatchRules(id, { ...quick, deuce: 'golden' });
    expect(app().matches[id].state.points).toEqual([3, 3]);
    expect(app().matches[id].rules.deuce).toBe('golden');
    app().score(id, 1);
    expect(app().matches[id].state.games).toEqual([0, 1]);
  });

  it('restart clears the score and the result', () => {
    const id = start();
    winMatch(id, 0);
    app().endAndSave(id);
    app().restart(id);
    const m = app().matches[id];
    expect(m.endedAt).toBeUndefined();
    expect(m.result).toBeUndefined();
    expect(m.state.winner).toBe(-1);
    expect(m.state.history).toHaveLength(0);
  });

  it('delete removes from store and DB', () => {
    const id = start();
    app().deleteMatch(id);
    expect(app().matches[id]).toBeUndefined();
    expect(docs('match')).toHaveLength(0);
  });

  it('hydrate restores settings, matches and tournaments from the DB', async () => {
    const id = start();
    app().score(id, 0);
    app().setSettings({ theme: 'dark', onboarded: true });
    const tid = newTournament('KNOCKOUT', 4);

    useApp.setState({ ready: false, settings: DEFAULT_SETTINGS, matches: {}, tournaments: {} });
    await app().hydrate();

    expect(app().ready).toBe(true);
    expect(app().settings).toMatchObject({ theme: 'dark', onboarded: true, volumeKeys: true });
    expect(app().matches[id].state.points).toEqual([1, 0]);
    expect(app().tournaments[tid].matches).toHaveLength(3);
  });
});

describe('knockout tournament flow', () => {
  it('winners move up, final uses final rules, champion and placings come out', () => {
    const finalRules: MatchRules = { ...quick, games: 6 };
    const tid = newTournament('KNOCKOUT', 4, { finalRules, courtCount: 3 } as Partial<Tournament>);
    const t0 = app().tournaments[tid];
    expect(t0.courts.map((c) => c.name)).toEqual(['Court 1', 'Court 2', 'Court 3']);

    const semis = t0.matches.filter((m) => m.round === 0);
    expect(semis).toHaveLength(2);
    playSlot(tid, semis[0].id, 0);
    playSlot(tid, semis[1].id, 1);

    const t1 = app().tournaments[tid];
    const final = t1.matches.find((m) => m.round === 1)!;
    expect(final.a).toBe(semis[0].a);
    expect(final.b).toBe(semis[1].b);
    expect(progress(t1)).toEqual({ done: 2, total: 3 });

    const fid = app().startSlot(tid, final.id)!;
    expect(app().matches[fid].rules).toEqual(finalRules);
    expect(app().matches[fid].roundLabel).toBe('Final');
    // starting the same slot again resumes the live match
    expect(app().startSlot(tid, final.id)).toBe(fid);
    winMatch(fid, 0);
    app().endAndSave(fid);

    const t2 = app().tournaments[tid];
    expect(tournamentChampion(t2)).toBe(semis[0].a);
    expect(placings(t2).slice(0, 2)).toEqual([semis[0].a, semis[1].b]);
    expect(nextSlot(t2)).toBeUndefined();
    expect(JSON.parse(mockDocs.get(`tournament/${tid}`)!).matches).toEqual(t2.matches);
  });

  it('cannot start a slot whose teams are not decided yet', () => {
    const tid = newTournament('KNOCKOUT', 4);
    const final = app().tournaments[tid].matches.find((m) => m.round === 1)!;
    expect(app().startSlot(tid, final.id)).toBeNull();
  });
});

describe('groups + knockout flow', () => {
  it('knockout fills from group qualifiers when the last group match is saved', () => {
    const tid = newTournament('GROUPS_KNOCKOUT', 8);
    const t0 = app().tournaments[tid];
    expect(t0.groups).toHaveLength(2);
    const group = t0.matches.filter((m) => m.stage === 'group');
    expect(group).toHaveLength(12);

    for (const m of group.slice(0, -1)) playSlot(tid, m.id);
    const ko = () => app().tournaments[tid].matches.filter((m) => m.stage === 'ko');
    expect(ko().every((m) => !m.a && !m.b)).toBe(true);

    playSlot(tid, group[group.length - 1].id);
    const t1 = app().tournaments[tid];
    const semis = ko().filter((m) => m.round === 0);
    expect(semis.flatMap((m) => [m.a, m.b]).sort()).toEqual([...qualifiers(t1)].sort());
    expect(semis.every((m) => m.a && m.b && !m.bye)).toBe(true);
    expect(semis[0].roundLabel).toBe('Semi-finals');

    // every group match is linked to a saved match
    expect(t1.matches.filter((m) => m.stage === 'group').every((m) => m.result && m.matchId)).toBe(true);
    expect(finishedMatches(app().matches)).toHaveLength(12);

    // play out the knockout
    while (nextSlot(app().tournaments[tid])) playSlot(tid, nextSlot(app().tournaments[tid])!.id);
    const done = app().tournaments[tid];
    expect(tournamentChampion(done)).not.toBeNull();
    expect(progress(done)).toEqual({ done: 15, total: 15 });
    expect(placings(done)).toHaveLength(8);
  });
});

describe('americano flow', () => {
  it('create → enter scores → lock → leaderboard', () => {
    const players = Array.from({ length: 8 }, (_, i) => `P${i + 1}`);
    const tid = newTournament('AMERICANO', 0, { players, pointsPerMatch: 24 });
    const t = app().tournaments[tid];
    expect(t.rounds).toHaveLength(7);
    expect(t.matches).toHaveLength(0);

    const [m0, m1] = t.rounds![0].matches;
    app().setAmericanoScore(tid, 0, 0, { ...m0, pointsA: 15, pointsB: 9 });
    app().setAmericanoScore(tid, 0, 1, { ...m1, pointsA: 12, pointsB: 12 });
    // unlocked rounds do not count yet
    expect(americanoBoard(players, app().tournaments[tid].rounds!)[0].pts).toBe(0);

    app().lockAmericanoRound(tid, 0);
    const after = app().tournaments[tid];
    expect(after.rounds![0].locked).toBe(true);
    expect(after.rounds![1].locked).toBe(false);
    expect(progress(after)).toEqual({ done: 1, total: 7 });
    const board = americanoBoard(players, after.rounds!);
    expect(
      board
        .slice(0, 2)
        .map((r) => r.name)
        .sort(),
    ).toEqual([...m0.a].sort());
    expect(board[0]).toMatchObject({ pts: 15, diff: 6, played: 1 });
  });

  it('delete removes tournament from store and DB', () => {
    const tid = newTournament('ROUND_ROBIN', 4);
    app().deleteTournament(tid);
    expect(app().tournaments[tid]).toBeUndefined();
    expect(docs('tournament')).toHaveLength(0);
  });
});
