import { Pressable, Text, View } from 'react-native';
import { pointLabel, type Team } from '@/engine';
import { servingPlayer } from '@/lib/scoring';
import type { Match } from '@/lib/types';
import { teamLabel, timeAgo } from '@/lib/util';
import { font, shape, useTheme } from '@/theme';
import { GlassSurface, Icon, Mono, T } from '.';

export function ScoreTable({ m, compact }: { m: Match; compact?: boolean }) {
  const { c } = useTheme();
  const s = m.state;
  const serving = s.winner < 0 ? servingPlayer(m) : '';
  return (
    <GlassSurface radius={shape.card} style={{ paddingVertical: compact ? 8 : 12 }}>
      {([0, 1] as Team[]).map((t) => (
        <View
          key={t}
          accessible
          accessibilityLabel={`${teamLabel(m.teams[t])}, sets ${s.sets.map((x) => x.games[t]).join(', ')}, games ${s.games[t]}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            minHeight: compact ? 40 : 52,
            gap: 10,
          }}
        >
          <Icon
            name={s.server === t && s.winner < 0 ? 'sports-tennis' : 'circle'}
            size={s.server === t && s.winner < 0 ? 18 : 6}
            color={s.server === t && s.winner < 0 ? c.primary : c.glassStroke}
            style={{ width: 18, textAlign: 'center' }}
          />
          <View style={{ flex: 1 }}>
            <T v="bodyStrong" numberOfLines={1}>
              {teamLabel(m.teams[t])}
            </T>
            {s.server === t && serving && !compact ? <T v="caption">{serving} serving</T> : null}
          </View>
          {s.sets.map((x, i) => (
            <Mono
              key={i}
              size={compact ? 16 : 20}
              color={x.winner === t ? c.onSurface : c.onSurfaceMuted}
              style={{ minWidth: 28, textAlign: 'center' }}
            >
              {x.games[t]}
            </Mono>
          ))}
          {s.winner < 0 && !s.superTiebreak && (
            <View
              style={{
                minWidth: 40,
                height: 36,
                borderRadius: 10,
                backgroundColor: c.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mono size={compact ? 16 : 20} color={c.primary}>
                {s.games[t]}
              </Mono>
            </View>
          )}
        </View>
      ))}
    </GlassSurface>
  );
}

export function ScorePad({
  m,
  team,
  onPress,
  onLongPress,
  hint,
  locked,
  big = 88,
}: {
  m: Match;
  team: Team;
  onPress: () => void;
  onLongPress?: () => void;
  hint: string;
  locked?: boolean;
  big?: number;
}) {
  const { c } = useTheme();
  const name = teamLabel(m.teams[team]);
  const done = m.state.winner >= 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Point for ${name}. Current ${pointLabel(m.state, team)}`}
      accessibilityState={{ disabled: locked || done }}
      disabled={locked || done}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityHint={onLongPress ? `Hold to take ${name}'s last point away` : undefined}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : locked ? 0.5 : 1 })}
    >
      <GlassSurface
        radius={shape.scorePad}
        strong
        style={{ flex: 1, minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 2, padding: 12 }}
      >
        <T v="label" numberOfLines={1}>
          {name}
        </T>
        <Text
          allowFontScaling={false}
          style={{ fontFamily: font.mono, fontSize: big, lineHeight: big * 1.1, color: c.onSurface }}
        >
          {pointLabel(m.state, team)}
        </Text>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          <Icon name={hint.startsWith('Volume') ? 'volume-up' : 'touch-app'} size={16} color={c.onSurfaceMuted} />
          <T v="caption">{hint}</T>
        </View>
      </GlassSurface>
    </Pressable>
  );
}

export function MatchCard({ m, onPress }: { m: Match; onPress: () => void }) {
  const { c } = useTheme();
  const live = !m.endedAt;
  const score = m.state.sets.map((x) => x.games.join('–')).join('  ') || `${m.state.games[0]}–${m.state.games[1]}`;
  const winnerName = m.result ? teamLabel(m.teams[m.result.winner]) : '';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${teamLabel(m.teams[0])} versus ${teamLabel(m.teams[1])}, ${score}${live ? ', live' : ''}`}
      onPress={onPress}
    >
      <GlassSurface radius={shape.listCard} style={{ padding: 16, gap: 6, minHeight: 72 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T v="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
            {teamLabel(m.teams[0])} vs {teamLabel(m.teams[1])}
          </T>
          {live ? (
            <T v="overline" style={{ color: c.live }}>
              ● Live
            </T>
          ) : (
            <T v="caption">{timeAgo(m.endedAt!)}</T>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Mono size={16}>{score}</Mono>
          <T v="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
            {m.roundLabel ?? (winnerName ? `${winnerName} won` : 'Friendly')}
          </T>
        </View>
      </GlassSurface>
    </Pressable>
  );
}
