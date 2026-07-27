import { useState, useCallback, useEffect } from "react";
import { db } from "../lib/db";
import { apiClient } from "../lib/api";
import { useBibleRAMCache } from "../features/dashboard/hooks/useBibleRAMCache";

const versionHydrations = new Map<string, Promise<void>>();

export const ensureBibleVersionCached = (rawVersion: string): Promise<void> => {
  const version = rawVersion.toLowerCase();
  const existing = versionHydrations.get(version);
  if (existing) return existing;

  const hydration = (async () => {
    const state = await db.syncState.get(version);
    const revisionResponse = await apiClient.get('/bible/revisions');
    const remoteRevision = Number(revisionResponse.data?.revisions?.[version] || 1);
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

export const useBibleSync = () => {
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

  // Hook will auto-hydrate default versions if not found
  // DISABLED: Auto-sync on load causes significant startup lag due to massive 6-version payload.
  // Suggest moving this to a manual "Sync for Offline" button in Settings.
  /*
  useEffect(() => {
    hydrateDefaultVersions();
  }, [hydrateDefaultVersions]);
  */

  return {
    isSyncing,
    error,
    checkAndHydrateTargetVersion,
    hydrateDefaultVersions
  };
};
