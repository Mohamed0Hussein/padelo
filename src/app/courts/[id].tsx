import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { mmss } from '@/lib/util';
import { orderedSlots, playable, scoreText, teamName } from '@/tournament/util';
import { useApp } from '@/store';
import { useTheme } from '@/theme';
import { Button, GlassSurface, Header, IconBtn, Screen, Section, SwitchRow, T } from '@/ui';

export default function Courts() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const t = useApp((s) => s.tournaments[id]);
  const matches = useApp((s) => s.matches);
  const save = useApp((s) => s.saveTournament);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(i);
  }, []);

  // a court is busy while its assigned slot has no result yet
  const busy = (courtMatch?: string) => !!courtMatch && !!t?.matches.find((m) => m.id === courtMatch && !m.result);
  const assigned = new Set(t?.courts.filter((x) => busy(x.matchId)).map((x) => x.matchId));
  const queueIdx = (mid: string) => {
    const i = t?.queue?.indexOf(mid) ?? -1;
    return i < 0 ? 1e6 : i;
  };
  const upNext = t
    ? orderedSlots(t)
        .filter((m) => playable(m) && !assigned.has(m.id) && !m.matchId)
        .sort((a, b) => queueIdx(a.id) - queueIdx(b.id))
    : [];

  const assign = (courtId: string, slotId: string) => {
    if (!t) return;
    const court = t.courts.find((x) => x.id === courtId)!;
    save({
      ...t,
      courts: t.courts.map((x) => (x.id === courtId ? { ...x, matchId: slotId } : x)),
      matches: t.matches.map((m) => (m.id === slotId ? { ...m, court: court.name } : m)),
    });
  };

  useEffect(() => {
    if (!t?.autoAssign) return;
    const free = t.courts.filter((x) => !busy(x.matchId));
    if (!free.length || !upNext.length) return;
    let courts = t.courts;
    let ms = t.matches;
    free.forEach((court, i) => {
      const s = upNext[i];
      if (!s) return;
      courts = courts.map((x) => (x.id === court.id ? { ...x, matchId: s.id } : x));
      ms = ms.map((m) => (m.id === s.id ? { ...m, court: court.name } : m));
    });
    save({ ...t, courts, matches: ms });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t?.autoAssign, t?.matches]);

  if (!t)
    return (
      <Screen header={<Header title="Courts" />}>
        <T>Not found.</T>
      </Screen>
    );

  const play = (slotId: string) => {
    const mid = useApp.getState().startSlot(t.id, slotId);
    if (mid) router.push(`/match/${mid}`);
  };
  // ponytail: reorder is up/down buttons, not drag. Add a drag list (react-native-draggable-flatlist) if wanted.
  const move = (i: number, d: -1 | 1) => {
    const ids = upNext.map((m) => m.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    save({ ...t, queue: ids });
  };

  return (
    <Screen header={<Header title="Courts" subtitle={t.name} />}>
      <GlassSurface style={{ paddingHorizontal: 16 }}>
        <SwitchRow
          label="Auto-assign"
          hint="Next match goes to the first free court"
          value={t.autoAssign}
          onChange={(v) => save({ ...t, autoAssign: v })}
        />
      </GlassSurface>
      {t.courts.map((court) => {
        const slot = busy(court.matchId) ? t.matches.find((m) => m.id === court.matchId) : undefined;
        const live = slot?.matchId ? matches[slot.matchId] : undefined;
        const status = !slot ? 'Free' : live ? 'Live' : 'Playing';
        return (
          <GlassSurface key={court.id} style={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T v="titleSmall">{court.name}</T>
              <T
                v="label"
                style={{ color: status === 'Free' ? c.onSurfaceMuted : status === 'Live' ? c.live : c.primary }}
              >
                {status === 'Live' ? '● Live' : status}
              </T>
            </View>
            {slot ? (
              <>
                <T v="bodyStrong">
                  {teamName(t, slot.a)} vs {teamName(t, slot.b)}
                </T>
                <T v="caption">
                  {live
                    ? `${live.state.sets.map((x) => x.games.join('–')).join('  ')}${live.state.sets.length ? '  ' : ''}${live.state.games.join('–')} · ${mmss(now - live.startedAt)}`
                    : scoreText(slot) || 'Not started'}
                </T>
                <Button
                  compact
                  kind="tonal"
                  icon="play-arrow"
                  label={live ? 'Open scoring' : 'Start match'}
                  onPress={() => play(slot.id)}
                />
              </>
            ) : upNext[0] ? (
              <Button
                compact
                kind="outline"
                icon="add"
                label={`Assign ${teamName(t, upNext[0].a)} vs ${teamName(t, upNext[0].b)} here`}
                onPress={() => assign(court.id, upNext[0].id)}
              />
            ) : (
              <T v="caption">Nothing waiting.</T>
            )}
          </GlassSurface>
        );
      })}
      <Section title="Up next">
        {upNext.length === 0 ? (
          <T v="caption">No matches waiting.</T>
        ) : (
          upNext.map((m, i) => (
            <GlassSurface
              key={m.id}
              radius={16}
              style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, minHeight: 56 }}
            >
              <View style={{ flex: 1 }}>
                <T v="bodyStrong" numberOfLines={1}>
                  {teamName(t, m.a)} vs {teamName(t, m.b)}
                </T>
                <T v="caption">{m.stage === 'group' ? `Group ${m.group}` : m.roundLabel}</T>
              </View>
              <IconBtn icon="arrow-upward" label="Move up" disabled={i === 0} onPress={() => move(i, -1)} />
              <IconBtn
                icon="arrow-downward"
                label="Move down"
                disabled={i === upNext.length - 1}
                onPress={() => move(i, 1)}
              />
            </GlassSurface>
          ))
        )}
      </Section>
    </Screen>
  );
}
