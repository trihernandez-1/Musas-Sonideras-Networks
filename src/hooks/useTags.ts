import { useCallback, useEffect, useState } from 'react';
import type { Tag } from '../types/models';
import { findOrCreateTag, getAllTags, upsertTag, deleteTag as deleteTagRepo } from '../db/repos';

/** Shared access to the tag list, so every tag picker across the app stays in sync. */
export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const all = await getAllTags();
    all.sort((a, b) => a.label.localeCompare(b.label, 'es'));
    setTags(all);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createTag = useCallback(
    async (label: string) => {
      const tag = await findOrCreateTag(label);
      await refresh();
      return tag;
    },
    [refresh],
  );

  const setTagColor = useCallback(
    async (tagId: string, color: string) => {
      const tag = tags.find((t) => t.id === tagId);
      if (!tag) return;
      await upsertTag({ ...tag, color });
      await refresh();
    },
    [tags, refresh],
  );

  const deleteTag = useCallback(
    async (tagId: string) => {
      await deleteTagRepo(tagId);
      await refresh();
    },
    [refresh],
  );

  return { tags, loaded, refresh, createTag, setTagColor, deleteTag };
}
