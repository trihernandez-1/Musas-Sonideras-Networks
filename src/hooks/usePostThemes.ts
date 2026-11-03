import { useCallback, useEffect, useState } from 'react';
import type { Theme } from '../types/models';
import { findOrCreateTheme, getAllThemes, upsertTheme, deleteTheme as deleteThemeRepo } from '../db/repos';

/** Shared access to the post-theme list (thematic-analysis codes), so every theme picker
 * stays in sync. Named to avoid clashing with useTheme, the light/dark mode hook. */
export function usePostThemes() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const all = await getAllThemes();
    all.sort((a, b) => a.label.localeCompare(b.label, 'es'));
    setThemes(all);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createTheme = useCallback(
    async (label: string) => {
      const theme = await findOrCreateTheme(label);
      await refresh();
      return theme;
    },
    [refresh],
  );

  const setThemeColor = useCallback(
    async (themeId: string, color: string) => {
      const theme = themes.find((t) => t.id === themeId);
      if (!theme) return;
      await upsertTheme({ ...theme, color });
      await refresh();
    },
    [themes, refresh],
  );

  const deleteTheme = useCallback(
    async (themeId: string) => {
      await deleteThemeRepo(themeId);
      await refresh();
    },
    [refresh],
  );

  return { themes, loaded, refresh, createTheme, setThemeColor, deleteTheme };
}
