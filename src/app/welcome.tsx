import { useRouter } from 'expo-router';
import { View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { useApp } from '@/store';
import { useTheme } from '@/theme';
import { Button, Icon, Screen, T } from '@/ui';

const benefits = [
  { icon: 'bolt', text: 'Score every point, with undo and volume-key scoring' },
  { icon: 'emoji-events', text: 'Run tournaments: draw, tables and bracket' },
  { icon: 'cloud-off', text: 'Works fully offline, everything stays on your phone' },
];

export default function Welcome() {
  const router = useRouter();
  const { c } = useTheme();
  const finish = (to: '/' | '/new-match' | '/tournament/create') => {
    useApp.getState().setSettings({ onboarded: true });
    router.replace(to);
  };
  return (
    <Screen
      footer={
        <View style={{ gap: 10, paddingVertical: 12 }}>
          <Button icon="sports-tennis" label="Score my first match" onPress={() => finish('/new-match')} />
          <Button
            kind="outline"
            icon="emoji-events"
            label="Host a tournament"
            onPress={() => finish('/tournament/create')}
          />
          <Button kind="tonal" compact label="Skip for now" onPress={() => finish('/')} />
        </View>
      }
    >
      <View style={{ alignItems: 'center', paddingTop: 24 }}>
        <Svg width={220} height={150} accessibilityElementsHidden>
          <Rect x={4} y={4} width={212} height={142} rx={14} fill="none" stroke={c.primary} strokeWidth={2} />
          <Line x1={110} y1={4} x2={110} y2={146} stroke={c.primary} strokeWidth={2} />
          <Line x1={4} y1={75} x2={216} y2={75} stroke={c.glassStroke} strokeWidth={2} strokeDasharray="6 6" />
          <Line x1={40} y1={4} x2={40} y2={146} stroke={c.glassStroke} strokeWidth={1.5} />
          <Line x1={180} y1={4} x2={180} y2={146} stroke={c.glassStroke} strokeWidth={1.5} />
          <Circle cx={140} cy={50} r={9} fill={c.primary} />
        </Svg>
      </View>
      <View style={{ gap: 6 }}>
        <T v="headline">Padel scoring, sorted.</T>
        <T v="body" style={{ color: c.onSurfaceMuted }}>
          Golden point, star point, tiebreaks, change of ends. Handled.
        </T>
      </View>
      <View style={{ gap: 14 }}>
        {benefits.map((b) => (
          <View key={b.icon} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: c.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={b.icon} color={c.primary} />
            </View>
            <T style={{ flex: 1 }}>{b.text}</T>
          </View>
        ))}
      </View>
    </Screen>
  );
}
