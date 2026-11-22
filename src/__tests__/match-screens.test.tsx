/** Screen tests: Courtside, Share result, Player profile, Head to head. */
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import Courtside from '@/app/courtside/[id]';
import HeadToHead from '@/app/h2h';
import PlayerProfile from '@/app/player/[name]';
import Result from '@/app/result/[id]';
import { useApp } from '@/store';
import { app, btn, friendly, playSlot, reset, router, show, tournament } from '@/test/render';

beforeEach(reset);

const padA = () => btn(/^Point for Ali \/ Badr/);
const padB = () => btn(/^Point for Carl \/ Dani/);

describe('Courtside', () => {
  it('locks to landscape while open and back to portrait on leave', async () => {
    const id = friendly(['Ali', 'Badr'], ['Carl', 'Dani']);
    const { unmount } = await show(<Courtside />, { id });
    expect(ScreenOrientation.lockAsync).toHaveBeenLastCalledWith('landscape');
    await unmount();
    expect(ScreenOrientation.lockAsync).toHaveBeenLastCalledWith('portrait');
  });

  it('pads score, hold undoes, Undo button undoes', async () => {
    const id = friendly(['Ali', 'Badr'], ['Carl', 'Dani']);
    await show(<Courtside />, { id });
    expect(screen.getAllByText('Tap for point')).toHaveLength(2);
    await fireEvent.press(padA());
    await fireEvent.press(padB());
    await fireEvent.press(padB());
    expect(app().matches[id].state.points).toEqual([1, 2]);
    await fireEvent(padA(), 'longPress');
    expect(app().matches[id].state.points).toEqual([1, 1]);
    await fireEvent.press(btn('Undo'));
    expect(app().matches[id].state.points).toEqual([1, 0]);
  });

  it('lock disables pads and undo until unlocked', async () => {
    const id = friendly(['Ali', 'Badr'], ['Carl', 'Dani']);
    app().score(id, 0);
    await show(<Courtside />, { id });
    await fireEvent.press(btn('Lock pads'));
    expect(screen.getAllByText('Locked')).toHaveLength(2);
    expect(padA().props.accessibilityState.disabled).toBe(true);
    expect(btn('Undo').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(padB());
    expect(app().matches[id].state.points).toEqual([1, 0]);

    await fireEvent.press(btn('Unlock pads'));
    await fireEvent.press(padB());
    expect(app().matches[id].state.points).toEqual([1, 1]);
  });

  it('volume keys toggle writes the shared setting; keep-awake caption follows settings', async () => {
    app().setSettings({ keepAwake: false });
    const id = friendly(['Ali', 'Badr'], ['Carl', 'Dani']);
    await show(<Courtside />, { id });
    expect(screen.getByText('Screen may sleep')).toBeTruthy();
    expect(screen.getByText('Volume keys on')).toBeTruthy();
    await fireEvent.press(screen.getByRole('switch', { name: 'Volume keys' }));
    expect(app().settings.volumeKeys).toBe(false);
    expect(screen.getByText('Volume keys off')).toBeTruthy();
  });

  it('back returns to live scoring; unknown id renders nothing', async () => {
    const id = friendly(['Ali', 'Badr'], ['Carl', 'Dani']);
    await show(<Courtside />, { id });
    await fireEvent.press(btn('Back to live scoring'));
    expect(router.back).toHaveBeenCalled();

    await show(<Courtside />, { id: 'nope' });
    expect(screen.queryByRole('button', { name: /^Point for/ })).toBeNull();
  });
});

describe('Share result', () => {
  it('shows the final score and winner, copies a text summary', async () => {
    const id = friendly(['Ali', 'Badr'], ['Carl', 'Dani'], 1);
    await show(<Result />, { id });
    expect(screen.getByText('Ali / Badr')).toBeTruthy();
    expect(screen.getByText('Carl / Dani win · 1 set · Padelo')).toBeTruthy();
    await fireEvent.press(btn('Copy text'));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('Ali / Badr vs Carl / Dani: 0–4. Carl / Dani win.');
  });

  it('shares the captured image, or explains when sharing is unavailable', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const id = friendly(['Ali', 'Badr'], ['Carl', 'Dani'], 0);
    await show(<Result />, { id });
    await fireEvent.press(btn('Share image'));
    await waitFor(() =>
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'file:///shot.png',
        expect.objectContaining({ mimeType: 'image/png' }),
      ),
    );

    jest.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);
    await fireEvent.press(btn('Share image'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Sharing is not available on this device'));
  });

  it('card style switcher and Home button', async () => {
    const id = friendly(['Ali', 'Badr'], ['Carl', 'Dani'], 0);
    await show(<Result />, { id });
    await fireEvent.press(screen.getByRole('radio', { name: 'Card style: Minimal' }));
    expect(screen.getByRole('radio', { name: 'Card style: Minimal' }).props.accessibilityState.selected).toBe(true);
    await fireEvent.press(btn('Home'));
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });

  it('tournament match goes back to its tournament and shows the round', async () => {
    const tid = tournament('KNOCKOUT', 4);
    const slot = app().tournaments[tid].matches.find((m) => m.round === 0)!;
    const id = playSlot(tid, slot.id);
    await show(<Result />, { id });
    expect(screen.getByText('Semi-finals')).toBeTruthy();
    await fireEvent.press(btn('Back to tournament'));
    expect(router.dismissTo).toHaveBeenCalledWith(`/tournament/${tid}`);
  });

  it('works for an unsaved match and for an unknown id', async () => {
    const id = friendly(['Ali', 'Badr'], ['Carl', 'Dani']);
    for (let i = 0; i < 4; i++) app().score(id, 1); // one game, match not over
    await show(<Result />, { id });
    expect(screen.getByText('Final score')).toBeTruthy();

    await show(<Result />, { id: 'nope' });
    expect(screen.getByText('Match not found.')).toBeTruthy();
  });
});

