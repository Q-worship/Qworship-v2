import { useState, useCallback, useEffect } from "react";
import { db } from "../lib/db";
import { apiClient } from "../lib/api";
import { useBibleRAMCache } from "../features/dashboard/hooks/useBibleRAMCache";

const versionHydrations = new Map<string, Promise<void>>();
const REVISION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
let revisionCheck: Promise<Record<string, number>> | null = null;
let revisionCheckedAt = 0;
let cachedRevisions: Record<string, number> = {};

export interface BibleSyncProgress {
  completed: number;
  total: number;
  version?: string;
  status: "checking" | "downloading" | "ready";
}

export const checkBibleCacheRevisions = (
  force = false,
): Promise<Record<string, number>> => {
  // A forced refresh bypasses the five-minute cache, not an identical request
  // already in flight. Sharing the active check prevents double invalidation.
  if (revisionCheck) return revisionCheck;
  if (!force && revisionCheckedAt && Date.now() - revisionCheckedAt < REVISION_CHECK_INTERVAL_MS) {
    return Promise.resolve(cachedRevisions);
  }

  revisionCheck = (async () => {
    const response = await apiClient.get('/bible/revisions');
    const revisions: Record<string, number> = response.data?.revisions || {};
    const localStates = await db.syncState.toArray();
    const staleVersions = localStates
      .filter(state => state.status === 'synced' &&
        Number(state.revision || 1) !== Number(revisions[state.version] || 1))
      .map(state => state.version);

    if (staleVersions.length) {
      await db.transaction('rw', db.verses, db.syncState, async () => {
        for (const version of staleVersions) {
          await db.verses.where('version').equals(version).delete();
          await db.syncState.delete(version);
        }
      });
      staleVersions.forEach(version => useBibleRAMCache.getState().clearVersion(version));
      window.dispatchEvent(new CustomEvent('qworship:bible-cache-invalidated', {
        detail: { versions: staleVersions },
      }));
      console.info('[Offline Bible] Invalidated stale translations', staleVersions);
    }

    revisionCheckedAt = Date.now();
    cachedRevisions = revisions;
    return revisions;
  })().finally(() => {
    revisionCheck = null;
  });
  return revisionCheck;
};

export const ensureBibleVersionCached = (rawVersion: string): Promise<void> => {
  const version = rawVersion.toLowerCase();
  const existing = versionHydrations.get(version);
  if (existing) return existing;

  const hydration = (async () => {
    const revisions = await checkBibleCacheRevisions();
    const state = await db.syncState.get(version);
    const remoteRevision = Number(revisions[version] || 1);
    const localCount = await db.verses.where("version").equals(version).count();

    if (
      state?.status === "synced" &&
      state.revision === remoteRevision &&
      localCount > 0 &&
      (!state.totalVerses || state.totalVerses === localCount)
    ) {
      if (!useBibleRAMCache.getState().dictionary[version]) {
        const localVerses = await db.verses.where("version").equals(version).toArray();
        useBibleRAMCache.getState().setVersionInRam(version, localVerses);
      }
      return;
    }

    await db.syncState.put({
      version,
      status: "downloading",
      syncedAt: Date.now(),
      revision: state?.revision,
    });
    const response = await apiClient.get(`/bible/export/${version}`);
    if (!response.data?.success || !Array.isArray(response.data?.verses)) {
      throw new Error("Invalid Bible export payload");
    }
    const verses = response.data.verses;
    const exportedTotal = Number(response.data.total);
    if (Number.isFinite(exportedTotal) && verses.length !== exportedTotal) {
      throw new Error(`${version.toUpperCase()} export was truncated during download`);
    }
    await db.transaction('rw', db.verses, db.syncState, async () => {
      await db.verses.where('version').equals(version).delete();
      await db.verses.bulkAdd(verses);
      await db.syncState.put({
        version,
        status: "synced",
        syncedAt: Date.now(),
        totalVerses: verses.length,
        revision: Number(response.data.revision || remoteRevision),
      });
    });
    useBibleRAMCache.getState().setVersionInRam(version, verses);
    console.info(`[Offline Bible] ${version.toUpperCase()} is ready in IndexedDB and RAM`);
  })()
    .catch(async (error) => {
      console.error(`[Offline Bible] Failed to hydrate ${version}:`, error);
      await db.syncState.put({
        version,
        status: "error",
        syncedAt: Date.now(),
      });
      throw error;
    })
    .finally(() => {
      versionHydrations.delete(version);
    });

  versionHydrations.set(version, hydration);
  return hydration;
};

