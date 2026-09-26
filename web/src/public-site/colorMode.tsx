import { createContext, ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ColorMode, palettes } from './theme';

type Preference = ColorMode | 'system';

const STORAGE_KEY = 'ss-color-mode';
const query = '(prefers-color-scheme: dark)';

function readPreference(): Preference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Depolama engelliyse sistem tercihine düş.
  }
  return 'system';
}

function systemMode(): ColorMode {
  return typeof window !== 'undefined' && window.matchMedia?.(query).matches ? 'dark' : 'light';
}

interface ColorModeValue {
  mode: ColorMode;
  preference: Preference;
  toggle: () => void;
}

const ColorModeContext = createContext<ColorModeValue>({ mode: 'light', preference: 'system', toggle: () => {} });

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Preference>(readPreference);
  const [system, setSystem] = useState<ColorMode>(systemMode);

  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const onChange = () => setSystem(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const mode: ColorMode = preference === 'system' ? system : preference;

  // Portallar (menü, drawer) da doğru renkleri alsın diye kök elemente yazılır.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.ssTheme = mode;
    // index.html'deki erken boyama rengi artık gerekmiyor; zemini body çizer.
    root.style.backgroundColor = '';
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', palettes[mode].ground);
    return () => {
      delete root.dataset.ssTheme;
    };
  }, [mode]);

  const toggle = useCallback(() => {
    const next: ColorMode = mode === 'dark' ? 'light' : 'dark';
    setPreference(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Kalıcı olmasa da oturum içinde çalışır.
    }
  }, [mode]);

  const value = useMemo(() => ({ mode, preference, toggle }), [mode, preference, toggle]);
  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export const useColorMode = () => useContext(ColorModeContext);
