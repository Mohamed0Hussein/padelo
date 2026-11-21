/** Screen tests: Home and the other tabs, Welcome, Settings. */
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import Home from '@/app/(tabs)/index';
import Matches from '@/app/(tabs)/matches';
import Players from '@/app/(tabs)/players';
import Tournaments from '@/app/(tabs)/tournaments';
import Settings from '@/app/settings';
import Welcome from '@/app/welcome';
import { app, btn, files, friendly, noBtn, reset, router, show, tournament } from '@/test/render';

const sw = (name: string) => screen.getAllByRole('switch', { name })[0];

beforeEach(reset);

describe('Home', () => {
  it('empty state: no live card, empty sections, shortcuts work', async () => {
    await show(<Home />);
    expect(noBtn('Resume live match')).toBeNull();
    expect(screen.getByText('No tournaments yet')).toBeTruthy();
    expect(screen.getByText('No matches yet')).toBeTruthy();

    await fireEvent.press(btn('Score a match'));
    expect(router.push).toHaveBeenLastCalledWith('/new-match');
    await fireEvent.press(btn('New match'));
    expect(router.push).toHaveBeenLastCalledWith('/new-match');
    await fireEvent.press(btn('Host tournament'));
    expect(router.push).toHaveBeenLastCalledWith('/tournament/create');
    await fireEvent.press(btn('Settings'));
    expect(router.push).toHaveBeenLastCalledWith('/settings');
  });

  it('live match card resumes scoring and shows the status', async () => {
    const id = friendly(['Ali', 'Badr'], ['Carl', 'Dani']);
    app().score(id, 0);
    await show(<Home />);
    expect(screen.getByText('Ali / Badr serving')).toBeTruthy();
    await fireEvent.press(btn('Resume live match'));
    expect(router.push).toHaveBeenCalledWith(`/match/${id}`);
  });

  it('recent matches (max 5) open the result card', async () => {
    const ids = Array.from({ length: 6 }, (_, i) => friendly([`P${i}`, 'X'], ['Y', 'Z'], 0));
    await show(<Home />);
    const cards = screen.getAllByRole('button', { name: /versus Y \/ Z, 4–0$/ });
    expect(cards).toHaveLength(5);
    await fireEvent.press(cards[0]);
    expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/result\//));
    expect(ids).toContain((router.push.mock.calls[0][0] as string).split('/')[2]);
  });

  it('tournament cards show progress and open the right screen per format', async () => {
    const ko = tournament('KNOCKOUT', 4, { name: 'Cup' });
    const am = tournament('AMERICANO', 0, { name: 'Social', players: ['a', 'b', 'c', 'd'] });
    await show(<Home />);
    // knockout of 4 = 3 matches; Americano of 4 = 3 rounds
    expect(screen.getAllByText('0/3')).toHaveLength(2);
    await fireEvent.press(btn('Open Cup'));
    expect(router.push).toHaveBeenLastCalledWith(`/tournament/${ko}`);
    await fireEvent.press(btn('Open Social'));
    expect(router.push).toHaveBeenLastCalledWith(`/americano/${am}`);
  });
});

describe('Matches tab', () => {
  it('lists live matches and history separately', async () => {
    const live = friendly(['Ali', 'Badr'], ['Carl', 'Dani']);
    const done = friendly(['Eve', 'Fay'], ['Gus', 'Hal'], 1);
    await show(<Matches />);
    expect(screen.getByText('In progress')).toBeTruthy();
    await fireEvent.press(btn('Ali / Badr versus Carl / Dani, 0–0, live'));
    expect(router.push).toHaveBeenLastCalledWith(`/match/${live}`);
    await fireEvent.press(btn('Eve / Fay versus Gus / Hal, 0–4'));
    expect(router.push).toHaveBeenLastCalledWith(`/result/${done}`);
  });

  it('empty history', async () => {
    await show(<Matches />);
    expect(screen.queryByText('In progress')).toBeNull();
    expect(screen.getByText('No finished matches')).toBeTruthy();
  });
});

describe('Tournaments tab', () => {
  it('lists newest first with format and size', async () => {
    const a = tournament('KNOCKOUT', 4, { name: 'Old' });
    app().saveTournament({ ...app().tournaments[a], createdAt: 1 });
    tournament('AMERICANO', 0, { name: 'New', players: Array.from({ length: 8 }, (_, i) => `p${i}`) });
    await show(<Tournaments />);
    const names = screen.getAllByRole('button', { name: /^Open / }).map((b) => b.props.accessibilityLabel);
    expect(names).toEqual(['Open New', 'Open Old']);
    expect(screen.getByText('Knockout · 4 teams · Club')).toBeTruthy();
    expect(screen.getByText('Americano · 8 players · Club')).toBeTruthy();
    await fireEvent.press(btn('Host tournament'));
    expect(router.push).toHaveBeenLastCalledWith('/tournament/create');
  });

  it('empty state', async () => {
    await show(<Tournaments />);
    expect(screen.getByText('No tournaments yet')).toBeTruthy();
  });
});

