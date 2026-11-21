import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { playerStats } from '@/lib/stats';
import { useApp } from '@/store';
import { useTheme } from '@/theme';
import { Avatar, Button, Empty, GlassSurface, Header, Mono, Screen, Section, T } from '@/ui';
import { MatchCard } from '@/ui/match';

export default function PlayerProfile() {
  const { name: raw } = useLocalSearchParams<{ name: string }>();
  const name = decodeURIComponent(raw);
  const router = useRouter();
  const { c } = useTheme();
  const matches = useApp((s) => s.matches);
  const s = playerStats(Object.values(matches), name);
  const grid: [string, string | number][] = [
    ['Matches', s.played],
    ['Wins', s.won],
    ['Win rate', s.played ? `${Math.round((s.won / s.played) * 100)}%` : '–'],
    ['Sets won', s.setsWon],
    ['Games won', s.gamesWon],
    ['Golden points', s.golden],
    ['Tiebreaks won', s.tiebreaks],
  ];
  return (
    <Screen header={<Header title="Player" />}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar name={name} size={80} />
        <T v="title">{name}</T>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {grid.map(([k, v]) => (
          <GlassSurface key={k} radius={20} style={{ padding: 14, width: '31%', flexGrow: 1, gap: 2 }}>
            <Mono size={22}>{v}</Mono>
            <T v="caption">{k}</T>
          </GlassSurface>
        ))}
      </View>
      <Section title="Last 10">
        {s.form.length === 0 ? (
          <T v="caption">No matches yet.</T>
        ) : (
          <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={`Form: ${s.form.join(' ')}`}>
            {s.form.map((f, i) => (
              <View
                key={i}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: f === 'W' ? c.primarySoft : 'rgba(252,165,165,0.18)',
                }}
              >
                <T v="label" style={{ color: f === 'W' ? c.win : c.loss }}>
                  {f}
                </T>
              </View>
            ))}
          </View>
        )}
      </Section>
      <Section title="Partners">
        {s.partners.length === 0 ? (
          <T v="caption">No partners yet.</T>
        ) : (
          s.partners.map((p) => (
            <GlassSurface
              key={p.name}
              radius={16}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 12, minHeight: 48, gap: 10 }}
            >
              <Avatar name={p.name} size={32} />
              <T style={{ flex: 1 }}>{p.name}</T>
              <Mono>{Math.round((p.won / p.played) * 100)}%</Mono>
              <T v="caption">{p.played} played</T>
            </GlassSurface>
          ))
        )}
      </Section>
      <Button kind="outline" icon="compare-arrows" label="Head to head" onPress={() => router.push('/h2h')} />
      <Section title="Recent matches">
        {s.matches.length === 0 ? (
          <Empty icon="sports-tennis" title="Nothing yet" text="Matches this player finishes appear here." />
        ) : (
          s.matches
            .slice(0, 5)
            .map((m) => <MatchCard key={m.id} m={m} onPress={() => router.push(`/result/${m.id}`)} />)
        )}
      </Section>
    </Screen>
  );
}
