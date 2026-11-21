import * as ScreenOrientation from 'expo-screen-orientation';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { banner } from '@/engine';
import { useScoringControls } from '@/lib/scoring';
import { useApp } from '@/store';
import { useTheme } from '@/theme';
import { GlowBackground, Icon, IconBtn, T } from '@/ui';
import { ScorePad, ScoreTable } from '@/ui/match';

export default function Courtside() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const m = useApp((s) => s.matches[id]);
  const settings = useApp((s) => s.settings);
  const [locked, setLocked] = useState(false);
  const { score, hint } = useScoringControls(id, { locked });

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  if (!m) return null;
  const b = banner(settings.changeEndsReminder ? m.state : { ...m.state, changeEnds: false });
  return (
    <View
      style={{
        flex: 1,
        paddingTop: Math.max(insets.top, 8),
        paddingBottom: Math.max(insets.bottom, 8),
        paddingHorizontal: Math.max(insets.left, 16),
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
          disabled={!m.state.history.length || locked}
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
          onLongPress={() => useApp.getState().undoPoint(id)}
          hint={locked ? 'Locked' : hint ? 'Volume up' : 'Tap for point'}
        />
        <View style={{ width: 280, justifyContent: 'center' }}>
          <ScoreTable m={m} compact />
        </View>
        <ScorePad
          m={m}
          team={1}
          big={132}
          locked={locked}
          onPress={() => score(1)}
          onLongPress={() => useApp.getState().undoPoint(id)}
          hint={locked ? 'Locked' : hint ? 'Volume down' : 'Tap for point'}
        />
      </View>
    </View>
  );
}
