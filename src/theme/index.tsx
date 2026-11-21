import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { useApp } from '@/store';

export const palette = {
  dark: {
    background: '#070B16',
    glowA: '#0D9488',
    glowB: '#4F46E5',
    glowC: '#B45309',
    glass: 'rgba(255,255,255,0.07)',
    glassStrong: 'rgba(255,255,255,0.13)',
    glassStroke: 'rgba(255,255,255,0.16)',
    onSurface: '#EEF2F8',
    onSurfaceMuted: '#AAB4C5',
    primary: '#5EEAD4',
    onPrimary: '#00382F',
    primarySoft: 'rgba(94,234,212,0.18)',
    primaryGlow: 'rgba(45,212,191,0.35)',
    live: '#FCA5A5',
    win: '#86EFAC',
    loss: '#FCA5A5',
    scrim: 'rgba(7,11,22,0.35)',
    glowOpacity: [0.55, 0.55, 0.22],
  },
  light: {
    background: '#E8EEF6',
    glowA: '#5EEAD4',
    glowB: '#A5B4FC',
    glowC: '#FCD34D',
    glass: 'rgba(255,255,255,0.52)',
    glassStrong: 'rgba(255,255,255,0.78)',
    glassStroke: 'rgba(255,255,255,0.90)',
    onSurface: '#0B1324',
    onSurfaceMuted: '#46546A',
    primary: '#0F766E',
    onPrimary: '#FFFFFF',
    primarySoft: 'rgba(15,118,110,0.13)',
    primaryGlow: 'rgba(15,118,110,0.28)',
    live: '#B42318',
    win: '#067647',
    loss: '#B42318',
    scrim: 'rgba(255,255,255,0.30)',
    glowOpacity: [0.55, 0.55, 0.22],
  },
} as const;

export type Colors = {
  [K in keyof (typeof palette)['dark']]: (typeof palette)['dark'][K] extends readonly number[]
    ? readonly number[]
    : string;
};

export const shape = {
  chip: 8,
  field: 16,
  listCard: 20,
  card: 24,
  heroCard: 28,
  sheet: 28,
  scorePad: 32,
  navBar: 32,
  fab: 18,
} as const;
export const size = { touch: 48, button: 56, compact: 48 } as const;
export const font = {
  regular: 'Roboto_400Regular',
  medium: 'Roboto_500Medium',
  mono: 'RobotoMono_600SemiBold',
  monoRegular: 'RobotoMono_400Regular',
} as const;

/** Single flag: frosted BlurView on top of the glass fill. Off = same translucent colours without blur. */
export const GLASS_BLUR = Platform.OS === 'ios';

interface Ctx {
  c: Colors;
  dark: boolean;
}
const ThemeCtx = createContext<Ctx>({ c: palette.dark as unknown as Colors, dark: true });
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pref = useApp((s) => s.settings.theme);
  const system = useColorScheme();
  const dark = pref === 'system' ? system !== 'light' : pref === 'dark';
  const value = useMemo(() => ({ c: (dark ? palette.dark : palette.light) as unknown as Colors, dark }), [dark]);
  const paper = useMemo(() => {
    const base = dark ? MD3DarkTheme : MD3LightTheme;
    const c = value.c;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: c.primary,
        onPrimary: c.onPrimary,
        background: c.background,
        surface: c.glass,
        onSurface: c.onSurface,
        outline: c.glassStroke,
      },
    };
  }, [dark, value]);
  return (
    <ThemeCtx.Provider value={value}>
      <PaperProvider theme={paper}>{children}</PaperProvider>
    </ThemeCtx.Provider>
  );
}
