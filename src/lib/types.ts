import type { MatchRules, ScoringState, Team } from '@/engine';

export type Format = 'ROUND_ROBIN' | 'GROUPS_KNOCKOUT' | 'KNOCKOUT' | 'AMERICANO';
export type RankKey = 'SET_DIFF' | 'GAME_DIFF' | 'HEAD_TO_HEAD' | 'GAMES_WON' | 'GOLDEN_POINTS';

export interface RankingRules {
  winPoints: number;
  lossPoints: number;
  straightSetsBonus: number;
  order: RankKey[];
}

export const DEFAULT_RANKING: RankingRules = {
  winPoints: 3,
  lossPoints: 0,
  straightSetsBonus: 1,
  order: ['SET_DIFF', 'GAME_DIFF', 'HEAD_TO_HEAD', 'GAMES_WON', 'GOLDEN_POINTS'],
};

/** A pair of players. Players are identified by (trimmed) name. */
export interface TeamRef {
  id: string;
  players: [string, string];
}

/** Compact outcome of a finished match; everything stats/standings need. */
export interface MatchResult {
  sets: [number, number][];
  winner: 0 | 1;
  games: [number, number];
  golden: [number, number];
  tiebreaks: [number, number];
}

export interface Match {
  id: string;
  teams: [TeamRef, TeamRef];
  rules: MatchRules;
  state: ScoringState;
  tournamentId?: string;
  /** TMatch id inside the tournament */
  slotId?: string;
  roundLabel?: string;
  courtLabel?: string;
  startedAt: number;
  endedAt?: number;
  result?: MatchResult;
  /** serve faults per serving team (a double fault counts 2) */
  faults?: [number, number];
  doubleFaults?: [number, number];
  /** first serve was a fault, next fault = double fault */
  pendingFault?: boolean;
  lastDf?: { len: number; t: Team };
}

export interface TMatch {
  id: string;
  stage: 'group' | 'ko';
  group?: string;
  round: number;
  idx: number;
  roundLabel: string;
  /** team ids, null = not decided yet */
  a: string | null;
  b: string | null;
  bye?: boolean;
  matchId?: string;
  result?: MatchResult;
  court?: string;
}

export interface Court {
  id: string;
  name: string;
  matchId?: string; // TMatch id currently assigned
}

export interface AmericanoMatch {
  court: number;
  a: [string, string];
  b: [string, string];
  pointsA: number;
  pointsB: number;
}
export interface AmericanoRound {
  index: number;
  matches: AmericanoMatch[];
  locked: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  venue: string;
  format: Format;
  rules: MatchRules;
  finalRules?: MatchRules;
  rankingRules: RankingRules;
  teams: TeamRef[];
  groups: { name: string; teamIds: string[] }[];
  matches: TMatch[]; // groups + knockout
  courts: Court[];
  autoAssign: boolean;
  /** manual order of the Up next queue (TMatch ids) */
  queue?: string[];
  // americano
  players?: string[];
  pointsPerMatch?: number;
  rounds?: AmericanoRound[];
  createdAt: number;
}

export interface Settings {
  theme: 'system' | 'dark' | 'light';
  defaultRules: MatchRules;
  volumeKeys: boolean;
  keepAwake: boolean;
  haptics: boolean;
  changeEndsReminder: boolean;
  callScore: boolean;
  onboarded: boolean;
}