describe('Player profile', () => {
  it('stats grid, form, partners and recent matches from saved matches', async () => {
    const w = friendly(['Ali', 'Badr'], ['Carl', 'Dani'], 0);
    const l = friendly(['Ali', 'Eve'], ['Carl', 'Dani'], 1);
    friendly(['Ali', 'Badr'], ['Carl', 'Dani']); // live: not counted
    // distinct end times so "newest first" is deterministic
    useApp.setState((s) => ({
      matches: {
        ...s.matches,
        [w]: { ...s.matches[w], endedAt: 1000 },
        [l]: { ...s.matches[l], endedAt: 2000 },
      },
    }));
    await show(<PlayerProfile />, { name: 'Ali' });

    const stat = (label: string) => screen.getByText(label).parent!; // the stat card
    expect(stat('Matches')).toHaveTextContent('2Matches');
    expect(stat('Win rate')).toHaveTextContent('50%Win rate');
    expect(stat('Games won')).toHaveTextContent('4Games won');
    expect(screen.getByLabelText('Form: L W')).toBeTruthy();
    expect(screen.getByText('Badr')).toBeTruthy();
    expect(screen.getByText('Eve')).toBeTruthy();
    expect(screen.getAllByText('1 played')).toHaveLength(2);

    await fireEvent.press(btn('Ali / Badr versus Carl / Dani, 4–0'));
    expect(router.push).toHaveBeenCalledWith(`/result/${w}`);
    await fireEvent.press(btn('Head to head'));
    expect(router.push).toHaveBeenLastCalledWith('/h2h');
  });

  it('decodes the name from the link; empty profile', async () => {
    await show(<PlayerProfile />, { name: 'Ana%20Mar%C3%ADa' });
    expect(screen.getByText('Ana María')).toBeTruthy();
    expect(screen.getByText('No matches yet.')).toBeTruthy();
    expect(screen.getByText('No partners yet.')).toBeTruthy();
    expect(screen.getByText('–')).toBeTruthy();
  });
});

describe('Head to head', () => {
  const pick = async (slot: 0 | 1, name: string) => fireEvent.press(screen.getAllByRole('button', { name })[slot]);

  it('needs at least two pairs', async () => {
    friendly(['Ali', 'Badr'], ['Carl', 'Dani']); // not finished
    await show(<HeadToHead />);
    expect(screen.getByText('Not enough data')).toBeTruthy();
  });

  it('compares two pairs across all their meetings', async () => {
    const ids = [
      friendly(['Ali', 'Badr'], ['Carl', 'Dani'], 0),
      friendly(['Dani', 'Carl'], ['Badr', 'Ali'], 0),
      friendly(['Ali', 'Badr'], ['Carl', 'Dani'], 0),
    ];
    await show(<HeadToHead />);
    await pick(0, 'Ali / Badr');
    await pick(1, 'Carl / Dani');
    expect(screen.getByText('3 meetings')).toBeTruthy();
    expect(screen.getByLabelText('Matches won: 2 to 1')).toBeTruthy();
    expect(screen.getByLabelText('Games: 8 to 4')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /versus/ })).toHaveLength(3);
    await fireEvent.press(screen.getAllByRole('button', { name: /versus/ })[0]);
    expect(ids.map((id) => `/result/${id}`)).toContain(router.push.mock.calls[0][0]);
  });

  it('pairs that never met', async () => {
    friendly(['Ali', 'Badr'], ['Carl', 'Dani'], 0);
    friendly(['Eve', 'Fay'], ['Gus', 'Hal'], 0);
    await show(<HeadToHead />);
    await pick(0, 'Ali / Badr');
    await pick(1, 'Eve / Fay');
    expect(screen.getByText('0 meetings')).toBeTruthy();
    expect(screen.getByText('These pairs have not met yet.')).toBeTruthy();
  });
});
