import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Switch } from 'react-native-paper';
import { font, GLASS_BLUR, shape, useTheme } from '@/theme';

/* ---------- text ---------- */
const scale = {
  headline: { fontSize: 32, fontFamily: font.regular },
  title: { fontSize: 22, fontFamily: font.regular },
  titleSmall: { fontSize: 18, fontFamily: font.medium },
  body: { fontSize: 15, fontFamily: font.regular },
  bodyStrong: { fontSize: 15, fontFamily: font.medium },
  label: { fontSize: 14, fontFamily: font.medium, muted: true },
  caption: { fontSize: 12, fontFamily: font.regular, muted: true },
  overline: { fontSize: 11, fontFamily: font.medium, letterSpacing: 0.66, textTransform: 'uppercase', muted: true },
  mono: { fontSize: 15, fontFamily: font.mono },
} as const;

export function T({
  v = 'body',
  style,
  children,
  ...rest
}: {
  v?: keyof typeof scale;
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
  numberOfLines?: number;
  accessibilityLabel?: string;
  selectable?: boolean;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const { muted, ...s } = scale[v] as Record<string, unknown> & { muted?: boolean };
  return (
    <Text {...rest} style={[s as TextStyle, { color: muted ? c.onSurfaceMuted : c.onSurface }, style]}>
      {children}
    </Text>
  );
}

/* ---------- icon ---------- */
const ALIAS: Record<string, string> = {
  balance: 'balance',
  sports_tennis: 'sports-tennis',
  swap_horiz: 'swap-horiz',
  trending_up: 'trending-up',
};
export function Icon({
  name,
  size = 24,
  color,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const { c } = useTheme();
  const n = (ALIAS[name] ?? name).replace(/_/g, '-');
  const known = (MaterialIcons.glyphMap as Record<string, number>)[n];
  return (
    <MaterialIcons
      name={(known ? n : 'help-outline') as never}
      size={size}
      color={color ?? c.onSurface}
      style={style}
      accessible={false}
    />
  );
}

/* ---------- background ---------- */
export function GlowBackground() {
  const { c } = useTheme();
  const glows = [
    { col: c.glowA, s: 380, top: -140, left: -150, o: c.glowOpacity[0] },
    { col: c.glowB, s: 360, bottom: 60, right: -190, o: c.glowOpacity[1] },
    { col: c.glowC, s: 200, top: 380, left: -60, o: c.glowOpacity[2] },
  ];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.background }]}>
      {glows.map(({ col, s, o, ...pos }, i) => (
        <Svg key={i} width={s * 1.6} height={s * 1.6} style={[{ position: 'absolute', opacity: o }, offset(pos, s)]}>
          <Defs>
            <RadialGradient id={`g${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={col} stopOpacity={1} />
              <Stop offset="1" stopColor={col} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={s * 0.8} cy={s * 0.8} r={s * 0.8} fill={`url(#g${i})`} />
        </Svg>
      ))}
    </View>
  );
}
// svg is 1.6x the glow so the soft edge isn't clipped; shift by the extra margin
const offset = (p: { top?: number; left?: number; bottom?: number; right?: number }, s: number): ViewStyle => {
  const m = s * 0.3;
  return {
    top: p.top !== undefined ? p.top - m : undefined,
    left: p.left !== undefined ? p.left - m : undefined,
    bottom: p.bottom !== undefined ? p.bottom - m : undefined,
    right: p.right !== undefined ? p.right - m : undefined,
  };
};

/* ---------- glass ---------- */
export function GlassSurface({
  children,
  style,
  radius = shape.card,
  strong,
  tint,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  strong?: boolean;
  tint?: string;
}) {
  const { c, dark } = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radius,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: c.glassStroke,
          backgroundColor: tint ?? (strong ? c.glassStrong : c.glass),
        },
        style,
      ]}
    >
      {GLASS_BLUR && <BlurView intensity={40} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
      {children}
    </View>
  );
}

