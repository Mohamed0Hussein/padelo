import * as Clipboard from 'expo-clipboard';
import { Share, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { publicSnapshot, sync, type ShareOptions } from '@/lib/sync';
import { useApp } from '@/store';
import { useTheme } from '@/theme';
import { Button, GlassSurface, Header, Screen, Section, SwitchRow, T } from '@/ui';

export default function ShareLive() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const t = useApp((s) => s.tournaments[id]);
  const [opts, setOpts] = useState<ShareOptions>({ liveScores: true, tables: true, bracket: true, courts: false });
  const [url, setUrl] = useState('');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (t && !paused) sync.start(publicSnapshot(t, opts)).then((r) => setUrl(r.url));
    else if (t) sync.stop(t.id);
  }, [t?.id, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!t)
    return (
      <Screen header={<Header title="Share live" />}>
        <T>Not found.</T>
      </Screen>
    );
  const set = (k: keyof ShareOptions) => (v: boolean) => setOpts((o) => ({ ...o, [k]: v }));

  return (
    <Screen header={<Header title="Share live" subtitle={t.name} />}>
      <GlassSurface radius={28} strong style={{ padding: 24, alignItems: 'center', gap: 16 }}>
        {paused || !url ? (
          <T>Sharing is paused</T>
        ) : (
          <View
            accessibilityLabel="QR code for the live link"
            style={{ padding: 12, backgroundColor: '#fff', borderRadius: 16 }}
          >
            <QRCode value={url} size={200} />
          </View>
        )}
        <T v="label" selectable>
          {paused ? '' : url}
        </T>
        <T v="caption" style={{ textAlign: 'center', color: c.onSurfaceMuted }}>
          Live sharing needs a server, which this version does not have yet. The link is a placeholder and nothing is
          uploaded.
        </T>
      </GlassSurface>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          style={{ flex: 1 }}
          kind="outline"
          icon="content-copy"
          label="Copy"
          disabled={paused}
          onPress={() => Clipboard.setStringAsync(url)}
        />
        <Button
          style={{ flex: 1 }}
          icon="ios-share"
          label="Share"
          disabled={paused}
          onPress={() => Share.share({ message: `Follow ${t.name} live: ${url}` })}
        />
      </View>
      <Section title="Spectators can see">
        <GlassSurface style={{ paddingHorizontal: 16 }}>
          <SwitchRow label="Live scores" value={opts.liveScores} onChange={set('liveScores')} />
          <SwitchRow label="Group tables" value={opts.tables} onChange={set('tables')} />
          <SwitchRow label="Bracket" value={opts.bracket} onChange={set('bracket')} />
          <SwitchRow label="Court assignments" value={opts.courts} onChange={set('courts')} />
        </GlassSurface>
      </Section>
      <Button
        kind={paused ? 'filled' : 'danger'}
        icon={paused ? 'play-arrow' : 'pause'}
        label={paused ? 'Resume sharing' : 'Pause sharing'}
        onPress={() => setPaused(!paused)}
      />
    </Screen>
  );
}
