import { useFocusEffect } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { startVolumeKeys } from '../../modules/volume-keys';
import { pointLabel, type ScoringState, type Team } from '@/engine';
import { useApp } from '@/store';
import type { Match } from './types';
import { firstName } from './util';

/** Which of the serving team's two players serves right now (they alternate service games). */
export function servingPlayer(m: Match): string {
  const s = m.state;
  const played =
    s.sets.filter((x) => !x.superTiebreak).reduce((n, x) => n + x.games[0] + x.games[1], 0) + s.games[0] + s.games[1];
  const nth = Math.floor((s.server === 0 ? played : played - 1) / 2);
  const ps = m.teams[s.server].players.filter(Boolean);
  return ps[Math.max(0, nth) % ps.length] ?? '';
}

function sentence(m: Match): string {
  const s: ScoringState = m.state;
  const last = s.log[0]?.text ?? '';
  if (/^(Game|Set|Match|Golden|Star)/.test(last)) return last.replace('·', ',');
  if (s.tiebreak || s.superTiebreak || s.points[0] || s.points[1])
    return `${pointLabel(s, 0)} ${pointLabel(s, 1)}, ${firstName(servingPlayer(m))} serving`;
  return `${firstName(servingPlayer(m))} serving`;
}

/**
 * Wires a scoring screen: keep-awake, volume keys (while focused and not locked), haptics, speech.
 * Returns `score(team)` that screens call for pads and volume keys.
 */
export function useScoringControls(id: string, opts: { locked?: boolean } = {}) {
  const settings = useApp((s) => s.settings);
  const scoreRaw = useApp((s) => s.score);

  const score = useCallback(
    (team: Team) => {
      if (opts.locked) return;
      const before = useApp.getState().matches[id];
      if (!before || before.endedAt || before.state.winner >= 0) return;
      scoreRaw(id, team);
      const after = useApp.getState().matches[id];
      const big = /^(Game|Set|Match|Golden|Star)/.test(after.state.log[0]?.text ?? '');
      if (settings.haptics) {
        if (big) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (settings.callScore) {
        Speech.stop();
        Speech.speak(sentence(after));
      }
    },
    [id, opts.locked, scoreRaw, settings.haptics, settings.callScore],
  );

  useFocusEffect(
    useCallback(() => {
      if (settings.keepAwake) activateKeepAwakeAsync('scoring');
      let stop = () => {};
      if (settings.volumeKeys && !opts.locked && Platform.OS === 'android')
        stop = startVolumeKeys((d) => score(d === 'up' ? 0 : 1));
      return () => {
        stop();
        deactivateKeepAwake('scoring');
        Speech.stop();
      };
    }, [settings.keepAwake, settings.volumeKeys, opts.locked, score]),
  );

  return { score, hint: settings.volumeKeys && Platform.OS === 'android' };
}
