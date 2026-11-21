import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { playerNames } from '@/lib/stats';
import { useApp } from '@/store';
import { Button, Chip, Field, GlassSurface, Header, Screen, Section, T } from '@/ui';
import { RulesEditor } from '@/ui/rules';
import { rulesLine } from '@/engine';
import { uid } from '@/lib/util';

export default function NewMatch() {
  const router = useRouter();
  const defaults = useApp((s) => s.settings.defaultRules);
  const startMatch = useApp((s) => s.startMatch);
  const matches = useApp((s) => s.matches);
  const [names, setNames] = useState(['', '', '', '']);
  const [rules, setRules] = useState(defaults);
  const [focus, setFocus] = useState(0);
  const known = playerNames(Object.values(matches))
    .filter((n) => !names.includes(n))
    .slice(0, 8);
  const set = (i: number, v: string) => setNames((n) => n.map((x, j) => (j === i ? v : x)));
  const filled = names.map((n, i) => n.trim() || `Player ${i + 1}`) as [string, string, string, string];

  const start = () => {
    const id = startMatch(
      [
        { id: uid(), players: [filled[0], filled[1]] },
        { id: uid(), players: [filled[2], filled[3]] },
      ],
      rules,
    );
    router.replace(`/match/${id}`);
  };

  return (
    <Screen
      header={<Header title="New match" />}
      footer={
        <View style={{ paddingVertical: 12, gap: 8 }}>
          <T v="caption" style={{ textAlign: 'center' }}>
            {rulesLine(rules)}
          </T>
          <Button label="Start match" icon="play-arrow" onPress={start} />
        </View>
      }
    >
      {[0, 1].map((team) => (
        <Section key={team} title={`Team ${team + 1}`}>
          <GlassSurface style={{ padding: 16, gap: 12 }}>
            {[0, 1].map((p) => {
              const i = team * 2 + p;
              return (
                <Field
                  key={i}
                  label={`Player ${p + 1}`}
                  placeholder={`Player ${i + 1}`}
                  value={names[i]}
                  onChangeText={(v) => set(i, v)}
                />
              );
            })}
          </GlassSurface>
        </Section>
      ))}
      {known.length > 0 && (
        <Section title="Recent players">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {known.map((n) => (
              <Chip
                key={n}
                label={n}
                onPress={() => {
                  const i = names.findIndex((x) => !x.trim());
                  set(i < 0 ? focus % 4 : i, n);
                  setFocus(focus + 1);
                }}
              />
            ))}
          </View>
        </Section>
      )}
      <Section title="Rules">
        <GlassSurface style={{ padding: 16 }}>
          <RulesEditor rules={rules} onChange={setRules} />
        </GlassSurface>
      </Section>
    </Screen>
  );
}
