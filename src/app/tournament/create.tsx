import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import type { MatchRules } from '@/engine';
import { matchCount, shuffle } from '@/tournament/draw';
import { DEFAULT_RANKING, type Format } from '@/lib/types';
import { uid } from '@/lib/util';
import { useApp } from '@/store';
import { font, useTheme } from '@/theme';
import { Button, Field, GlassSurface, Header, Icon, Screen, Section, Stepper, SwitchRow, T } from '@/ui';
import { RulesEditor } from '@/ui/rules';

const FORMATS: { id: Format; title: string; sub: string; icon: string }[] = [
  { id: 'ROUND_ROBIN', title: 'Round robin', sub: 'Everyone plays everyone', icon: 'sync' },
  { id: 'GROUPS_KNOCKOUT', title: 'Groups + knockout', sub: 'Groups of 4, top 2 advance', icon: 'account-tree' },
  { id: 'KNOCKOUT', title: 'Knockout', sub: 'Lose and you are out', icon: 'sports-score' },
  { id: 'AMERICANO', title: 'Americano', sub: 'Partners rotate every round', icon: 'shuffle' },
];

export default function CreateTournament() {
  const router = useRouter();
  const { c } = useTheme();
  const settings = useApp((s) => s.settings);
  const create = useApp((s) => s.createTournament);
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [venue, setVenue] = useState('');
  const [format, setFormat] = useState<Format>('GROUPS_KNOCKOUT');
  const [rules, setRules] = useState(settings.defaultRules);
  const [diffFinal, setDiffFinal] = useState(false);
  const [finalRules, setFinalRules] = useState<MatchRules>({ ...settings.defaultRules, bestOf: 3 });
  const [count, setCount] = useState(8);
  const [names, setNames] = useState<string[]>([]);
  const [points, setPoints] = useState(24);

  const americano = format === 'AMERICANO';
  const n = americano ? Math.max(4, Math.ceil(count / 4) * 4) : count;
  const cell = (i: number) => names[i] ?? '';
  const setCell = (i: number, v: string) =>
    setNames((xs) => {
      const a = [...xs];
      a[i] = v;
      return a;
    });
  const label = americano ? 'Player' : 'Team';

  const submit = () => {
    const id = americano
      ? create({
          name: name.trim() || 'Americano',
          date,
          venue,
          format,
          rules,
          rankingRules: DEFAULT_RANKING,
          teams: [],
          players: Array.from({ length: n }, (_, i) => cell(i * 1).trim() || `Player ${i + 1}`),
          pointsPerMatch: points,
          courtCount: n / 4,
        })
      : create({
          name: name.trim() || 'Tournament',
          date,
          venue,
          format,
          rules,
          finalRules: diffFinal ? finalRules : undefined,
          rankingRules: DEFAULT_RANKING,
          teams: Array.from({ length: n }, (_, i) => ({
            id: uid() + i,
            players: [cell(i * 2).trim() || `Team ${i + 1}`, cell(i * 2 + 1).trim()] as [string, string],
          })),
          courtCount: 2,
        });
    router.replace(americano ? `/americano/${id}` : `/tournament/${id}`);
  };

  return (
    <Screen
      header={<Header title="New tournament" />}
      footer={
        <View style={{ paddingVertical: 12 }}>
          <Button icon="casino" label="Create & make draw" onPress={submit} />
        </View>
      }
    >
      <GlassSurface style={{ padding: 16, gap: 12 }}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Friday night cup" />
        <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <Field label="Venue" value={venue} onChangeText={setVenue} placeholder="Club or court" />
      </GlassSurface>

      <Section title="Format">
        {FORMATS.map((f) => {
          const on = f.id === format;
          return (
            <Pressable
              key={f.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${f.title}, ${matchCount(f.id, n)} matches`}
              onPress={() => setFormat(f.id)}
            >
              <GlassSurface
                radius={20}
                tint={on ? c.primarySoft : undefined}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  minHeight: 64,
                  borderColor: on ? c.primary : c.glassStroke,
                }}
              >
                <Icon name={f.icon} color={on ? c.primary : c.onSurface} />
                <View style={{ flex: 1 }}>
                  <T v="bodyStrong">{f.title}</T>
                  <T v="caption">{f.sub}</T>
                </View>
                <T v="label">{matchCount(f.id, n)} matches</T>
              </GlassSurface>
            </Pressable>
          );
        })}
      </Section>

      <Section
        title={americano ? 'Players' : 'Teams'}
        action={
          <Button
            kind="tonal"
            compact
            icon="shuffle"
            label="Shuffle"
            onPress={() =>
              setNames((xs) => {
                const out = Array.from({ length: americano ? n : n * 2 }, (_, i) => xs[i] ?? '');
                return shuffle(out);
              })
            }
          />
        }
      >
        <GlassSurface style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T>{americano ? 'Players (multiples of 4)' : 'Number of teams'}</T>
            <Stepper
              label={americano ? 'players' : 'teams'}
              value={count}
              min={americano ? 4 : 2}
              max={americano ? 16 : 32}
              step={americano ? 4 : 1}
              onChange={setCount}
            />
          </View>
          {americano && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T>Points per match</T>
              <Stepper label="points per match" value={points} min={8} max={64} step={4} onChange={setPoints} />
            </View>
          )}
          {Array.from({ length: n }, (_, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <T v="label" style={{ width: 24 }}>
                {i + 1}
              </T>
              {(americano ? [0] : [0, 1]).map((p) => (
                <TextInput
                  underlineColorAndroid="transparent"
                  key={p}
                  accessibilityLabel={`${label} ${i + 1}${americano ? '' : ` player ${p + 1}`}`}
                  placeholder={americano ? `Player ${i + 1}` : `Player ${p + 1}`}
                  placeholderTextColor={c.onSurfaceMuted}
                  value={cell(americano ? i : i * 2 + p)}
                  onChangeText={(v) => setCell(americano ? i : i * 2 + p, v)}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    color: c.onSurface,
                    fontFamily: font.regular,
                    backgroundColor: c.glass,
                    borderWidth: 1,
                    borderColor: c.glassStroke,
                  }}
                />
              ))}
            </View>
          ))}
        </GlassSurface>
      </Section>

      {!americano && (
        <Section title="Match rules">
          <GlassSurface style={{ padding: 16, gap: 8 }}>
            <RulesEditor rules={rules} onChange={setRules} />
            {format !== 'ROUND_ROBIN' && (
              <SwitchRow label="Different rules for the final" value={diffFinal} onChange={setDiffFinal} />
            )}
            {diffFinal && <RulesEditor rules={finalRules} onChange={setFinalRules} />}
          </GlassSurface>
        </Section>
      )}
    </Screen>
  );
}
