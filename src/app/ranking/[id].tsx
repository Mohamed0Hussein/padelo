import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { RANK_LABEL } from '@/tournament/standings';
import { DEFAULT_RANKING, type RankingRules } from '@/lib/types';
import { useApp } from '@/store';
import { Button, GlassSurface, Header, IconBtn, Mono, Screen, Section, Stepper, T } from '@/ui';

export default function RankingRulesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useApp((s) => s.tournaments[id]);
  const [r, setR] = useState<RankingRules>(t?.rankingRules ?? DEFAULT_RANKING);
  if (!t)
    return (
      <Screen header={<Header title="Ranking rules" />}>
        <T>Not found.</T>
      </Screen>
    );

  const move = (i: number, d: -1 | 1) =>
    setR((x) => {
      const order = [...x.order];
      [order[i], order[i + d]] = [order[i + d], order[i]];
      return { ...x, order };
    });
  const steppers: [string, keyof Omit<RankingRules, 'order'>][] = [
    ['Points for a win', 'winPoints'],
    ['Points for a loss', 'lossPoints'],
    ['Bonus for winning 2–0', 'straightSetsBonus'],
  ];

  return (
    <Screen
      header={<Header title="Ranking rules" subtitle={t.name} />}
      footer={
        <View style={{ paddingVertical: 12 }}>
          <Button
            icon="check"
            label="Save"
            onPress={() => {
              useApp.getState().saveTournament({ ...t, rankingRules: r });
              router.back();
            }}
          />
        </View>
      }
    >
      <GlassSurface style={{ padding: 16, gap: 8 }}>
        {steppers.map(([label, k]) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T>{label}</T>
            <Stepper label={label} value={r[k]} min={0} max={9} onChange={(v) => setR({ ...r, [k]: v })} />
          </View>
        ))}
      </GlassSurface>
      <Section title="Tie-break order">
        {r.order.map((k, i) => (
          <GlassSurface
            key={k}
            radius={16}
            style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, minHeight: 56 }}
          >
            <Mono style={{ width: 24 }}>{i + 1}</Mono>
            <T v="bodyStrong" style={{ flex: 1 }}>
              {RANK_LABEL[k]}
            </T>
            <IconBtn
              icon="arrow-upward"
              label={`Move ${RANK_LABEL[k]} up`}
              disabled={i === 0}
              onPress={() => move(i, -1)}
            />
            <IconBtn
              icon="arrow-downward"
              label={`Move ${RANK_LABEL[k]} down`}
              disabled={i === r.order.length - 1}
              onPress={() => move(i, 1)}
            />
          </GlassSurface>
        ))}
      </Section>
      <GlassSurface radius={16} style={{ padding: 16 }}>
        <T v="caption">
          A win is {r.winPoints} pts{r.straightSetsBonus ? `, +${r.straightSetsBonus} for a 2–0 win` : ''}; a loss is{' '}
          {r.lossPoints}. Teams level on points are split by:{' '}
          {r.order.map((k) => RANK_LABEL[k].toLowerCase()).join(', then ')}.
        </T>
      </GlassSurface>
    </Screen>
  );
}