/* ---------- layout ---------- */
export function Screen({
  children,
  scroll = true,
  header,
  footer,
  pad = true,
}: {
  children?: ReactNode;
  scroll?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  pad?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <GlowBackground />
      <View style={{ paddingTop: insets.top }}>{header}</View>
      {scroll ? (
        <ScrollView
          // without a footer, the end of the list must clear the system navigation bar
          contentContainerStyle={{ padding: pad ? 16 : 0, paddingBottom: 24 + (footer ? 0 : insets.bottom), gap: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: pad ? 16 : 0 }}>{children}</View>
      )}
      {footer && <View style={{ paddingBottom: insets.bottom, paddingHorizontal: 16 }}>{footer}</View>}
    </View>
  );
}

export function Header({
  title,
  subtitle,
  back = true,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, minHeight: 64, gap: 4 }}>
      {back && (
        <IconBtn
          icon="arrow-back"
          label="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      )}
      <View style={{ flex: 1, paddingLeft: back ? 0 : 8 }}>
        <T v="title" numberOfLines={1} accessibilityLabel={title}>
          {title}
        </T>
        {subtitle ? (
          <T v="caption" numberOfLines={1}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export const Section = ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
  <View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
      <T v="titleSmall">{title}</T>
      {action}
    </View>
    {children}
  </View>
);

/* ---------- buttons ---------- */
export function IconBtn({
  icon,
  label,
  onPress,
  color,
  filled,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  filled?: boolean;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={0}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? c.glassStrong : 'transparent',
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} color={color ?? c.onSurface} />
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  icon,
  kind = 'filled',
  compact,
  disabled,
  style,
  a11y,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  kind?: 'filled' | 'tonal' | 'outline' | 'danger';
  compact?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  a11y?: string;
}) {
  const { c } = useTheme();
  const filled = kind === 'filled';
  const fg = filled ? c.onPrimary : kind === 'danger' ? c.loss : kind === 'tonal' ? c.primary : c.onSurface;
  const h = compact ? 48 : 56;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: h,
          borderRadius: h / 2,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: filled ? c.primary : kind === 'tonal' ? c.primarySoft : c.glass,
          borderWidth: filled || kind === 'tonal' ? 0 : 1,
          borderColor: c.glassStroke,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        filled && {
          shadowColor: c.primaryGlow,
          shadowOpacity: 1,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 10 },
          elevation: 6,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Text style={{ color: fg, fontFamily: font.medium, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
}) {
  const { c } = useTheme();
  const body = (
    <View
      style={{
        height: 32,
        borderRadius: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: selected ? c.primarySoft : c.glass,
        borderWidth: 1,
        borderColor: selected ? c.primary : c.glassStroke,
      }}
    >
      {icon ? <Icon name={icon} size={16} color={selected ? c.primary : c.onSurfaceMuted} /> : null}
      <T v="label" style={{ color: selected ? c.primary : c.onSurfaceMuted }}>
        {label}
      </T>
    </View>
  );
  if (!onPress) return body;
  // 32pt visual chip, padded to a 48pt touch target
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ minHeight: 48, justifyContent: 'center' }}
    >
      {body}
    </Pressable>
  );
}

