import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { shape } from '@/theme';
import { Button, Empty, GlassSurface, Header, ProgressBar, Screen, T } from '@/ui';
import { useApp } from '@/store';
import { FORMAT_NAME as FORMAT } from '@/lib/util';

export default function Tournaments() {
  const router = useRouter();
  const tournamentMap = useApp((s) => s.tournaments);
  const list = Object.values(tournamentMap).sort((a, b) => b.createdAt - a.createdAt);
  return (
    <Screen header={<Header back={false} title="Tournaments" />}>
      <Button icon="add" label="Host tournament" onPress={() => router.push('/tournament/create')} />
      {list.length === 0 && (
        <Empty icon="emoji-events" title="No tournaments yet" text="Create one to get a draw, tables and a bracket." />
      )}
      {list.map((t) => {
        const total = t.format === 'AMERICANO' ? t.rounds!.length : t.matches.filter((m) => !m.bye).length;
        const done =
          t.format === 'AMERICANO'
            ? t.rounds!.filter((r) => r.locked).length
            : t.matches.filter((m) => m.result && !m.bye).length;
        return (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${t.name}`}
            onPress={() => router.push(t.format === 'AMERICANO' ? `/americano/${t.id}` : `/tournament/${t.id}`)}
          >
            <GlassSurface radius={shape.listCard} style={{ padding: 16, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T v="titleSmall">{t.name}</T>
                <T v="caption">{t.date}</T>
              </View>
              <T v="caption">
                {FORMAT[t.format]} · {t.format === 'AMERICANO' ? t.players!.length : t.teams.length}{' '}
                {t.format === 'AMERICANO' ? 'players' : 'teams'}
                {t.venue ? ` · ${t.venue}` : ''}
              </T>
              <ProgressBar value={total ? done / total : 0} />
            </GlassSurface>
          </Pressable>
        );
      })}
    </Screen>
  );
}
