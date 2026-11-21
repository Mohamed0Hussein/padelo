import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, View } from 'react-native';
import { orderedSlots, placings, scoreText, teamName, toCsv } from '@/tournament/util';
import { tournamentChampion } from '@/tournament/draw';
import { useApp } from '@/store';
import { useTheme } from '@/theme';
import { Button, GlassSurface, Header, Icon, Mono, Screen, Section, T } from '@/ui';

export default function TournamentResults() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const t = useApp((s) => s.tournaments[id]);
  if (!t)
    return (
      <Screen header={<Header title="Results" />}>
        <T>Not found.</T>
      </Screen>
    );
  const champ = tournamentChampion(t) ?? placings(t)[0];
  const order = placings(t);
  const played = t.matches.filter((m) => m.result);
  const sum = (f: (r: NonNullable<(typeof played)[0]['result']>) => number) =>
    played.reduce((n, m) => n + f(m.result!), 0);
  const stats: [string, number][] = [
    ['Matches', played.length],
    ['Sets', sum((r) => r.sets.length)],
    ['Games', sum((r) => r.games[0] + r.games[1])],
    ['Golden points', sum((r) => r.golden[0] + r.golden[1])],
    ['Tiebreaks', sum((r) => r.tiebreaks[0] + r.tiebreaks[1])],
  ];

  const exportCsv = async () => {
    try {
      const file = new FileSystem.File(FileSystem.Paths.cache, `${t.name.replace(/\W+/g, '_') || 'tournament'}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write(toCsv(t));
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export CSV' });
    } catch {
      Alert.alert('Could not export CSV');
    }
  };

  return (
    <Screen header={<Header title="Results" subtitle={t.name} />}>
      <GlassSurface radius={28} strong style={{ padding: 24, alignItems: 'center', gap: 8 }}>
        <Icon name="emoji-events" size={44} color={c.primary} />
        <T v="overline">Champions</T>
        <T v="title" style={{ textAlign: 'center' }}>
          {champ ? teamName(t, champ) : 'Not decided yet'}
        </T>
      </GlassSurface>

      <Section title="Final placings">
        {order.map((tid, i) => (
          <GlassSurface
            key={tid}
            radius={16}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 48 }}
          >
            <Mono style={{ width: 24 }}>{i + 1}</Mono>
            <T v="bodyStrong" style={{ flex: 1 }}>
              {teamName(t, tid)}
            </T>
          </GlassSurface>
        ))}
      </Section>

      <Section title="Stats">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {stats.map(([k, v]) => (
            <GlassSurface key={k} radius={20} style={{ padding: 14, width: '31%', flexGrow: 1 }}>
              <Mono size={22}>{v}</Mono>
              <T v="caption">{k}</T>
            </GlassSurface>
          ))}
        </View>
      </Section>

      <Section title="Results">
        {orderedSlots(t)
          .filter((m) => m.result)
          .map((m) => (
            <GlassSurface key={m.id} radius={16} style={{ padding: 12, gap: 2 }}>
              <T v="caption">{m.stage === 'group' ? `Group ${m.group}` : m.roundLabel}</T>
              <T v="bodyStrong">
                {teamName(t, m.a)} vs {teamName(t, m.b)}
              </T>
              <Mono size={14}>{scoreText(m)}</Mono>
            </GlassSurface>
          ))}
      </Section>

      <Button icon="download" label="Export CSV" onPress={exportCsv} />
      <Button kind="outline" icon="home" label="Home" onPress={() => router.replace('/')} />
    </Screen>
  );
}
