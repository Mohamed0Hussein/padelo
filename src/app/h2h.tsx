import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { headToHead, knownTeams, teamsKey } from '@/lib/stats';
import { teamLabel } from '@/lib/util';
import { useApp } from '@/store';
import { useTheme } from '@/theme';
import { Chip, Empty, GlassSurface, Header, Mono, Screen, Section, T } from '@/ui';
import { MatchCard } from '@/ui/match';

export default function HeadToHead() {
  const router = useRouter();
  const { c } = useTheme();
  const ms = Object.values(useApp((s) => s.matches));
  const teams = knownTeams(ms);
  const [ka, setA] = useState<string | null>(null);
  const [kb, setB] = useState<string | null>(null);
  const a = teams.find((t) => teamsKey(t) === ka);
  const b = teams.find((t) => teamsKey(t) === kb);
  const h = a && b ? headToHead(ms, a, b) : null;

  const rows: [string, number, number][] = h
    ? [
        ['Matches won', h.a.won, h.b.won],
        ['Sets', h.a.setsWon, h.b.setsWon],
        ['Games', h.a.gamesWon, h.b.gamesWon],
        ['Golden points', h.a.golden, h.b.golden],
        ['Tiebreaks', h.a.tiebreaks, h.b.tiebreaks],
      ]
    : [];

  return (
    <Screen header={<Header title="Head to head" />}>
      {teams.length < 2 ? (
        <Empty
          icon="compare-arrows"
          title="Not enough data"
          text="Finish matches with at least two different pairs to compare them."
        />
      ) : (
        <>
          {(
            [
              ['Team 1', ka, setA],
              ['Team 2', kb, setB],
            ] as const
          ).map(([title, sel, setter]) => (
            <Section key={title} title={title}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {teams.map((t) => (
                  <Chip
                    key={teamsKey(t)}
                    label={teamLabel(t)}
                    selected={sel === teamsKey(t)}
                    onPress={() => setter(teamsKey(t))}
                  />
                ))}
              </View>
            </Section>
          ))}
          {h && a && b && (
            <>
              <GlassSurface style={{ padding: 16, gap: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T v="bodyStrong" style={{ flex: 1 }}>
                    {teamLabel(a)}
                  </T>
                  <T v="bodyStrong" style={{ flex: 1, textAlign: 'right' }}>
                    {teamLabel(b)}
                  </T>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Mono size={32}>
                    {h.a.won} – {h.b.won}
                  </Mono>
                  <T v="caption">{h.meetings.length} meetings</T>
                </View>
                {rows.map(([label, x, y]) => (
                  <View key={label} style={{ gap: 4 }} accessible accessibilityLabel={`${label}: ${x} to ${y}`}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Mono>{x}</Mono>
                      <T v="caption">{label}</T>
                      <Mono>{y}</Mono>
                    </View>
                    <View style={{ flexDirection: 'row', height: 6, gap: 3 }}>
                      <View style={{ flex: x || 0.0001, backgroundColor: c.primary, borderRadius: 3 }} />
                      <View style={{ flex: y || 0.0001, backgroundColor: c.live, borderRadius: 3 }} />
                    </View>
                  </View>
                ))}
              </GlassSurface>
              <Section title="Past meetings">
                {h.meetings.length === 0 ? (
                  <T v="caption">These pairs have not met yet.</T>
                ) : (
                  h.meetings.map((m) => <MatchCard key={m.id} m={m} onPress={() => router.push(`/result/${m.id}`)} />)
                )}
              </Section>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
