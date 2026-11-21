import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { checkForUpdate, restartToUpdate, versionLabel } from '@/lib/updates';
import { useApp } from '@/store';
import { Button, GlassSurface, Header, Row, Screen, Section, Segmented, SwitchRow, T } from '@/ui';
import { RulesEditor } from '@/ui/rules';
import { toCsv } from '@/tournament/util';

export default function Settings() {
  const router = useRouter();
  const s = useApp((x) => x.settings);
  const set = useApp((x) => x.setSettings);

  const share = async (name: string, body: string, mime: string) => {
    try {
      const f = new FileSystem.File(FileSystem.Paths.cache, name);
      if (f.exists) f.delete();
      f.create();
      f.write(body);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(f.uri, { mimeType: mime });
    } catch {
      Alert.alert('Export failed');
    }
  };
  const backup = () => {
    const { matches, tournaments, settings } = useApp.getState();
    share('padelo-backup.json', JSON.stringify({ version: 1, settings, matches, tournaments }), 'application/json');
  };
  const [checking, setChecking] = useState(false);
  const checkUpdates = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const r = await checkForUpdate();
      if (r === 'disabled') Alert.alert('Updates are off', 'Development builds load code from your computer.');
      else if (r === 'none') Alert.alert("You're up to date");
      else
        Alert.alert('Update ready', 'Restart Padelo to use the new version.', [
          { text: 'Later', style: 'cancel' },
          { text: 'Restart', onPress: () => restartToUpdate() },
        ]);
    } catch {
      Alert.alert('Could not check for updates', 'Check your connection and try again.');
    } finally {
      setChecking(false);
    }
  };
  const exportAll = () => {
    const ts = Object.values(useApp.getState().tournaments).filter((t) => t.format !== 'AMERICANO');
    if (!ts.length) return Alert.alert('No tournaments to export');
    share('padelo-tournaments.csv', ts.map((t) => `${t.name}\n${toCsv(t)}`).join('\n\n'), 'text/csv');
  };

  return (
    <Screen header={<Header title="Settings" />}>
      <Section title="Theme">
        <Segmented
          label="Theme"
          value={s.theme}
          onChange={(theme) => set({ theme })}
          options={[
            { value: 'system', label: 'System' },
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
        />
      </Section>
      <Section title="Default match rules">
        <GlassSurface style={{ padding: 16 }}>
          <RulesEditor rules={s.defaultRules} onChange={(defaultRules) => set({ defaultRules })} />
        </GlassSurface>
      </Section>
      <Section title="Scoring">
        <GlassSurface style={{ paddingHorizontal: 16 }}>
          <SwitchRow
            icon="volume-up"
            label="Volume-key scoring"
            hint="Up = team 1, down = team 2. Android only."
            value={s.volumeKeys}
            onChange={(volumeKeys) => set({ volumeKeys })}
          />
          <SwitchRow
            icon="visibility"
            label="Keep screen awake"
            value={s.keepAwake}
            onChange={(keepAwake) => set({ keepAwake })}
          />
          <SwitchRow
            icon="vibration"
            label="Vibrate per point"
            value={s.haptics}
            onChange={(haptics) => set({ haptics })}
          />
          <SwitchRow
            icon="swap-horiz"
            label="Change-ends reminder"
            value={s.changeEndsReminder}
            onChange={(changeEndsReminder) => set({ changeEndsReminder })}
          />
          <SwitchRow
            icon="record-voice-over"
            label="Call score aloud"
            value={s.callScore}
            onChange={(callScore) => set({ callScore })}
          />
        </GlassSurface>
      </Section>
      <Section title="Data">
        <GlassSurface>
          <Row icon="download" title="Export tournaments (CSV)" onPress={exportAll} />
          <Row
            icon="backup"
            title="Back up everything"
            sub="Saves a JSON file you can share or store"
            onPress={backup}
          />
          <Row icon="add" title="New match" onPress={() => router.push('/new-match')} />
        </GlassSurface>
      </Section>
      <Section title="App">
        <GlassSurface>
          <Row
            icon="system-update"
            title={checking ? 'Checking…' : 'Check for updates'}
            label="Check for updates"
            sub={versionLabel()}
            onPress={checkUpdates}
          />
        </GlassSurface>
      </Section>
      <T v="caption" style={{ textAlign: 'center' }}>
        Padelo 1.0 · everything is stored on this phone
      </T>
      <Button
        kind="outline"
        label="Show welcome screen"
        onPress={() => {
          set({ onboarded: false });
        }}
      />
    </Screen>
  );
}
