import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { finishedMatches, liveMatches, useApp } from '@/store';
import { shape, useTheme } from '@/theme';
import { Button, Empty, GlassSurface, Header, Icon, IconBtn, ProgressBar, Screen, Section, T } from '@/ui';
import { MatchCard, ScoreTable } from '@/ui/match';
import { banner } from '@/engine';

export default function Home() {
  const router = useRouter();
  const { c } = useTheme();
  const matches = useApp((s) => s.matches);
  const tournamentMap = useApp((s) => s.tournaments);
  const tournaments = Object.values(tournamentMap);
  const live = liveMatches(matches)[0];
  const recent = finishedMatches(matches).slice(0, 5);

  return (
    <Screen
      header={
        <Header
          back={false}
          title="Padelo"
          subtitle="Score. Host. Play."
          right={<IconBtn icon="settings" label="Settings" onPress={() => router.push('/settings')} />}
        />
      }
    >
      {live ? (
        <Section title="Live match">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Resume live match"
            onPress={() => router.push(`/match/${live.id}`)}
          >
            <GlassSurface radius={shape.heroCard} strong style={{ padding: 12, gap: 8 }}>
              <ScoreTable m={live} compact />
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 4 }}
              >
                <Icon name={banner(live.state).icon} size={18} color={c.primary} />
                <T v="label" style={{ flex: 1 }}>
                  {banner(live.state).text}
                </T>
                <T v="bodyStrong" style={{ color: c.primary }}>
                  Resume
                </T>
              </View>
            </GlassSurface>
          </Pressable>
        </Section>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Tile icon="sports-tennis" title="New match" sub="Score a friendly" onPress={() => router.push('/new-match')} />
        <Tile
          icon="emoji-events"
          title="Host tournament"
          sub="Groups, knockout, Americano"
          onPress={() => router.push('/tournament/create')}
        />
      </View>

      <Section
        title="Your tournaments"
        action={
          <T
            v="label"
            style={{ color: c.primary }}
            accessibilityLabel="See all tournaments"
            onPress={() => router.push('/tournaments')}
          >
            See all
          </T>
        }
      >
        {tournaments.length === 0 ? (
          <Empty
            icon="emoji-events"
            title="No tournaments yet"
            text="Create one to get a draw, tables and a bracket."
          />
        ) : (
          tournaments
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 3)
            .map((t) => {
              const total = t.format === 'AMERICANO' ? t.rounds!.length : t.matches.filter((m) => !m.bye).length;
              const done =
                t.format === 'AMERICANO'
                  ? t.rounds!.filter((r) => r.locked).length
                  : t.matches.filter((m) => m.result && !m.bye).length;
              return (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${t.name}`}
                  onPress={() => router.push(t.format === 'AMERICANO' ? `/americano/${t.id}` : `/tournament/${t.id}`)}
                >
                  <GlassSurface radius={shape.listCard} style={{ padding: 16, gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <T v="bodyStrong">{t.name}</T>
                      <T v="caption">
                        {done}/{total}
                      </T>
                    </View>
                    <ProgressBar value={total ? done / total : 0} />
                  </GlassSurface>
                </Pressable>
              );
            })
        )}
      </Section>

      <Section title="Recent matches">
        {recent.length === 0 ? (
          <Empty
            icon="sports-tennis"
            title="No matches yet"
            text="Finished matches show up here."
            action={<Button compact label="Score a match" onPress={() => router.push('/new-match')} />}
          />
        ) : (
          recent.map((m) => <MatchCard key={m.id} m={m} onPress={() => router.push(`/result/${m.id}`)} />)
        )}
      </Section>
    </Screen>
  );
}

function Tile({ icon, title, sub, onPress }: { icon: string; title: string; sub: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={{ flex: 1 }}>
      <GlassSurface radius={shape.card} style={{ padding: 16, gap: 10, minHeight: 112 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: c.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} color={c.primary} />
        </View>
        <View>
          <T v="titleSmall">{title}</T>
          <T v="caption">{sub}</T>
        </View>
      </GlassSurface>
    </Pressable>
  );
}
