import type { Tournament } from './types';

/** What spectators may see. Mirrors the switches on the Share live screen. */
export interface ShareOptions {
  liveScores: boolean;
  tables: boolean;
  bracket: boolean;
  courts: boolean;
}

/** Read-only public view of a tournament (the data model the backend would store). */
export interface PublicSnapshot {
  tournamentId: string;
  name: string;
  updatedAt: number;
  options: ShareOptions;
  groups?: Tournament['groups'];
  matches?: Pick<Tournament['matches'][number], 'id' | 'stage' | 'group' | 'roundLabel' | 'a' | 'b' | 'result'>[];
}

export function publicSnapshot(t: Tournament, options: ShareOptions): PublicSnapshot {
  return {
    tournamentId: t.id,
    name: t.name,
    updatedAt: Date.now(),
    options,
    groups: options.tables ? t.groups : undefined,
    matches:
      options.bracket || options.liveScores
        ? t.matches.map(({ id, stage, group, roundLabel, a, b, result }) => ({
            id,
            stage,
            group,
            roundLabel,
            a,
            b,
            result,
          }))
        : undefined,
  };
}

/** Network boundary. Swap StubSync for a real client when a backend exists. */
export interface LiveSync {
  start(snapshot: PublicSnapshot): Promise<{ url: string }>;
  push(snapshot: PublicSnapshot): Promise<void>;
  stop(tournamentId: string): Promise<void>;
}

export const StubSync: LiveSync = {
  // ponytail: no backend in v1. The link below is a placeholder and nothing is uploaded.
  start: async (s) => ({ url: `https://padelo.app/live/${s.tournamentId}` }),
  push: async () => {},
  stop: async () => {},
};

export const sync: LiveSync = StubSync;