export const syncAllBibleVersions = async (
  onProgress?: (progress: BibleSyncProgress) => void,
): Promise<string[]> => {
  onProgress?.({ completed: 0, total: 1, status: "checking" });
  const [catalogResponse] = await Promise.all([
    apiClient.get('/bible/translations'),
    checkBibleCacheRevisions(true),
  ]);
  const translations = Array.isArray(catalogResponse.data?.translations)
    ? catalogResponse.data.translations
    : [];
  const versions = translations
    .filter((translation: any) => translation?.imported)
    .map((translation: any) => String(translation.code || '').toLowerCase())
    .filter(Boolean);
  if (!versions.length) throw new Error("No imported Bible translations are available to synchronize");

  for (let index = 0; index < versions.length; index += 1) {
    const version = versions[index];
    onProgress?.({ completed: index, total: versions.length, version, status: "downloading" });
    await ensureBibleVersionCached(version);
    onProgress?.({ completed: index + 1, total: versions.length, version, status: "ready" });
  }
  return versions;
};

export const useBibleSync = (enabled = true) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAndHydrateTargetVersion = useCallback(
    async (version: string, updateSyncState: boolean = true) => {
      try {
        if (updateSyncState) setIsSyncing(true);
        setError(null);
        await ensureBibleVersionCached(version);
      } catch (err: any) {
        console.error(`[Offline Bible] Failed to sync ${version}:`, err);
        setError(err?.message || "Failed to sync offline bible");
      } finally {
        if (updateSyncState) setIsSyncing(false);
      }
    },
    []
  );

  const hydrateDefaultVersions = useCallback(async () => {
    setIsSyncing(true);
    try {
      // We sequentially download to avoid choking network/memory on initially massive payload
      await checkAndHydrateTargetVersion("kjv", false);
      await checkAndHydrateTargetVersion("nkjv", false);
      await checkAndHydrateTargetVersion("amp", false);
      await checkAndHydrateTargetVersion("msg", false);
      await checkAndHydrateTargetVersion("esv", false);
      await checkAndHydrateTargetVersion("niv", false);
    } finally {
      setIsSyncing(false);
    }
  }, [checkAndHydrateTargetVersion]);

  const hydrateAllVersions = useCallback(async (
    onProgress?: (progress: BibleSyncProgress) => void,
  ) => {
    setIsSyncing(true);
    setError(null);
    try {
      return await syncAllBibleVersions(onProgress);
    } catch (err: any) {
      setError(err?.message || "Failed to sync offline bible");
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Hook will auto-hydrate default versions if not found
  // DISABLED: Auto-sync on load causes significant startup lag due to massive 6-version payload.
  // Suggest moving this to a manual "Sync for Offline" button in Settings.
  /*
  useEffect(() => {
    hydrateDefaultVersions();
  }, [hydrateDefaultVersions]);
  */

  useEffect(() => {
    if (!enabled) return;
    void checkBibleCacheRevisions().catch((err: any) => {
      console.warn('[Offline Bible] Revision manifest check failed', err);
      setError(err?.message || 'Failed to check Bible updates');
    });
    const interval = window.setInterval(() => {
      void checkBibleCacheRevisions(true).catch(() => undefined);
    }, REVISION_CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [enabled]);

  return {
    isSyncing,
    error,
    checkAndHydrateTargetVersion,
    hydrateDefaultVersions,
    hydrateAllVersions,
  };
};