export function Segmented<V extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  label: string;
}) {
  const { c } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: c.glassStroke,
        overflow: 'hidden',
        backgroundColor: c.glass,
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${o.label}`}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? c.primarySoft : 'transparent',
            }}
          >
            <T v="bodyStrong" style={{ color: on ? c.primary : c.onSurface }}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SwitchRow({
  label,
  hint,
  value,
  onChange,
  icon,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}
    >
      {icon ? <Icon name={icon} color={c.onSurfaceMuted} /> : null}
      <View style={{ flex: 1 }}>
        <T v="bodyStrong">{label}</T>
        {hint ? <T v="caption">{hint}</T> : null}
      </View>
      <Switch value={value} onValueChange={onChange} color={c.primary} accessibilityLabel={label} />
    </Pressable>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  format?: (v: number) => string;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <IconBtn
        icon="remove"
        label={`Decrease ${label}`}
        filled
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - step))}
      />
      <Text
        accessibilityLabel={`${label}: ${value}`}
        style={{ minWidth: 44, textAlign: 'center', color: c.onSurface, fontFamily: font.mono, fontSize: 18 }}
      >
        {format ? format(value) : value}
      </Text>
      <IconBtn
        icon="add"
        label={`Increase ${label}`}
        filled
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + step))}
      />
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
}) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T v="overline">{label}</T>
      <TextInput
        underlineColorAndroid="transparent"
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.onSurfaceMuted}
        keyboardType={keyboardType}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          minHeight: 52,
          borderRadius: 16,
          paddingHorizontal: 16,
          color: c.onSurface,
          fontFamily: font.regular,
          fontSize: 16,
          backgroundColor: c.glass,
          borderWidth: focus ? 2 : 1,
          borderColor: focus ? c.primary : c.glassStroke,
        }}
      />
    </View>
  );
}

/* ---------- sheet ---------- */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: c.scrim }}
      />
      <View
        style={{
          maxHeight: '85%',
          backgroundColor: c.background,
          borderTopLeftRadius: shape.sheet,
          borderTopRightRadius: shape.sheet,
          borderWidth: 1,
          borderColor: c.glassStroke,
          paddingBottom: insets.bottom,
        }}
      >
        <View
          style={{
            alignSelf: 'center',
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: c.onSurfaceMuted,
            opacity: 0.5,
            marginTop: 10,
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, minHeight: 56 }}>
          <T v="title" style={{ flex: 1 }}>
            {title}
          </T>
          <IconBtn icon="close" label="Close" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 16 }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

/* ---------- small bits ---------- */
export const Avatar = ({ name, size = 40 }: { name: string; size?: number }) => {
  const { c } = useTheme();
  const ini =
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .slice(0, 2)
      .join('') || '?';
  return (
    <View
      accessibilityElementsHidden
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: c.primary, fontFamily: font.medium, fontSize: size * 0.38 }}>{ini}</Text>
    </View>
  );
};

export const ProgressBar = ({ value }: { value: number }) => {
  const { c } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={{ height: 6, borderRadius: 3, backgroundColor: c.glassStrong, overflow: 'hidden' }}
    >
      <View style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%`, height: 6, backgroundColor: c.primary }} />
    </View>
  );
};

export const Mono = ({
  children,
  size = 15,
  color,
  style,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) => {
  const { c } = useTheme();
  return (
    <Text style={[{ fontFamily: font.mono, fontSize: size, color: color ?? c.onSurface }, style]}>{children}</Text>
  );
};

export function Row({
  icon,
  title,
  sub,
  right,
  onPress,
  label,
}: {
  icon?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
  onPress?: () => void;
  label?: string;
}) {
  const { c } = useTheme();
  const body = (
    <View
      style={{
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
      }}
    >
      {icon ? <Icon name={icon} color={c.primary} /> : null}
      <View style={{ flex: 1 }}>
        <T v="bodyStrong">{title}</T>
        {sub ? <T v="caption">{sub}</T> : null}
      </View>
      {right}
      {onPress ? <Icon name="chevron-right" color={c.onSurfaceMuted} /> : null}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label ?? title} onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

export const Empty = ({
  icon,
  title,
  text,
  action,
}: {
  icon: string;
  title: string;
  text: string;
  action?: ReactNode;
}) => (
  <GlassSurface style={{ padding: 24, alignItems: 'center', gap: 10 }}>
    <Icon name={icon} size={40} />
    <T v="titleSmall">{title}</T>
    <T v="caption" style={{ textAlign: 'center' }}>
      {text}
    </T>
    {action}
  </GlassSurface>
);
