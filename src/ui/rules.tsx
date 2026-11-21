import { View } from 'react-native';
import type { MatchRules } from '@/engine';
import { rulesLine } from '@/engine';
import { Segmented, SwitchRow, T } from '.';

/** Shared match-rules editor (New match, Live rules sheet, Settings, Tournament create). */
export function RulesEditor({ rules, onChange }: { rules: MatchRules; onChange: (r: MatchRules) => void }) {
  const set = <K extends keyof MatchRules>(k: K, v: MatchRules[K]) => onChange({ ...rules, [k]: v });
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <T v="overline">Match length</T>
        <Segmented
          label="Match length"
          value={rules.bestOf}
          onChange={(v) => set('bestOf', v)}
          options={[
            { value: 1, label: '1 set' },
            { value: 3, label: 'Best of 3' },
            { value: 5, label: 'Best of 5' },
          ]}
        />
      </View>
      <View style={{ gap: 6 }}>
        <T v="overline">Games per set</T>
        <Segmented
          label="Games per set"
          value={rules.games}
          onChange={(v) => set('games', v)}
          options={[
            { value: 4, label: '4' },
            { value: 6, label: '6' },
            { value: 9, label: '9' },
          ]}
        />
      </View>
      <View style={{ gap: 6 }}>
        <T v="overline">At 40–40</T>
        <Segmented
          label="At 40–40"
          value={rules.deuce}
          onChange={(v) => set('deuce', v)}
          options={[
            { value: 'golden', label: 'Golden' },
            { value: 'adv', label: 'Advantage' },
            { value: 'star', label: 'Star' },
          ]}
        />
      </View>
      {rules.bestOf > 1 && (
        <View style={{ gap: 6 }}>
          <T v="overline">Deciding set</T>
          <Segmented
            label="Deciding set"
            value={rules.superTb ? 'super' : 'full'}
            onChange={(v) => set('superTb', v === 'super')}
            options={[
              { value: 'super', label: 'Super tiebreak' },
              { value: 'full', label: 'Full set' },
            ]}
          />
        </View>
      )}
      <SwitchRow
        label="Tiebreak"
        hint={`At ${rules.games}–${rules.games}, first to 7`}
        value={rules.tiebreak}
        onChange={(v) => set('tiebreak', v)}
      />
      <T v="caption">{rulesLine(rules)}</T>
    </View>
  );
}
