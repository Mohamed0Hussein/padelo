import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { groupStandings } from '@/tournament/standings';
import { nextSlot, orderedSlots, playable, progress, scoreText, teamName } from '@/tournament/util';
import { tournamentChampion } from '@/tournament/draw';
import type { TMatch, Tournament } from '@/lib/types';
import { useApp } from '@/store';
import { FORMAT_NAME as FORMAT } from '@/lib/util';
import { shape, useTheme } from '@/theme';
import { Button, Chip, GlassSurface, Header, Icon, IconBtn, Mono, ProgressBar, Screen, Segmented, T } from '@/ui';

export default function TournamentHub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const t = useApp((s) => s.tournaments[id]);
  const [tab, setTab] = useState<'groups' | 'matches' | 'knockout'>(t?.format === 'KNOCKOUT' ? 'knockout' : 'groups');
  if (!t)
    return (
      <Screen header={<Header title="Tournament" />}>
        <T>Not found.</T>
      </Screen>
    );

  const { done, total } = progress(t);
  const champ = tournamentChampion(t);
  const next = nextSlot(t);
  const hasGroups = t.groups.length > 0;
  const hasKo = t.matches.some((m) => m.stage === 'ko');
  const tabs = [
    ...(hasGroups ? [{ value: 'groups' as const, label: t.format === 'ROUND_ROBIN' ? 'Table' : 'Groups' }] : []),
    { value: 'matches' as const, label: 'Matches' },
    ...(hasKo ? [{ value: 'knockout' as const, label: 'Knockout' }] : []),
  ];

  const open = (m: TMatch) => {
    if (m.result && m.matchId) return router.push(`/result/${m.matchId}`);
    if (!playable(m)) return;
    const mid = useApp.getState().startSlot(t.id, m.id);
    if (mid) router.push(`/match/${mid}`);
  };

  return (
    <Screen
      header={
        <Header
          title={t.name}
          subtitle={[FORMAT[t.format], t.venue, t.date].filter(Boolean).join(' · ')}
          right={
            <>
              <IconBtn icon="stadium" label="Courts" onPress={() => router.push(`/courts/${t.id}`)} />
              <IconBtn icon="cast" label="Share live" onPress={() => router.push(`/share-live/${t.id}`)} />
            </>
          }
        />
      }
      footer={
        <View style={{ paddingVertical: 12 }}>
          {champ || !next ? (
            <Button icon="emoji-events" label="Results" onPress={() => router.push(`/results/${t.id}`)} />
          ) : (
            <Button
              icon="play-arrow"
              label="Score a match"
              a11y={`Score ${teamName(t, next.a)} versus ${teamName(t, next.b)}`}
              onPress={() => open(next)}
            />
          )}
        </View>
      }
    >
      <GlassSurface style={{ padding: 16, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T v="bodyStrong">{champ ? `Champions: ${teamName(t, champ)}` : 'In progress'}</T>
          <T v="caption">
            {done}/{total} matches
          </T>
        </View>
        <ProgressBar value={total ? done / total : 0} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Chip icon="military-tech" label="Ranking rules" onPress={() => router.push(`/ranking/${t.id}`)} />
          {(champ || !next) && (
            <Chip icon="emoji-events" label="Results" onPress={() => router.push(`/results/${t.id}`)} />
          )}
        </View>
      </GlassSurface>

      {tabs.length > 1 && <Segmented label="Tournament view" value={tab} onChange={setTab} options={tabs} />}

      {tab === 'groups' &&
        hasGroups &&
        t.groups.map((g) => (
          <GroupTable key={g.name} t={t} group={g.name} qualify={t.format === 'GROUPS_KNOCKOUT' ? 2 : 0} />
        ))}

      {tab === 'matches' && <MatchList t={t} onOpen={open} />}

      {tab === 'knockout' && (
        <View style={{ gap: 12 }}>
          <Button
            kind="tonal"
            icon="account-tree"
            label="Open bracket"
            onPress={() => router.push(`/bracket/${t.id}`)}
          />
          {orderedSlots(t)
            .filter((m) => m.stage === 'ko' && !m.bye)
            .map((m) => (
              <MatchRow key={m.id} t={t} m={m} onPress={() => open(m)} />
            ))}
          <T v="caption" style={{ color: c.onSurfaceMuted }}>
            Rules: {t.finalRules ? 'the final has its own rules' : 'same rules for every match'}.
          </T>
        </View>
      )}
    </Screen>
  );
}

function GroupTable({ t, group, qualify }: { t: Tournament; group: string; qualify: number }) {
  const { c } = useTheme();
  const rows = groupStandings(t, group);
  const cols = ['P', 'W', 'L', 'SD', 'Pts'];
  return (
    <GlassSurface radius={shape.card} style={{ paddingVertical: 8 }}>
      <View style={{ paddingHorizontal: 16, minHeight: 36, flexDirection: 'row', alignItems: 'center' }}>
        <T v="overline" style={{ flex: 1 }}>
          {t.format === 'ROUND_ROBIN' ? 'League table' : `Group ${group}`}
        </T>
        {cols.map((k) => (
          <T key={k} v="overline" style={{ width: 34, textAlign: 'center' }}>
            {k}
          </T>
        ))}
      </View>
      {rows.map((r, i) => (
        <View
          key={r.teamId}
          accessible
          accessibilityLabel={`${i + 1}. ${teamName(t, r.teamId)}, ${r.won} wins, ${r.points} points${i < qualify ? ', qualifies' : ''}`}
          style={{
            paddingHorizontal: 16,
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            borderLeftWidth: 3,
            borderLeftColor: i < qualify ? c.primary : 'transparent',
          }}
        >
          <T v="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
            {i + 1}. {teamName(t, r.teamId)}
          </T>
          {[r.played, r.won, r.lost, r.setsFor - r.setsAgainst, r.points].map((v, j) => (
            <Mono
              key={j}
              size={14}
              color={j === 4 ? c.primary : c.onSurface}
              style={{ width: 34, textAlign: 'center' }}
            >
              {v}
            </Mono>
          ))}
        </View>
      ))}
    </GlassSurface>
  );
}

function MatchList({ t, onOpen }: { t: Tournament; onOpen: (m: TMatch) => void }) {
  const slots = orderedSlots(t).filter((m) => !m.bye);
  const sections: { title: string; items: TMatch[] }[] = [];
  for (const m of slots) {
    const title =
      m.stage === 'group' ? (t.groups.length > 1 ? `${m.roundLabel} · Group ${m.group}` : m.roundLabel) : m.roundLabel;
    const last = sections[sections.length - 1];
    if (last?.title === title) last.items.push(m);
    else sections.push({ title, items: [m] });
  }
  return (
    <View style={{ gap: 16 }}>
      {sections.map((s) => (
        <View key={s.title} style={{ gap: 8 }}>
          <T v="overline">{s.title}</T>
          {s.items.map((m) => (
            <MatchRow key={m.id} t={t} m={m} onPress={() => onOpen(m)} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function MatchRow({ t, m, onPress }: { t: Tournament; m: TMatch; onPress: () => void }) {
  const { c } = useTheme();
  const live = !!m.matchId && !m.result;
  const state = m.result ? scoreText(m) : live ? 'Live' : playable(m) ? 'Score' : 'Waiting';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!playable(m) && !m.result && !live}
      accessibilityLabel={`${teamName(t, m.a)} versus ${teamName(t, m.b)}, ${state}`}
      onPress={onPress}
    >
      <GlassSurface
        radius={shape.listCard}
        tint={live ? c.primarySoft : undefined}
        style={{ padding: 14, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <T v="bodyStrong" numberOfLines={1} style={{ opacity: m.result?.winner === 1 ? 0.6 : 1 }}>
            {teamName(t, m.a)}
          </T>
          <T v="bodyStrong" numberOfLines={1} style={{ opacity: m.result?.winner === 0 ? 0.6 : 1 }}>
            {teamName(t, m.b)}
          </T>
        </View>
        {m.result ? (
          <Mono size={14}>{state}</Mono>
        ) : (
          <T v="label" style={{ color: live ? c.live : playable(m) ? c.primary : c.onSurfaceMuted }}>
            {live ? '● Live' : state}
          </T>
        )}
        {m.result ? <Icon name="check-circle" size={20} color={c.win} /> : null}
      </GlassSurface>
    </Pressable>
  );
}
