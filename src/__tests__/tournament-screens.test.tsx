/** Screen tests: Create tournament, Tournament hub, Bracket, Results, Ranking rules, Courts, Share live, Americano. */
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';
import Americano from '@/app/americano/[id]';
import Bracket from '@/app/bracket/[id]';
import Courts from '@/app/courts/[id]';
import Ranking from '@/app/ranking/[id]';
import TournamentResults from '@/app/results/[id]';
import ShareLive from '@/app/share-live/[id]';
import TournamentHub from '@/app/tournament/[id]';
import CreateTournament from '@/app/tournament/create';
import { DEFAULT_SETTINGS } from '@/store';
import { nextSlot } from '@/tournament/util';
import { app, btn, files, noBtn, playSlot, reset, router, show, tournament } from '@/test/render';

beforeEach(reset);

const radio = (name: string | RegExp) => screen.getByRole('radio', { name });
const sw = (name: string) => screen.getAllByRole('switch', { name })[0];
const only = () => Object.values(app().tournaments)[0];
/** Plays every remaining slot, side a winning. */
const playAll = (tid: string) => {
  while (nextSlot(app().tournaments[tid])) playSlot(tid, nextSlot(app().tournaments[tid])!.id);
};

describe('Create tournament', () => {
  it('format cards show computed match counts for the team count', async () => {
    await show(<CreateTournament />);
    expect(radio('Groups + knockout, 15 matches').props.accessibilityState.selected).toBe(true);
    expect(radio('Round robin, 28 matches')).toBeTruthy();
    expect(radio('Knockout, 7 matches')).toBeTruthy();
    await fireEvent.press(btn('Decrease teams'));
    expect(radio('Knockout, 6 matches')).toBeTruthy();
    expect(screen.getByLabelText('teams: 7')).toBeTruthy();
  });

  it('creates a knockout with typed names and opens the hub', async () => {
    await show(<CreateTournament />);
    await fireEvent.changeText(screen.getByLabelText('Name'), '  Winter Cup ');
    await fireEvent.changeText(screen.getByLabelText('Venue'), 'Club 5');
    await fireEvent.press(radio(/^Knockout,/));
    for (let i = 0; i < 4; i++) await fireEvent.press(btn('Decrease teams'));
    await fireEvent.changeText(screen.getByLabelText('Team 1 player 1'), 'Ali');
    await fireEvent.changeText(screen.getByLabelText('Team 1 player 2'), 'Badr');
    await fireEvent.press(btn('Create & make draw'));

    const t = only();
    expect(t).toMatchObject({ name: 'Winter Cup', venue: 'Club 5', format: 'KNOCKOUT', finalRules: undefined });
    expect(t.teams.map((x) => x.players)).toEqual([
      ['Ali', 'Badr'],
      ['Team 2', ''],
      ['Team 3', ''],
      ['Team 4', ''],
    ]);
    expect(t.matches).toHaveLength(3);
    expect(router.replace).toHaveBeenCalledWith(`/tournament/${t.id}`);
  });

  it('different rules for the final', async () => {
    await show(<CreateTournament />);
    const best5 = () => screen.getAllByRole('radio', { name: 'Match length: Best of 5' });
    expect(best5()).toHaveLength(1);
    await fireEvent.press(sw('Different rules for the final'));
    expect(best5()).toHaveLength(2);
    await fireEvent.press(best5()[1]);
    await fireEvent.press(btn('Create & make draw'));
    expect(only().finalRules).toEqual({ ...DEFAULT_SETTINGS.defaultRules, bestOf: 5 });
    expect(only().rules).toEqual(DEFAULT_SETTINGS.defaultRules);
  });

  it('round robin has no final, so no final-rules switch', async () => {
    await show(<CreateTournament />);
    await fireEvent.press(radio(/^Round robin,/));
    expect(screen.queryAllByRole('switch', { name: 'Different rules for the final' })).toHaveLength(0);
  });

  it('Americano: players in fours, points per match, one court per 4 players', async () => {
    await show(<CreateTournament />);
    await fireEvent.press(radio(/^Americano,/));
    expect(screen.queryAllByRole('radio', { name: /^Match length/ })).toHaveLength(0);
    expect(screen.getByLabelText('players: 8')).toBeTruthy();
    await fireEvent.press(btn('Increase points per match'));
    await fireEvent.changeText(screen.getByLabelText('Player 1'), 'Zoe');
    await fireEvent.press(btn('Create & make draw'));
    const t = only();
    expect(t).toMatchObject({ name: 'Americano', format: 'AMERICANO', pointsPerMatch: 28 });
    expect(t.players).toEqual(['Zoe', ...Array.from({ length: 7 }, (_, i) => `Player ${i + 2}`)]);
    expect(t.courts).toHaveLength(2);
    expect(t.rounds).toHaveLength(7);
    expect(router.replace).toHaveBeenCalledWith(`/americano/${t.id}`);
  });

  it('shuffle keeps the same names', async () => {
    await show(<CreateTournament />);
    for (let i = 0; i < 6; i++) await fireEvent.press(btn('Decrease teams'));
    const names = ['a', 'b', 'c', 'd'];
    const inputs = screen.getAllByLabelText(/^Team \d player \d$/);
    for (const [i, n] of names.entries()) await fireEvent.changeText(inputs[i], n);
    await fireEvent.press(btn('Shuffle'));
    const after = screen.getAllByLabelText(/^Team \d player \d$/).map((x) => x.props.value);
    expect([...after].sort()).toEqual(names);
  });
});