describe('Players tab', () => {
  it('lists players from matches and tournaments with their record', async () => {
    friendly(['Ali', 'Badr'], ['Carl', 'Dani'], 0);
    tournament('AMERICANO', 0, { players: ['Zoe', 'ali', 'x', 'y'] });
    await show(<Players />);
    expect(btn('Ali, 1 wins from 1 matches')).toBeTruthy();
    expect(btn('Zoe, 0 wins from 0 matches')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Ali,/ })).toHaveLength(1); // "ali" is the same player
    await fireEvent.press(btn('Ali, 1 wins from 1 matches'));
    expect(router.push).toHaveBeenLastCalledWith('/player/Ali');
    await fireEvent.press(btn('Head to head'));
    expect(router.push).toHaveBeenLastCalledWith('/h2h');
  });

  it('encodes names in the profile link', async () => {
    friendly(['Ana María', 'B'], ['C', 'D'], 0);
    await show(<Players />);
    await fireEvent.press(btn(/^Ana María,/));
    expect(router.push).toHaveBeenLastCalledWith('/player/Ana%20Mar%C3%ADa');
  });

  it('empty state', async () => {
    await show(<Players />);
    expect(screen.getByText('No players yet')).toBeTruthy();
  });
});

describe('Welcome', () => {
  it.each([
    ['Score my first match', '/new-match'],
    ['Host a tournament', '/tournament/create'],
    ['Skip for now', '/'],
  ])('%s marks onboarding done and goes to %s', async (label, to) => {
    app().setSettings({ onboarded: false });
    await show(<Welcome />);
    await fireEvent.press(btn(label));
    expect(app().settings.onboarded).toBe(true);
    expect(router.replace).toHaveBeenCalledWith(to);
  });
});

describe('Settings', () => {
  it('theme and default rules write the app settings', async () => {
    await show(<Settings />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Theme: Light' }));
    expect(app().settings.theme).toBe('light');
    await fireEvent.press(screen.getByRole('radio', { name: 'At 40–40: Star' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Games per set: 9' }));
    expect(app().settings.defaultRules).toMatchObject({ deuce: 'star', games: 9 });
  });

  it.each([
    ['Volume-key scoring', 'volumeKeys'],
    ['Keep screen awake', 'keepAwake'],
    ['Vibrate per point', 'haptics'],
    ['Change-ends reminder', 'changeEndsReminder'],
    ['Call score aloud', 'callScore'],
  ] as const)('%s switch toggles %s', async (label, key) => {
    const before = app().settings[key];
    await show(<Settings />);
    expect(sw(label).props.accessibilityState.checked).toBe(before);
    await fireEvent.press(sw(label));
    expect(app().settings[key]).toBe(!before);
    expect(sw(label).props.accessibilityState.checked).toBe(!before);
  });

  it('CSV export: warns when there is nothing, otherwise shares a file of all tournaments', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await show(<Settings />);
    await fireEvent.press(btn('Export tournaments (CSV)'));
    expect(alert).toHaveBeenCalledWith('No tournaments to export');

    tournament('KNOCKOUT', 4, { name: 'Cup' });
    tournament('AMERICANO', 0, { name: 'Social', players: ['a', 'b', 'c', 'd'] });
    await fireEvent.press(btn('Export tournaments (CSV)'));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalled());
    const csv = files.get('file:///cache/padelo-tournaments.csv')!;
    expect(csv.startsWith('Cup\nStage,Round')).toBe(true);
    expect(csv).not.toContain('Social'); // Americano has no fixtures to export
  });

  it('backup shares a JSON file with everything', async () => {
    const id = friendly(['Ali', 'Badr'], ['Carl', 'Dani'], 0);
    await show(<Settings />);
    await fireEvent.press(btn('Back up everything'));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalled());
    const backup = JSON.parse(files.get('file:///cache/padelo-backup.json')!);
    expect(backup.version).toBe(1);
    expect(Object.keys(backup.matches)).toEqual([id]);
    expect(backup.settings.onboarded).toBe(true);
  });

  it('can show the welcome screen again and open New match', async () => {
    await show(<Settings />);
    await fireEvent.press(btn('New match'));
    expect(router.push).toHaveBeenCalledWith('/new-match');
    await fireEvent.press(btn('Show welcome screen'));
    expect(app().settings.onboarded).toBe(false);
  });
});
