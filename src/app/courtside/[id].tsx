import * as ScreenOrientation from 'expo-screen-orientation';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { banner } from '@/engine';
import { useScoringControls } from '@/lib/scoring';
import { faultLine } from '@/lib/serve';
import { useApp } from '@/store';
import { useTheme } from '@/theme';
import { Button, GlowBackground, Icon, IconBtn, T } from '@/ui';
import { ScorePad, ScoreTable } from '@/ui/match';

export default function Courtside() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const m = useApp((s) => s.matches[id]);
  const settings = useApp((s) => s.settings);
  const [locked, setLocked] = useState(false);
  const { score, take, hint } = useScoringControls(id, { locked });

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  if (!m) return null;
  const over = m.state.winner >= 0;
  const b = banner(settings.changeEndsReminder ? m.state : { ...m.state, changeEnds: false });
  return (
    <View
      style={{
        flex: 1,
        paddingTop: Math.max(insets.top, 8),
        paddingBottom: Math.max(insets.bottom, 8),
        // landscape: the system navigation bar sits on the left or right edge
        paddingLeft: Math.max(insets.left, 16),
        paddingRight: Math.max(insets.right, 16),
      }}
    >
      <GlowBackground />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 }}>
        <IconBtn icon="arrow-back" label="Back to live scoring" onPress={() => router.back()} />
        <Icon name={b.icon} size={20} color={b.hot ? c.primary : c.onSurfaceMuted} />
        <T v="bodyStrong" style={{ flex: 1, color: b.hot ? c.primary : c.onSurface }}>
          {b.text}
        </T>
        <Icon name="visibility" size={16} color={c.onSurfaceMuted} />
        <T v="caption">{settings.keepAwake ? 'Screen stays on' : 'Screen may sleep'}</T>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Volume keys"
          accessibilityState={{ checked: settings.volumeKeys }}
          onPress={() => useApp.getState().setSettings({ volumeKeys: !settings.volumeKeys })}
          style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 }}
        >
          <Icon name="volume-up" size={20} color={settings.volumeKeys ? c.primary : c.onSurfaceMuted} />
          <T v="label" style={{ color: settings.volumeKeys ? c.primary : c.onSurfaceMuted }}>
            Volume keys {settings.volumeKeys ? 'on' : 'off'}
          </T>
        </Pressable>
        <IconBtn
          icon={locked ? 'lock' : 'lock-open'}
          label={locked ? 'Unlock pads' : 'Lock pads'}
          filled
          onPress={() => setLocked(!locked)}
        />
        <IconBtn
          icon="undo"
          label="Undo"
          filled
          disabled={(!m.state.history.length && !m.pendingFault) || locked}
          onPress={() => useApp.getState().undoPoint(id)}
        />
      </View>
      <View style={{ flex: 1, flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <ScorePad
          m={m}
          team={0}
          big={132}
          locked={locked}
          onPress={() => score(0)}
          onLongPress={() => take(0)}
          hint={locked ? 'Locked' : hint ? 'Volume up · hold −1' : 'Tap +1 · hold −1'}
        />
        <View style={{ width: 280, justifyContent: 'center', gap: 10 }}>
          <ScoreTable m={m} compact />
          {!over && (
            <Button
              compact
              kind={m.pendingFault ? 'danger' : 'outline'}
              icon="report-problem"
              label={m.pendingFault ? '2nd fault → double' : 'Fault'}
              a11y={m.pendingFault ? '2nd fault → double fault' : 'Fault'}
              disabled={locked}
              onPress={() => useApp.getState().fault(id)}
            />
          )}
          <T v="caption" style={{ textAlign: 'center' }} numberOfLines={2}>
            {faultLine(m)}
          </T>
        </View>
        <ScorePad
          m={m}
          team={1}
          big={132}
          locked={locked}
          onPress={() => score(1)}
          onLongPress={() => take(1)}
          hint={locked ? 'Locked' : hint ? 'Volume down · hold −1' : 'Tap +1 · hold −1'}
        />
      </View>
    </View>
  );
}
