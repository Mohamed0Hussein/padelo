import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { MatchRules, Team } from '@/engine';
import { DEFAULT_RANKING, type Tournament } from '@/lib/types';
import { DEFAULT_SETTINGS, useApp } from '@/store';
import { ThemeProvider } from '@/theme';
import { files, params, router } from './router';

export { files, params, router };

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

/** Renders a screen inside the app's providers. Pass `id`/`name` route params via `route`. */
export function show(ui: ReactElement, route: Record<string, string> = {}) {
  params.current = route;
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

export const app = () => useApp.getState();
export const btn = (name: string | RegExp) => screen.getByRole('button', { name });
export const noBtn = (name: string | RegExp) => screen.queryByRole('button', { name });

/** Fresh store and fakes. Call from beforeEach. */
export function reset() {
  jest.clearAllMocks();
  files.clear();
  params.current = {};
  useApp.setState({ ready: true, settings: { ...DEFAULT_SETTINGS, onboarded: true }, matches: {}, tournaments: {} });
}

export const QUICK: MatchRules = { bestOf: 1, games: 4, deuce: 'golden', tiebreak: true, superTb: false };

export function winMatch(id: string, team: Team) {
  while (app().matches[id].state.winner < 0) app().score(id, team);
}

/** A friendly match between two pairs, optionally played out and saved. */
export function friendly(a: [string, string], b: [string, string], winner?: Team) {
  const id = app().startMatch(
    [
      { id: a.join('+'), players: a },
      { id: b.join('+'), players: b },
    ],
    QUICK,
  );
  if (winner !== undefined) {
    winMatch(id, winner);
    app().endAndSave(id);
  }
  return id;
}

export function tournament(format: Tournament['format'], n: number, extra: Partial<Tournament> = {}) {
  return app().createTournament({
    name: 'Friday Cup',
    date: '2026-11-21',
    venue: 'Club',
    format,
    rules: QUICK,
    rankingRules: DEFAULT_RANKING,
    teams: Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, players: [`A${i + 1}`, `B${i + 1}`] })),
    ...extra,
  });
}

/** Starts, wins (slot side `team`) and saves a tournament slot. */
export function playSlot(tid: string, slotId: string, team: Team = 0) {
  const id = app().startSlot(tid, slotId)!;
  winMatch(id, team);
  app().endAndSave(id);
  return id;
}
