import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import type { TMatch } from '@/lib/types';
import { nextSlot, playable, scoreText, teamName } from '@/tournament/util';
import { useApp } from '@/store';
import { useTheme } from '@/theme';
import { Button, GlassSurface, Header, Mono, Screen, T } from '@/ui';

const CARD_H = 96;

export default function Bracket() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const t = useApp((s) => s.tournaments[id]);
  if (!t)
    return (
      <Screen header={<Header title="Bracket" />}>
        <T>Not found.</T>
      </Screen>
    );
  const ko = t.matches.filter((m) => m.stage === 'ko');
  const rounds = Math.max(-1, ...ko.map((m) => m.round)) + 1;
  const next = nextSlot(t);

  const open = (m: TMatch) => {
    if (m.result && m.matchId) return router.push(`/result/${m.matchId}`);
    if (m.matchId && !m.result) return router.push(`/match/${m.matchId}`);
    if (!playable(m)) return;
    const mid = useApp.getState().startSlot(t.id, m.id);
    if (mid) router.push(`/match/${mid}`);
  };

  return (
    <Screen
      scroll={false}
      pad={false}
      header={<Header title="Knockout" subtitle={t.name} />}
      footer={
        next && next.stage === 'ko' ? (
          <View style={{ paddingVertical: 12 }}>
            <Button
              icon="play-arrow"
              label={`Next: ${teamName(t, next.a)} vs ${teamName(t, next.b)}`}
              onPress={() => open(next)}
            />
          </View>
        ) : undefined
      }
    >
      <ScrollView horizontal contentContainerStyle={{ padding: 16, gap: 28 }}>
        {Array.from({ length: rounds }, (_, r) => {
          const col = ko.filter((m) => m.round === r).sort((a, b) => a.idx - b.idx);
          return (
            <View key={r} style={{ width: 210 }}>
              <T v="overline" style={{ marginBottom: 8 }}>
                {col[0]?.roundLabel}
              </T>
              <View style={{ flex: 1, justifyContent: 'space-around' }}>
                {col.map((m) => {
                  const live = !!m.matchId && !m.result;
                  return (
                    <View key={m.id} style={{ minHeight: CARD_H * 2 ** r, justifyContent: 'center' }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${teamName(t, m.a)} versus ${teamName(t, m.b)}${m.result ? `, ${scoreText(m)}` : ''}`}
                        onPress={() => open(m)}
                      >
                        <GlassSurface
                          radius={16}
                          tint={live ? c.primarySoft : undefined}
                          style={{ padding: 10, gap: 6, borderColor: live ? c.primary : c.glassStroke }}
                        >
                          {([0, 1] as const).map((s) => {
                            const tid = s === 0 ? m.a : m.b;
                            const won = m.result?.winner === s;
                            return (
                              <View
                                key={s}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 28 }}
                              >
                                <T
                                  v={won ? 'bodyStrong' : 'body'}
                                  numberOfLines={1}
                                  style={{
                                    flex: 1,
                                    color: m.bye && !tid ? c.onSurfaceMuted : won ? c.win : c.onSurface,
                                  }}
                                >
                                  {m.bye && !tid ? 'Bye' : teamName(t, tid)}
                                </T>
                                {m.result && <Mono size={13}>{m.result.sets.map((x) => x[s]).join(' ')}</Mono>}
                              </View>
                            );
                          })}
                        </GlassSurface>
                      </Pressable>
                      {r < rounds - 1 && (
                        <View
                          style={{
                            position: 'absolute',
                            right: -28,
                            width: 28,
                            height: 2,
                            backgroundColor: c.glassStroke,
                            top: '50%',
                          }}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
