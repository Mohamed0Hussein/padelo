import { create } from 'zustand';
import { DEFAULT_RULES, init, point, removePoint, undo, type MatchRules, type Team } from '@/engine';
import { servingPlayer } from '@/lib/serve';
import { deleteDoc, loadAll, openDb, saveDoc } from '@/db';
import { americanoRounds } from '@/tournament/americano';
import { buildFixtures, fillKnockout, groupStageDone, propagate } from '@/tournament/draw';
import { qualifiers, resultFromState } from '@/tournament/standings';
import {
  DEFAULT_RANKING,
  type AmericanoMatch,
  type Match,
  type MatchResult,
  type Settings,
  type TMatch,
  type TeamRef,
  type Tournament,
} from '@/lib/types';
import { teamLabel, uid } from '@/lib/util';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  defaultRules: DEFAULT_RULES,
  volumeKeys: true,
  keepAwake: true,
  haptics: true,
  changeEndsReminder: true,
  callScore: false,
  onboarded: false,
};

interface App {
  ready: boolean;
  settings: Settings;
  matches: Record<string, Match>;
  tournaments: Record<string, Tournament>;
  hydrate: () => Promise<void>;
  setSettings: (p: Partial<Settings>) => void;
  // matches
  startMatch: (teams: [TeamRef, TeamRef], rules: MatchRules, extra?: Partial<Match>) => string;
  score: (id: string, team: Team) => void;
  undoPoint: (id: string) => void;
  /** take `team`'s most recent point away (hold on that team's pad) */
  removePoint: (id: string, team: Team) => void;
  fault: (id: string) => void;
  restart: (id: string) => void;
  setMatchRules: (id: string, rules: MatchRules) => void;
  endAndSave: (id: string) => void;
  deleteMatch: (id: string) => void;
  // tournaments
  createTournament: (
    t: Omit<Tournament, 'id' | 'matches' | 'groups' | 'createdAt' | 'courts' | 'autoAssign'> & { courtCount?: number },
  ) => string;
  saveTournament: (t: Tournament) => void;
  deleteTournament: (id: string) => void;
  startSlot: (tid: string, slotId: string) => string | null;
  setAmericanoScore: (tid: string, round: number, matchIdx: number, m: AmericanoMatch) => void;
  lockAmericanoRound: (tid: string, round: number) => void;
}

const put = <T extends { id: string }>(kind: string, rec: Record<string, T>, v: T) => {
  saveDoc(kind, v.id, v);
  return { ...rec, [v.id]: v };
};

