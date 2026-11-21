import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { americanoBoard, setAmericanoScore } from '@/tournament/americano';
import { useApp } from '@/store';
import { useTheme } from '@/theme';
import { Button, Chip, GlassSurface, Header, IconBtn, Mono, Screen, Segmented, T } from '@/ui';

export default function Americano() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const t = useApp((s) => s.tournaments[id]);
  const [tab, setTab] = useState<'rounds' | 'board'>('rounds');
  const [sel, setSel] = useState<number | null>(null);
  if (!t?.rounds || !t.players)
    return (
      <Screen header={<Header title="Americano" />}>
        <T>Not found.</T>
      </Screen>
    );

  const total = t.pointsPerMatch ?? 24;
  const current = t.rounds.findIndex((r) => !r.locked);
  const idx = sel ?? (current < 0 ? t.rounds.length - 1 : current);
  const round = t.rounds[idx];
  const board = americanoBoard(t.players, t.rounds);
  const st = useApp.getState();

  return (
    <Screen
      header={
        <Header
          title={t.name}
          subtitle={`${t.players.length} players · ${t.courts.length} courts · ${total} points per match`}
          right={<IconBtn icon="cast" label="Share live" onPress={() => router.push(`/share-live/${t.id}`)} />}
        />
      }
      footer={
        tab === 'rounds' && !round.locked ? (
          <View style={{ paddingVertical: 12 }}>
            <Button
              icon="skip-next"
              label={idx === t.rounds.length - 1 ? 'Lock results · finish' : `Lock results · start round ${idx + 2}`}
              onPress={() => {
                st.lockAmericanoRound(t.id, round.index);
                setSel(null);
              }}
            />
          </View>
        ) : undefined
      }
    >
      <Segmented
        label="View"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'rounds', label: 'Rounds' },
          { value: 'board', label: 'Leaderboard' },
        ]}
      />

      {tab === 'rounds' ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {t.rounds.map((r) => (
              <Chip
                key={r.index}
                label={`R${r.index + 1}`}
                icon={r.locked ? 'lock' : undefined}
                selected={r.index === idx}
                onPress={() => setSel(r.index)}
              />
            ))}
          </View>
          {round.matches.map((m, mi) => (
            <GlassSurface key={mi} style={{ padding: 16, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T v="overline">Court {m.court}</T>
                <T v="caption">{round.locked ? 'Locked' : `${m.pointsA + m.pointsB}/${total}`}</T>
              </View>
              {(['A', 'B'] as const).map((side) => {
                const names = side === 'A' ? m.a : m.b;
                const pts = side === 'A' ? m.pointsA : m.pointsB;
                const upd = (d: 1 | -1) =>
                  st.setAmericanoScore(t.id, round.index, mi, setAmericanoScore(m, side, d, total));
                return (
                  <View key={side} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52 }}>
                    <T v="bodyStrong" style={{ flex: 1 }} numberOfLines={2}>
                      {names.join(' & ')}
                    </T>
                    {!round.locked && (
                      <IconBtn
                        icon="remove"
                        label={`Remove point from ${names.join(' and ')}`}
                        filled
                        onPress={() => upd(-1)}
                        disabled={pts === 0}
                      />
                    )}
                    <Mono size={22} style={{ minWidth: 40, textAlign: 'center' }}>
                      {pts}
                    </Mono>
                    {!round.locked && (
                      <IconBtn
                        icon="add"
                        label={`Add point to ${names.join(' and ')}`}
                        filled
                        onPress={() => upd(1)}
                        disabled={m.pointsA + m.pointsB >= total}
                      />
                    )}
                  </View>
                );
              })}
              {!round.locked && m.pointsA + m.pointsB < total && (
                <T v="caption" style={{ color: c.primary }}>
                  {total - m.pointsA - m.pointsB} points left to play
                </T>
              )}
            </GlassSurface>
          ))}
          <T v="caption">Partners rotate every round: everyone partners everyone once.</T>
        </>
      ) : (
        <GlassSurface style={{ paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, minHeight: 32, alignItems: 'center' }}>
            <T v="overline" style={{ width: 28 }}>
              #
            </T>
            <T v="overline" style={{ flex: 1 }}>
              Player
            </T>
            {['P', '+/−', 'Pts'].map((h) => (
              <T key={h} v="overline" style={{ width: 44, textAlign: 'center' }}>
                {h}
              </T>
            ))}
          </View>
          {board.map((b, i) => (
            <View
              key={b.name}
              accessible
              accessibilityLabel={`${i + 1}. ${b.name}, ${b.pts} points, difference ${b.diff}`}
              style={{ flexDirection: 'row', paddingHorizontal: 16, minHeight: 48, alignItems: 'center' }}
            >
              <Mono size={14} style={{ width: 28 }}>
                {i + 1}
              </Mono>
              <T v="bodyStrong" style={{ flex: 1 }}>
                {b.name}
              </T>
              <Mono size={14} style={{ width: 44, textAlign: 'center' }}>
                {b.played}
              </Mono>
              <Mono size={14} style={{ width: 44, textAlign: 'center' }} color={b.diff >= 0 ? c.win : c.loss}>
                {b.diff > 0 ? `+${b.diff}` : b.diff}
              </Mono>
              <Mono size={14} style={{ width: 44, textAlign: 'center' }} color={c.primary}>
                {b.pts}
              </Mono>
            </View>
          ))}
        </GlassSurface>
      )}
    </Screen>
  );
}
