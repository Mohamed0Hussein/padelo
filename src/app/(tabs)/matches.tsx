import { useRouter } from 'expo-router';
import { finishedMatches, liveMatches, useApp } from '@/store';
import { Button, Empty, Header, Screen, Section } from '@/ui';
import { MatchCard } from '@/ui/match';

export default function Matches() {
  const router = useRouter();
  const matches = useApp((s) => s.matches);
  const live = liveMatches(matches);
  const done = finishedMatches(matches);
  return (
    <Screen header={<Header back={false} title="Matches" />}>
      <Button icon="add" label="New match" onPress={() => router.push('/new-match')} />
      {live.length > 0 && (
        <Section title="In progress">
          {live.map((m) => (
            <MatchCard key={m.id} m={m} onPress={() => router.push(`/match/${m.id}`)} />
          ))}
        </Section>
      )}
      <Section title="History">
        {done.length === 0 ? (
          <Empty
            icon="sports-tennis"
            title="No finished matches"
            text="Saved matches appear here with their full point log."
          />
        ) : (
          done.map((m) => <MatchCard key={m.id} m={m} onPress={() => router.push(`/result/${m.id}`)} />)
        )}
      </Section>
    </Screen>
  );
}