describe('Tournament hub', () => {
  it('groups tab shows tables with qualifiers marked; header and chips navigate', async () => {
    const id = tournament('GROUPS_KNOCKOUT', 8);
    await show(<TournamentHub />, { id });
    expect(screen.getByText('Group A')).toBeTruthy();
    expect(screen.getByText('Group B')).toBeTruthy();
    expect(screen.getAllByLabelText(/, qualifies$/)).toHaveLength(4);
    expect(screen.getByText('0/15 matches')).toBeTruthy();

    await fireEvent.press(btn('Courts'));
    expect(router.push).toHaveBeenLastCalledWith(`/courts/${id}`);
    await fireEvent.press(btn('Share live'));
    expect(router.push).toHaveBeenLastCalledWith(`/share-live/${id}`);
    await fireEvent.press(btn('Ranking rules'));
    expect(router.push).toHaveBeenLastCalledWith(`/ranking/${id}`);
  });

  it('Score a match starts the next slot and opens Live scoring', async () => {
    const id = tournament('KNOCKOUT', 4);
    await show(<TournamentHub />, { id });
    const next = nextSlot(app().tournaments[id])!;
    await fireEvent.press(btn('Score A1 / B1 versus A4 / B4'));
    const slot = app().tournaments[id].matches.find((m) => m.id === next.id)!;
    expect(slot.matchId).toBeDefined();
    expect(router.push).toHaveBeenCalledWith(`/match/${slot.matchId}`);
  });

  it('matches tab: rows show Score / Waiting / result, results open the result card', async () => {
    const id = tournament('KNOCKOUT', 4);
    const semi = app().tournaments[id].matches[0];
    const mid = playSlot(id, semi.id);
    await show(<TournamentHub />, { id });
    await fireEvent.press(radio('Tournament view: Matches'));
    expect(btn('A1 / B1 versus A4 / B4, 4–0')).toBeTruthy();
    expect(btn('A2 / B2 versus A3 / B3, Score')).toBeTruthy();
    expect(btn('A1 / B1 versus TBD, Waiting').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(btn('A1 / B1 versus A4 / B4, 4–0'));
    expect(router.push).toHaveBeenCalledWith(`/result/${mid}`);
  });

  it('knockout format opens on the knockout tab; bracket and rules note', async () => {
    const id = tournament('KNOCKOUT', 4, { finalRules: { ...DEFAULT_SETTINGS.defaultRules } });
    await show(<TournamentHub />, { id });
    expect(screen.queryByRole('radio', { name: /Groups|Table/ })).toBeNull();
    expect(screen.getByText('Rules: the final has its own rules.')).toBeTruthy();
    await fireEvent.press(btn('Open bracket'));
    expect(router.push).toHaveBeenCalledWith(`/bracket/${id}`);
  });

  it('round robin: one league table, no knockout tab', async () => {
    const id = tournament('ROUND_ROBIN', 4);
    await show(<TournamentHub />, { id });
    expect(screen.getByText('League table')).toBeTruthy();
    expect(radio('Tournament view: Table')).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Tournament view: Knockout' })).toBeNull();
    expect(screen.queryAllByLabelText(/, qualifies$/)).toHaveLength(0);
  });

  it('finished tournament shows the champion and a Results button', async () => {
    const id = tournament('KNOCKOUT', 4);
    playAll(id);
    await show(<TournamentHub />, { id });
    expect(screen.getByText('Champions: A1 / B1')).toBeTruthy();
    expect(noBtn(/^Score /)).toBeNull();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Results' })[0]);
    expect(router.push).toHaveBeenCalledWith(`/results/${id}`);
  });

  it('not found', async () => {
    await show(<TournamentHub />, { id: 'nope' });
    expect(screen.getByText('Not found.')).toBeTruthy();
  });
});

describe('Bracket', () => {
  it('shows rounds, byes and the next match; opens live and finished matches', async () => {
    const id = tournament('KNOCKOUT', 3);
    await show(<Bracket />, { id });
    expect(screen.getByText('Semi-finals')).toBeTruthy();
    expect(screen.getByText('Final')).toBeTruthy();
    expect(screen.getByText('Bye')).toBeTruthy();

    await fireEvent.press(btn('Next: A2 / B2 vs A3 / B3'));
    const live = app().tournaments[id].matches.find((m) => m.matchId)!;
    expect(router.push).toHaveBeenLastCalledWith(`/match/${live.matchId}`);

    // tapping the live card resumes the same match
    await fireEvent.press(btn('A2 / B2 versus A3 / B3'));
    expect(router.push).toHaveBeenLastCalledWith(`/match/${live.matchId}`);
    expect(Object.keys(app().matches)).toHaveLength(1);
  });

  it('finished matches show their score and open the result card', async () => {
    const id = tournament('KNOCKOUT', 4);
    const mid = playSlot(id, app().tournaments[id].matches[0].id);
    await show(<Bracket />, { id });
    await fireEvent.press(btn('A1 / B1 versus A4 / B4, 4–0'));
    expect(router.push).toHaveBeenCalledWith(`/result/${mid}`);
  });

  it('no Next button once the knockout is over', async () => {
    const id = tournament('KNOCKOUT', 4);
    playAll(id);
    await show(<Bracket />, { id });
    expect(noBtn(/^Next:/)).toBeNull();
  });
});

describe('Tournament results', () => {
  it('champion, placings, stats and CSV export', async () => {
    const id = tournament('KNOCKOUT', 4);
    playAll(id);
    await show(<TournamentResults />, { id });
    expect(screen.getByText('Champions')).toBeTruthy();
    const placings = screen.getByText('Final placings').parent!.parent!;
    expect(placings).toHaveTextContent(/^Final placings1A1 \/ B12A2 \/ B2/);
    const stat = (label: string) => screen.getAllByText(label).at(-1)!.parent!;
    expect(stat('Matches')).toHaveTextContent('3Matches');
    expect(stat('Games')).toHaveTextContent('12Games');

    await fireEvent.press(btn('Export CSV'));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalled());
    expect(files.get('file:///cache/Friday_Cup.csv')?.split('\n')).toHaveLength(4);

    await fireEvent.press(btn('Home'));
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });
});

