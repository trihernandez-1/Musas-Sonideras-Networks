import type { ID, Post } from '../types/models';

/** Every role a collaborator was given on this post, de-duplicated and in the order they were
 * added. Handles both the current multi-role array shape and the single-string shape used
 * before a person could have more than one role on the same post, so older records never need
 * a migration pass — read collaboratorRoles through this rather than indexing it directly. */
export function rolesForCollaborator(post: Pick<Post, 'collaboratorRoles'>, collaboratorId: ID): string[] {
  const raw = post.collaboratorRoles?.[collaboratorId];
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const role of list) {
    const trimmed = role.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

/** The most prominent of a collaborator's roles on this post — the first one listed — for
 * contexts where only a single role can be shown (a node's fill color, a compact label). */
export function primaryRole(post: Pick<Post, 'collaboratorRoles'>, collaboratorId: ID): string | undefined {
  return rolesForCollaborator(post, collaboratorId)[0];
}

/** Roles joined for plain-text display, e.g. "DJ, Designer". */
export function formatRoles(post: Pick<Post, 'collaboratorRoles'>, collaboratorId: ID): string {
  return rolesForCollaborator(post, collaboratorId).join(', ');
}
