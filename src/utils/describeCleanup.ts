import type { OrphanCleanupSummary } from '../db/repos';

/** Turns a post/event-deletion cleanup summary into a human-readable sentence, or null
 * if nothing besides the record itself was removed. */
export function describeCleanup(summary: OrphanCleanupSummary): string | null {
  const parts: string[] = [];
  if (summary.tagLabels.length > 0) {
    parts.push(`tag${summary.tagLabels.length > 1 ? 's' : ''} ${summary.tagLabels.map((l) => `"${l}"`).join(', ')}`);
  }
  if (summary.themeLabels.length > 0) {
    parts.push(`theme${summary.themeLabels.length > 1 ? 's' : ''} ${summary.themeLabels.map((l) => `"${l}"`).join(', ')}`);
  }
  if (summary.collaboratorNames.length > 0) {
    parts.push(`collaborator${summary.collaboratorNames.length > 1 ? 's' : ''} ${summary.collaboratorNames.map((l) => `"${l}"`).join(', ')}`);
  }
  if (parts.length === 0) return null;
  return `Also removed, since nothing else used them: ${parts.join('; ')}.`;
}
