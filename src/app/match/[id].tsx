import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { banner } from '@/engine';
import { useScoringControls } from '@/lib/scoring';
import { faultLine } from '@/lib/serve';
import { teamLabel } from '@/lib/util';
import { useApp } from '@/store';
import { useTheme } from '@/theme';
import { Button, GlassSurface, Header, Icon, IconBtn, Screen, Segmented, Sheet, SwitchRow, T } from '@/ui';
import { ScorePad, ScoreTable } from '@/ui/match';
import { RulesEditor } from '@/ui/rules';

export default function Live() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const m = useApp((s) => s.matches[id]);
  const { undoPoint, fault, restart, setMatchRules, endAndSave, setSettings } = useApp.getState();
  const settings = useApp((s) => s.settings);
  const [sheet, setSheet] = useState<null | 'rules' | 'history' | 'end'>(null);
  const { score, take, hint } = useScoringControls(id);

  if (!m)
    return (
      <Screen header={<Header title="Match" />}>
        <T>Match not found.</T>
      </Screen>
    );
  const b = banner(settings.changeEndsReminder ? m.state : { ...m.state, changeEnds: false });
  const over = m.state.winner >= 0;
  const finish = () => {
    endAndSave(id);
    router.replace(`/result/${id}`);
  };

  return (
    <Screen
      scroll={false}
      header={
        <Header
          title={m.roundLabel ?? 'Live match'}
          subtitle={m.courtLabel}
          right={
            <>
              <IconBtn icon="history" label="Point history" onPress={() => setSheet('history')} />
              <IconBtn icon="tune" label="Match rules" onPress={() => setSheet('rules')} />
              <IconBtn icon="screen-rotation" label="Courtside view" onPress={() => router.push(`/courtside/${id}`)} />
            </>
          }
        />
      }
      footer={
        <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12 }}>
          <Button
            kind="outline"
            icon="undo"
            label="Undo"
            disabled={!m.state.history.length && !m.pendingFault}
            onPress={() => undoPoint(id)}
            style={{ flex: 1 }}
          />
          <Button
            kind={over ? 'filled' : 'tonal'}
            icon="check"
            label={over ? 'Save result' : 'End & save'}
            onPress={() => (over ? finish() : setSheet('end'))}
            style={{ flex: 1.4 }}
          />
        </View>
      }
    >
      <View style={{ flex: 1, gap: 12 }}>
        <ScoreTable m={m} />
        <Segmented
          label="At 40–40"
          value={m.rules.deuce}
          onChange={(deuce) => setMatchRules(id, { ...m.rules, deuce })}
          options={[
            { value: 'golden', label: 'Golden' },
            { value: 'adv', label: 'Advantage' },
            { value: 'star', label: 'Star' },
          ]}
        />
        <GlassSurface
          radius={20}
          tint={b.hot ? c.primarySoft : undefined}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, minHeight: 52 }}
        >
          <Icon name={b.icon} color={b.hot ? c.primary : c.onSurfaceMuted} size={22} />
          <T
            v="bodyStrong"
            accessibilityLabel={`Status: ${b.text}`}
            style={{ flex: 1, color: b.hot ? c.primary : c.onSurface }}
          >
            {b.text}
          </T>
        </GlassSurface>
        <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
          <ScorePad
            m={m}
            team={0}
            onPress={() => score(0)}
            onLongPress={() => take(0)}
            hint={hint ? 'Volume up · hold −1' : 'Tap +1 · hold −1'}
          />
          <ScorePad
            m={m}
            team={1}
            onPress={() => score(1)}
            onLongPress={() => take(1)}
            hint={hint ? 'Volume down · hold −1' : 'Tap +1 · hold −1'}
          />
        </View>
        {!over && (
          <Button
            kind={m.pendingFault ? 'danger' : 'outline'}
            icon="report-problem"
            label={m.pendingFault ? '2nd fault → double fault' : 'Fault'}
            onPress={() => fault(id)}
          />
        )}
        <T v="caption" style={{ textAlign: 'center' }}>
          {faultLine(m)}
        </T>
      </View>

      <Sheet visible={sheet === 'rules'} onClose={() => setSheet(null)} title="Match rules">
        <RulesEditor rules={m.rules} onChange={(r) => setMatchRules(id, r)} />
        <SwitchRow
          icon="volume-up"
          label="Volume-key scoring"
          hint="Volume up = point for team 1, down = team 2"
          value={settings.volumeKeys}
          onChange={(v) => setSettings({ volumeKeys: v })}
        />
        <View style={{ gap: 6 }}>
          <T v="overline">Theme</T>
          <Segmented
            label="Theme"
            value={settings.theme}
            onChange={(theme) => setSettings({ theme })}
            options={[
              { value: 'system', label: 'System' },
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
          />
        </View>
      </Sheet>

      <Sheet visible={sheet === 'history'} onClose={() => setSheet(null)} title="Point history">
        {m.state.log.length === 0 ? <T v="caption">No points yet.</T> : null}
        {m.state.log.map((e, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 }}>
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: e.team === 0 ? c.primary : c.live }}
            />
            <T style={{ flex: 1 }}>{e.text}</T>
            <T v="caption">{teamLabel(m.teams[e.team])}</T>
          </View>
        ))}
      </Sheet>

      <Sheet visible={sheet === 'end'} onClose={() => setSheet(null)} title="End match?">
        <T>Save the match with its current score, or start over.</T>
        <Button
          label="End & save"
          icon="check"
          onPress={() => {
            setSheet(null);
            finish();
          }}
        />
        <Button
          kind="outline"
          icon="restart-alt"
          label="Restart match"
          onPress={() => {
            restart(id);
            setSheet(null);
          }}
        />
        <Button
          kind="danger"
          icon="delete"
          label="Discard match"
          onPress={() => {
            useApp.getState().deleteMatch(id);
            setSheet(null);
            router.dismissTo('/');
          }}
        />
      </Sheet>
    </Screen>
  );
}