export const useApp = create<App>((set, get) => {
  const putMatch = (m: Match) => set((s) => ({ matches: put('match', s.matches, m) }));
  const putT = (t: Tournament) => set((s) => ({ tournaments: put('tournament', s.tournaments, t) }));

  /** Writes a finished result into the tournament slot, then re-derives knockout state. */
  const applyResult = (m: Match, result: MatchResult) => {
    if (!m.tournamentId || !m.slotId) return;
    const t = get().tournaments[m.tournamentId];
    if (!t) return;
    let matches = t.matches.map((x) => (x.id === m.slotId ? { ...x, result, matchId: m.id } : x));
    const next: Tournament = { ...t, matches };
    if (t.format === 'GROUPS_KNOCKOUT' && groupStageDone(next)) {
      const ko = matches.filter((x) => x.stage === 'ko');
      if (ko.length && ko.every((x) => !x.a && !x.b)) {
        matches = [...matches.filter((x) => x.stage === 'group'), ...fillKnockout(ko, qualifiers(next))];
      }
    }
    const ko = propagate(matches.filter((x) => x.stage === 'ko'));
    matches = [...matches.filter((x) => x.stage === 'group'), ...ko];
    putT({ ...t, matches });
  };

  return {
    ready: false,
    settings: DEFAULT_SETTINGS,
    matches: {},
    tournaments: {},

    hydrate: async () => {
      await openDb();
      const [settings] = await loadAll<Settings>('settings');
      const matches = await loadAll<Match>('match');
      const tournaments = await loadAll<Tournament>('tournament');
      set({
        ready: true,
        settings: { ...DEFAULT_SETTINGS, ...settings },
        matches: Object.fromEntries(matches.map((m) => [m.id, m])),
        tournaments: Object.fromEntries(tournaments.map((t) => [t.id, t])),
      });
    },

    setSettings: (p) => {
      const settings = { ...get().settings, ...p };
      saveDoc('settings', 'main', settings);
      set({ settings });
    },

    startMatch: (teams, rules, extra = {}) => {
      const id = uid();
      putMatch({
        id,
        teams,
        rules,
        state: init(rules, [teamLabel(teams[0]), teamLabel(teams[1])]),
        startedAt: Date.now(),
        ...extra,
      });
      return id;
    },

    score: (id, team) => {
      const m = get().matches[id];
      if (m && !m.endedAt) putMatch({ ...m, state: point(m.state, team), pendingFault: false });
    },
    fault: (id) => {
      const m = get().matches[id];
      if (!m || m.endedAt || m.state.winner >= 0) return;
      const t = m.state.server;
      const bump = (a: [number, number] = [0, 0]): [number, number] => (t === 0 ? [a[0] + 1, a[1]] : [a[0], a[1] + 1]);
      const faults = bump(m.faults);
      const record = (kind: 'fault' | 'double') => [...(m.faultLog ?? []), { kind, team: t, player: servingPlayer(m) }];
      if (!m.pendingFault) return putMatch({ ...m, faults, pendingFault: true, faultLog: record('fault') });
      const state = point(m.state, t === 0 ? 1 : 0);
      putMatch({
        ...m,
        state,
        faults,
        doubleFaults: bump(m.doubleFaults),
        faultLog: record('double'),
        pendingFault: false,
        lastDf: { len: state.history.length, t },
      });
    },
    removePoint: (id, team) => {
      const m = get().matches[id];
      if (!m || m.endedAt) return;
      const state = removePoint(m.state, team);
      if (state === m.state) return;
      // the serve may have changed hands, so a pending first-serve fault no longer applies;
      // the fault itself stays in the record
      putMatch({ ...m, state, pendingFault: false, lastDf: undefined });
    },
    undoPoint: (id) => {
      const m = get().matches[id];
      if (!m) return;
      const dec = (a: [number, number] = [0, 0], t: Team): [number, number] =>
        t === 0 ? [Math.max(0, a[0] - 1), a[1]] : [a[0], Math.max(0, a[1] - 1)];
      const dropLastFault = () => (m.faultLog ?? []).slice(0, -1);
      if (m.pendingFault)
        return putMatch({
          ...m,
          pendingFault: false,
          faults: dec(m.faults, m.state.server),
          faultLog: dropLastFault(),
        });
      const df = m.lastDf;
      if (df && df.len === m.state.history.length)
        return putMatch({
          ...m,
          state: undo(m.state),
          faults: dec(m.faults, df.t),
          doubleFaults: dec(m.doubleFaults, df.t),
          faultLog: dropLastFault(),
          pendingFault: true,
          lastDf: undefined,
        });
      putMatch({ ...m, state: undo(m.state) });
    },
    restart: (id) => {
      const m = get().matches[id];
      if (m)
        putMatch({
          ...m,
          state: init(m.rules, m.state.names),
          startedAt: Date.now(),
          endedAt: undefined,
          result: undefined,
        });
    },
    setMatchRules: (id, rules) => {
      const m = get().matches[id];
      if (!m) return;
      // switching to golden point while a team has Ad puts the game back to 40-40
      const p = m.state.points;
      const points: [number, number] = rules.deuce === 'golden' && (p[0] === 4 || p[1] === 4) ? [3, 3] : p;
      putMatch({ ...m, rules, state: { ...m.state, rules, points } });
    },
    endAndSave: (id) => {
      const m = get().matches[id];
      if (!m || m.endedAt) return;
      const result = resultFromState(m.state);
      const done = { ...m, endedAt: Date.now(), result };
      putMatch(done);
      applyResult(done, result);
    },
    deleteMatch: (id) => {
      deleteDoc('match', id);
      set((s) => {
        const { [id]: _gone, ...matches } = s.matches;
        return { matches };
      });
    },

    createTournament: ({ courtCount = 2, ...base }) => {
      const id = uid();
      const t: Tournament = {
        ...base,
        id,
        rankingRules: base.rankingRules ?? DEFAULT_RANKING,
        groups: [],
        matches: [],
        courts: Array.from({ length: courtCount }, (_, i) => ({ id: `c${i + 1}`, name: `Court ${i + 1}` })),
        autoAssign: false,
        createdAt: Date.now(),
      };
      if (t.format === 'AMERICANO') {
        t.rounds = americanoRounds(t.players ?? []);
      } else {
        Object.assign(t, buildFixtures(t.format, t.teams));
      }
      putT(t);
      return id;
    },
    saveTournament: putT,
    deleteTournament: (id) => {
      deleteDoc('tournament', id);
      set((s) => {
        const { [id]: _gone, ...tournaments } = s.tournaments;
        return { tournaments };
      });
    },

    startSlot: (tid, slotId) => {
      const t = get().tournaments[tid];
      const slot = t?.matches.find((x) => x.id === slotId);
      if (!t || !slot || !slot.a || !slot.b) return null;
      if (slot.matchId && get().matches[slot.matchId] && !get().matches[slot.matchId].endedAt) return slot.matchId;
      const ta = t.teams.find((x) => x.id === slot.a)!;
      const tb = t.teams.find((x) => x.id === slot.b)!;
      const isFinal =
        slot.stage === 'ko' &&
        slot.round === Math.max(...t.matches.filter((x) => x.stage === 'ko').map((x) => x.round));
      const id = get().startMatch([ta, tb], (isFinal && t.finalRules) || t.rules, {
        tournamentId: tid,
        slotId,
        roundLabel: slot.stage === 'group' ? `Group ${slot.group} · ${slot.roundLabel}` : slot.roundLabel,
        courtLabel: slot.court,
      });
      putT({ ...t, matches: t.matches.map((x) => (x.id === slotId ? { ...x, matchId: id } : x)) });
      return id;
    },

    setAmericanoScore: (tid, round, matchIdx, m) => {
      const t = get().tournaments[tid];
      if (!t?.rounds) return;
      putT({
        ...t,
        rounds: t.rounds.map((r) =>
          r.index === round ? { ...r, matches: r.matches.map((x, i) => (i === matchIdx ? m : x)) } : r,
        ),
      });
    },
    lockAmericanoRound: (tid, round) => {
      const t = get().tournaments[tid];
      if (!t?.rounds) return;
      putT({ ...t, rounds: t.rounds.map((r) => (r.index === round ? { ...r, locked: true } : r)) });
    },
  };
});

export const liveMatches = (matches: Record<string, Match>) =>
  Object.values(matches)
    .filter((m) => !m.endedAt)
    .sort((a, b) => b.startedAt - a.startedAt);
export const finishedMatches = (matches: Record<string, Match>) =>
  Object.values(matches)
    .filter((m) => m.endedAt)
    .sort((a, b) => b.endedAt! - a.endedAt!);
export type { TMatch };
