"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AdminTheme = "light" | "dark" | "system";
export type ResolvedAdminTheme = "light" | "dark";

interface AdminThemeContextValue {
  theme: AdminTheme;
  resolvedTheme: ResolvedAdminTheme;
  setTheme: (theme: AdminTheme) => void;
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

const STORAGE_KEY = "admin-theme";

function readStoredTheme(): AdminTheme {
  if (typeof window === "undefined") return "system";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  } catch {
    // Ignore (private mode, etc.)
  }
  return "system";
}

function getSystemTheme(): ResolvedAdminTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

interface AdminThemeProviderProps {
  children: React.ReactNode;
}

export function AdminThemeProvider({ children }: AdminThemeProviderProps) {
  const [theme, setThemeState] = useState<AdminTheme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedAdminTheme>("light");
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = readStoredTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(stored);
    setResolvedTheme(stored === "system" ? getSystemTheme() : stored);
    setMounted(true);
  }, []);

  // Listen to system preference changes when theme === "system"
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolvedTheme(media.matches ? "dark" : "light");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  // Sync the resolved theme to <html> so it covers the entire document —
  // body, scrollbar background, iOS over-scroll "rubber band" zones, etc.
  // The wrapper-only .dark class doesn't reach <html>/<body>, which on
  // mobile makes the default white background leak below `h-[100dvh]`
  // content (since `min-h-screen` upstream can exceed `100dvh`).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    return () => {
      // Clean up on unmount (e.g. when navigating away from admin) so the
      // storefront doesn't inherit admin's dark scheme.
      root.classList.remove("dark");
    };
  }, [resolvedTheme]);

  const setTheme = useCallback((next: AdminTheme) => {
    setThemeState(next);
    setResolvedTheme(next === "system" ? getSystemTheme() : next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore
    }
  }, []);

  const value = useMemo<AdminThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return (
    <AdminThemeContext.Provider value={value}>
      <div
        className={`min-h-[100dvh] bg-background text-foreground ${resolvedTheme === "dark" ? "dark" : ""}`}
        data-admin-theme={resolvedTheme}
        suppressHydrationWarning
        style={{
          // Avoid color flash before hydration: render with no enforced theme
          // until mounted, then transition smoothly.
          colorScheme: mounted ? resolvedTheme : undefined,
        }}
      >
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): AdminThemeContextValue {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) {
    throw new Error("useAdminTheme must be used within AdminThemeProvider");
  }
  return ctx;
}
