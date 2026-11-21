import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { resultFromState } from '@/tournament/standings';
import { teamLabel } from '@/lib/util';
import { useApp } from '@/store';
import { font, useTheme } from '@/theme';
import { Button, GlassSurface, Header, Icon, Mono, Screen, Segmented, T } from '@/ui';

type Style = 'glass' | 'tinted' | 'minimal';

export default function Result() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const m = useApp((s) => s.matches[id]);
  const shot = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const [style, setStyle] = useState<Style>('glass');
  if (!m)
    return (
      <Screen header={<Header title="Result" />}>
        <T>Match not found.</T>
      </Screen>
    );
  const r = m.result ?? resultFromState(m.state);
  const names = m.teams.map(teamLabel);
  const summary = `${names[0]} vs ${names[1]}: ${r.sets.map((s) => s.join('–')).join(', ')}. ${names[r.winner]} win.`;

  const share = async () => {
    try {
      const uri = await shot.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync()))
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share result' });
      else Alert.alert('Sharing is not available on this device');
    } catch {
      Alert.alert('Could not create the image');
    }
  };

  const bg = style === 'minimal' ? c.background : style === 'tinted' ? c.primarySoft : c.glassStrong;
  return (
    <Screen
      header={<Header title="Share result" />}
      footer={
        <View style={{ gap: 10, paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button style={{ flex: 1 }} icon="ios-share" label="Share image" onPress={share} />
            <Button
              style={{ flex: 1 }}
              kind="outline"
              icon="content-copy"
              label="Copy text"
              onPress={() => Clipboard.setStringAsync(summary)}
            />
          </View>
          <Button
            kind="tonal"
            compact
            icon={m.tournamentId ? 'emoji-events' : 'home'}
            label={m.tournamentId ? 'Back to tournament' : 'Home'}
            onPress={() => (m.tournamentId ? router.replace(`/tournament/${m.tournamentId}`) : router.replace('/'))}
          />
        </View>
      }
    >
      <Segmented
        label="Card style"
        value={style}
        onChange={setStyle}
        options={[
          { value: 'glass', label: 'Glass' },
          { value: 'tinted', label: 'Tinted' },
          { value: 'minimal', label: 'Minimal' },
        ]}
      />
      <ViewShot ref={shot} options={{ format: 'png', quality: 1 }}>
        <View style={{ backgroundColor: c.background, borderRadius: 28, overflow: 'hidden' }}>
          <GlassSurface
            radius={28}
            tint={bg}
            style={{ padding: 24, gap: 18, borderWidth: style === 'minimal' ? 0 : 1 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="emoji-events" color={c.primary} />
              <T v="overline" style={{ color: c.primary }}>
                {m.roundLabel ?? 'Final score'}
              </T>
            </View>
            {[0, 1].map((t) => (
              <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text
                  style={{
                    flex: 1,
                    color: c.onSurface,
                    fontFamily: r.winner === t ? font.medium : font.regular,
                    fontSize: 20,
                  }}
                  numberOfLines={2}
                >
                  {names[t]}
                </Text>
                {r.sets.map((s, i) => (
                  <Mono key={i} size={28} color={s[t] > s[1 - t] ? c.onSurface : c.onSurfaceMuted}>
                    {s[t]}
                  </Mono>
                ))}
                {r.winner === t ? <Icon name="check-circle" color={c.win} /> : null}
              </View>
            ))}
            <T v="caption">
              {names[r.winner]} win · {m.rules.bestOf === 1 ? '1 set' : `best of ${m.rules.bestOf}`} · Padelo
            </T>
          </GlassSurface>
        </View>
      </ViewShot>
    </Screen>
  );
}
