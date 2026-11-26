/** How many manual versions (saves, auto-saves before restore) a diagram keeps. */
export const MANUAL_VERSION_LIMIT = 50;

export interface RetainedVersion {
  id: string;
  createdAt: Date;
  projectVersionId: string | null;
}

/**
 * Ids of the versions to delete so a diagram keeps at most `keep` manual versions. Freeze snapshots
 * (projectVersionId set) are audit artifacts: they are never returned and do not count toward the limit.
 */
export function selectVersionsToPrune(versions: readonly RetainedVersion[], keep = MANUAL_VERSION_LIMIT): string[] {
  return versions
    .filter((v) => v.projectVersionId === null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(keep)
    .map((v) => v.id);
}
