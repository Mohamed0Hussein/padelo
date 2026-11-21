import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { playerNames, playerStats } from '@/lib/stats';
import { useApp } from '@/store';
import { shape } from '@/theme';
import { Avatar, Button, Empty, GlassSurface, Header, Screen, T } from '@/ui';

export default function Players() {
  const router = useRouter();
  const matches = useApp((s) => s.matches);
  const tournaments = useApp((s) => s.tournaments);
  const ms = Object.values(matches);
  const names = playerNames(
    ms,
    Object.values(tournaments).flatMap((t) => [...t.teams.flatMap((x) => x.players), ...(t.players ?? [])]),
  );
  return (
    <Screen header={<Header back={false} title="Players" />}>
      <Button kind="outline" icon="compare-arrows" label="Head to head" onPress={() => router.push('/h2h')} />
      {names.length === 0 && (
        <Empty
          icon="group"
          title="No players yet"
          text="Players are added when you score a match or create a tournament."
        />
      )}
      {names.map((n) => {
        const s = playerStats(ms, n);
        return (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${n}, ${s.won} wins from ${s.played} matches`}
            onPress={() => router.push(`/player/${encodeURIComponent(n)}`)}
          >
            <GlassSurface
              radius={shape.listCard}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 64 }}
            >
              <Avatar name={n} />
              <View style={{ flex: 1 }}>
                <T v="bodyStrong">{n}</T>
                <T v="caption">
                  {s.played} matches · {s.played ? Math.round((s.won / s.played) * 100) : 0}% wins
                </T>
              </View>
            </GlassSurface>
          </Pressable>
        );
      })}
    </Screen>
  );
}
