import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { adminPalettes, AdminColorMode } from './theme';

/** Panelin açık/koyu modu. Tercih `sa-color-mode` anahtarında saklanır, `<html data-sa-theme>` ile uygulanır. */
const STORAGE_KEY = 'sa-color-mode';

interface ColorModeValue {
  mode: AdminColorMode;
  toggle: () => void;
}

const ColorModeContext = createContext<ColorModeValue>({ mode: 'light', toggle: () => undefined });

function initialMode(): AdminColorMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* erişilemiyorsa sistem tercihine bak */ }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function AdminColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AdminColorMode>(initialMode);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-sa-theme', mode);
    root.style.backgroundColor = adminPalettes[mode].ground;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', adminPalettes[mode].ground);
  }, [mode]);

  // Panelden çıkınca (kiralama sitesine geçiş) panel temasını bırak
  useEffect(() => () => {
    document.documentElement.removeAttribute('data-sa-theme');
    document.documentElement.style.backgroundColor = '';
  }, []);

  const toggle = useCallback(() => {
    setMode((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* yoksay */ }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, toggle }), [mode, toggle]);
  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export const useAdminColorMode = () => useContext(ColorModeContext);
