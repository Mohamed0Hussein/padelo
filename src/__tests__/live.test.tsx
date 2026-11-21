/**
 * Screen tests: New match and Live scoring rendered with the real store, theme and UI kit.
 * Router, DB and device APIs are faked in src/test/setup.ts.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync } from 'expo-keep-awake';
import * as Speech from 'expo-speech';
import Live from '@/app/match/[id]';
import NewMatch from '@/app/new-match';
import type { MatchRules } from '@/engine';
import { DEFAULT_SETTINGS, useApp } from '@/store';
import { app, btn, reset, router as mockRouter, show } from '@/test/render';

const radio = (name: string) => screen.getByRole('radio', { name });

beforeEach(reset);

describe('New match screen', () => {
  it('starts a match with the typed names and chosen rules, then opens Live scoring', async () => {
    await show(<NewMatch />);
    const fields = screen.getAllByLabelText(/^Player [12]$/);
    expect(fields).toHaveLength(4);
    for (const [i, name] of ['Ali', 'Badr', 'Carl', 'Dani'].entries()) await fireEvent.changeText(fields[i], name);

    await fireEvent.press(radio('Match length: 1 set'));
    await fireEvent.press(radio('Games per set: 4'));
    await fireEvent.press(radio('At 40–40: Advantage'));
    expect(screen.getAllByText('1 set · sets to 4 · advantage').length).toBeGreaterThan(0);
    // the deciding-set choice only makes sense with more than one set
    expect(screen.queryAllByRole('radio', { name: /^Deciding set/ })).toHaveLength(0);

    await fireEvent.press(btn('Start match'));
    const [m] = Object.values(app().matches);
    expect(m.teams.map((t) => t.players)).toEqual([
      ['Ali', 'Badr'],
      ['Carl', 'Dani'],
    ]);
    expect(m.rules).toEqual<MatchRules>({ bestOf: 1, games: 4, deuce: 'adv', tiebreak: true, superTb: true });
    expect(mockRouter.replace).toHaveBeenCalledWith(`/match/${m.id}`);
  });

  it('fills empty names with placeholders and starts from the default rules', async () => {
    await show(<NewMatch />);
    await fireEvent.press(btn('Start match'));
    const [m] = Object.values(app().matches);
    expect(m.state.names).toEqual(['Player 1 / Player 2', 'Player 3 / Player 4']);
    expect(m.rules).toEqual(DEFAULT_SETTINGS.defaultRules);
  });

  it('recent player chips fill the first empty field', async () => {
    app().startMatch(
      [
        { id: 'a', players: ['Zara', 'Yusuf'] },
        { id: 'b', players: ['Xavi', 'Wael'] },
      ],
      DEFAULT_SETTINGS.defaultRules,
    );
    await show(<NewMatch />);
    await fireEvent.press(btn('Yusuf'));
    expect(screen.getAllByLabelText(/^Player [12]$/)[0].props.value).toBe('Yusuf');
    // a picked name leaves the chip list
    expect(screen.queryByRole('button', { name: 'Yusuf' })).toBeNull();
  });
});

describe('Live scoring screen', () => {
  const quick: MatchRules = { bestOf: 1, games: 4, deuce: 'golden', tiebreak: true, superTb: false };
  const open = async (rules = quick, settings = {}) => {
    useApp.setState({ settings: { ...DEFAULT_SETTINGS, ...settings } });
    const id = app().startMatch(
      [
        { id: 'a', players: ['Ali', 'Badr'] },
        { id: 'b', players: ['Carl', 'Dani'] },
      ],
      rules,
    );
    await show(<Live />, { id });
    return id;
  };
  const padA = () => btn(/^Point for Ali \/ Badr/);
  const padB = () => btn(/^Point for Carl \/ Dani/);
  const status = () => screen.getByLabelText(/^Status: /).props.accessibilityLabel as string;

  it('tapping pads scores, undo button reverts, banner follows the engine', async () => {
    const id = await open();
    expect(screen.getByText('Ali serving')).toBeTruthy();
    expect(btn('Undo').props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(padA());
    await fireEvent.press(padA());
    await fireEvent.press(padB());
    expect(padA().props.accessibilityLabel).toBe('Point for Ali / Badr. Current 30');
    expect(padB().props.accessibilityLabel).toBe('Point for Carl / Dani. Current 15');

    await fireEvent.press(padB());
    await fireEvent.press(padA());
    await fireEvent.press(padB());
    expect(status()).toBe('Status: Golden point · next point wins');

    await fireEvent.press(btn('Undo'));
    expect(app().matches[id].state.points).toEqual([3, 2]);
    expect(padB().props.accessibilityLabel).toBe('Point for Carl / Dani. Current 30');
  });

  it('holding a pad undoes the last point', async () => {
    const id = await open();
    await fireEvent.press(padA());
    await fireEvent(padB(), 'longPress');
    expect(app().matches[id].state.points).toEqual([0, 0]);
    expect(Haptics.impactAsync).toHaveBeenLastCalledWith('heavy');
  });

  it('wires keep-awake, haptics per point and the spoken score', async () => {
    await open(quick, { callScore: true });
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith('scoring');
    await fireEvent.press(padA());
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    expect(Speech.speak).toHaveBeenLastCalledWith('15 0, Ali serving');
    for (let i = 0; i < 3; i++) await fireEvent.press(padA());
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('respects settings that switch haptics and speech off', async () => {
    await open(quick, { haptics: false, callScore: false });
    await fireEvent.press(padA());
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('fault button: first fault arms, second gives the point away', async () => {
    const id = await open();
    await fireEvent.press(btn('Fault'));
    expect(btn('2nd fault → double fault')).toBeTruthy();
    await fireEvent.press(btn('2nd fault → double fault'));
    expect(app().matches[id].state.points).toEqual([0, 1]);
    expect(screen.getByText('Faults 2 – 0 · Double faults 1 – 0')).toBeTruthy();
  });

  it('40–40 rule switcher changes the rule mid-match', async () => {
    const id = await open();
    await fireEvent.press(screen.getAllByRole('radio', { name: 'At 40–40: Star' })[0]);
    expect(app().matches[id].rules.deuce).toBe('star');
  });

  it('point history sheet lists the log newest first', async () => {
    await open();
    await fireEvent.press(padA());
    await fireEvent.press(padB());
    await fireEvent.press(btn('Point history'));
    expect(screen.getByText('15–15')).toBeTruthy();
    expect(screen.getByText('15–0')).toBeTruthy();
  });

  it('End & save asks first, then saves and opens the result card', async () => {
    const id = await open();
    await fireEvent.press(padA());
    await fireEvent.press(btn('End & save'));
    expect(screen.getByText('End match?')).toBeTruthy();
    // the sheet renders before the footer, so its button comes first
    await fireEvent.press(screen.getAllByRole('button', { name: 'End & save' })[0]);
    expect(app().matches[id].endedAt).toBeDefined();
    expect(mockRouter.replace).toHaveBeenCalledWith(`/result/${id}`);
  });

  it('when the match is over, pads lock and the footer saves directly', async () => {
    const id = await open();
    for (let i = 0; i < 16; i++) await fireEvent.press(padA());
    expect(app().matches[id].state.winner).toBe(0);
    expect(padA().props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Fault' })).toBeNull();
    await fireEvent.press(btn('Save result'));
    expect(app().matches[id].result?.winner).toBe(0);
    expect(mockRouter.replace).toHaveBeenCalledWith(`/result/${id}`);
  });

  it('restart from the end sheet resets the score', async () => {
    const id = await open();
    await fireEvent.press(padA());
    await fireEvent.press(btn('End & save'));
    await fireEvent.press(btn('Restart match'));
    expect(app().matches[id].state.points).toEqual([0, 0]);
    expect(app().matches[id].endedAt).toBeUndefined();
  });

  it('shows a message for an unknown match id', async () => {
    await show(<Live />, { id: 'nope' });
    expect(screen.getByText('Match not found.')).toBeTruthy();
  });
});