describe('Ranking rules', () => {
  it('steppers and tie-break order update the preview; Save writes the tournament', async () => {
    const id = tournament('ROUND_ROBIN', 4);
    await show(<Ranking />, { id });
    await fireEvent.press(btn('Increase Points for a win'));
    await fireEvent.press(btn('Decrease Bonus for winning 2–0'));
    expect(btn('Move Set difference up').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(btn('Move Game difference up'));
    expect(
      screen.getByText(/^A win is 4 pts; a loss is 0\. Teams level on points are split by: game difference, then set/),
    ).toBeTruthy();
    expect(app().tournaments[id].rankingRules.winPoints).toBe(3); // not saved yet

    await fireEvent.press(btn('Save'));
    expect(app().tournaments[id].rankingRules).toMatchObject({
      winPoints: 4,
      straightSetsBonus: 0,
      order: ['GAME_DIFF', 'SET_DIFF', 'HEAD_TO_HEAD', 'GAMES_WON', 'GOLDEN_POINTS'],
    });
    expect(router.back).toHaveBeenCalled();
  });
});

describe('Courts', () => {
  it('assign a waiting match to a free court, then start it', async () => {
    const id = tournament('KNOCKOUT', 4);
    await show(<Courts />, { id });
    expect(screen.getAllByText('Free')).toHaveLength(2);
    expect(screen.getAllByText(/ vs /).length).toBeGreaterThan(0);

    await fireEvent.press(screen.getAllByRole('button', { name: 'Assign A1 / B1 vs A4 / B4 here' })[0]);
    expect(app().tournaments[id].courts[0].matchId).toBe(app().tournaments[id].matches[0].id);
    expect(screen.getByText('Playing')).toBeTruthy();
    expect(screen.getByText('Not started')).toBeTruthy();

    await fireEvent.press(btn('Start match'));
    const slot = app().tournaments[id].matches[0];
    expect(router.push).toHaveBeenCalledWith(`/match/${slot.matchId}`);
    expect(slot.court).toBe('Court 1');
    expect(screen.getByText('● Live')).toBeTruthy();
    expect(btn('Open scoring')).toBeTruthy();
  });

  it('up next can be reordered', async () => {
    const id = tournament('KNOCKOUT', 4);
    await show(<Courts />, { id });
    const [first, second] = app().tournaments[id].matches;
    expect(screen.getAllByRole('button', { name: 'Move up' })[0].props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getAllByRole('button', { name: 'Move down' })[0]);
    expect(app().tournaments[id].queue).toEqual([second.id, first.id]);
    expect(screen.getAllByRole('button', { name: /^Assign / })[0].props.accessibilityLabel).toBe(
      'Assign A2 / B2 vs A3 / B3 here',
    );
  });

  it('auto-assign fills every free court', async () => {
    const id = tournament('KNOCKOUT', 4);
    await show(<Courts />, { id });
    await fireEvent.press(sw('Auto-assign'));
    await waitFor(() => expect(app().tournaments[id].courts.every((c) => c.matchId)).toBe(true));
    expect(screen.getAllByText('Playing')).toHaveLength(2);
    expect(screen.getByText('No matches waiting.')).toBeTruthy();
  });
});

describe('Share live', () => {
  it('shows a link and QR, copy and share it, pause and resume', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    const id = tournament('KNOCKOUT', 4);
    await show(<ShareLive />, { id });
    const url = `https://padelo.app/live/${id}`;
    await waitFor(() => expect(screen.getByTestId('qr')).toHaveTextContent(url));

    await fireEvent.press(btn('Copy'));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(url);
    await fireEvent.press(btn('Share'));
    expect(share).toHaveBeenCalledWith({ message: `Follow Friday Cup live: ${url}` });

    await fireEvent.press(sw('Court assignments'));
    expect(sw('Court assignments').props.accessibilityState.checked).toBe(true);

    await fireEvent.press(btn('Pause sharing'));
    expect(screen.getByText('Sharing is paused')).toBeTruthy();
    expect(btn('Copy').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(btn('Resume sharing'));
    await waitFor(() => expect(screen.getByTestId('qr')).toBeTruthy());
  });

  it('not found', async () => {
    await show(<ShareLive />, { id: 'nope' });
    expect(screen.getByText('Not found.')).toBeTruthy();
  });
});

describe('Americano', () => {
  const players = Array.from({ length: 8 }, (_, i) => `P${i + 1}`);
  const make = () => tournament('AMERICANO', 0, { players, pointsPerMatch: 24, courtCount: 2 } as never);

  it('enter points with +/-, capped at the total, then lock the round', async () => {
    const id = make();
    await show(<Americano />, { id });
    expect(screen.getByText('8 players · 2 courts · 24 points per match')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^R\d$/ })).toHaveLength(7);
    expect(btn('R1').props.accessibilityState.selected).toBe(true);

    const add = () => screen.getAllByRole('button', { name: /^Add point to / })[0];
    const remove = () => screen.getAllByRole('button', { name: /^Remove point from / })[0];
    expect(remove().props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(add());
    await fireEvent.press(add());
    await fireEvent.press(remove());
    expect(app().tournaments[id].rounds![0].matches[0]).toMatchObject({ pointsA: 1, pointsB: 0 });
    expect(screen.getByText('1/24')).toBeTruthy();
    expect(screen.getByText('23 points left to play')).toBeTruthy();

    const m = app().tournaments[id].rounds![0].matches[0];
    await act(async () => app().setAmericanoScore(id, 0, 0, { ...m, pointsA: 20, pointsB: 4 }));
    expect(add().props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(btn('Lock results · start round 2'));
    expect(app().tournaments[id].rounds![0].locked).toBe(true);
    expect(btn('R2').props.accessibilityState.selected).toBe(true);

    await fireEvent.press(btn('R1'));
    expect(screen.getAllByText('Locked').length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('button', { name: /^Add point to / })).toHaveLength(0);
    expect(noBtn(/^Lock results/)).toBeNull();
  });

  it('leaderboard ranks locked rounds by points then difference', async () => {
    const id = make();
    const m = app().tournaments[id].rounds![0].matches[0];
    app().setAmericanoScore(id, 0, 0, { ...m, pointsA: 15, pointsB: 9 });
    app().lockAmericanoRound(id, 0);
    await show(<Americano />, { id });
    await fireEvent.press(radio('View: Leaderboard'));
    const rows = screen.getAllByLabelText(/^\d\. /).map((r) => r.props.accessibilityLabel);
    expect(rows).toHaveLength(8);
    expect(rows[0]).toMatch(/^1\. P\d, 15 points, difference 6$/);
    expect(rows[2]).toMatch(/^3\. P\d, 9 points, difference -6$/);
  });

  it('last round says finish; share live link', async () => {
    const id = make();
    for (let r = 0; r < 6; r++) app().lockAmericanoRound(id, r);
    await show(<Americano />, { id });
    expect(btn('Lock results · finish')).toBeTruthy();
    await fireEvent.press(btn('Share live'));
    expect(router.push).toHaveBeenCalledWith(`/share-live/${id}`);
  });
});
