export type Team = 0 | 1;
export type DeuceRule = 'golden' | 'adv' | 'star';

export interface MatchRules {
  bestOf: 1 | 3 | 5;
  games: 4 | 6 | 9;
  deuce: DeuceRule;
  tiebreak: boolean;
  superTb: boolean;
}

export interface SetResult {
  games: [number, number];
  winner: Team;
  superTiebreak: boolean;
}

export interface LogEntry {
  text: string;
  team: Team;
}

/** Everything undo restores. Rules and names are NOT rolled back (rules can change mid-match). */
export interface Snapshot {
  sets: SetResult[];
  games: [number, number];
  points: [number, number];
  tiebreak: boolean;
  superTiebreak: boolean;
  server: Team;
  winner: Team | -1;
  deuceCount: number;
  /** Deciding (golden / star) points won per team */
  golden: [number, number];
  changeEnds: boolean;
  log: LogEntry[];
}

export interface ScoringState extends Snapshot {
  rules: MatchRules;
  names: [string, string];
  history: Snapshot[];
}

export interface Banner {
  text: string;
  icon: string;
  hot: boolean;
}
