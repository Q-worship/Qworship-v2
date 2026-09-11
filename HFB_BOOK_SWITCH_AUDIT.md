# HFB Book-Switch Audit & Implementation Spec

**Subject:** Hands-Free Bible (HFB) voice-to-projection pipeline, Qworship V2
**Symptom reported:** switching between Bible books via voice does not work; navigation inside the currently loaded chapter does.
**Status:** root cause identified, 17 findings, fixes specified below.
**Audience:** implementing engineer/agent. Read §1–§2 before touching code.

---

## 1. Executive summary

Switching **books** is the only voice command in the pipeline with no network fallback. It resolves from the local Bible cache and nothing else — and nothing in the application ever fills that cache.

Three defects compound:

| # | Defect | Effect |
|---|---|---|
| 01 | `processInterimLocally` returns `false` on a cache miss with no HTTP fallback and no log | The book switch dies silently |
| 02 | Offline Bible hydration is disabled and has zero callers; the invalidation path deletes without re-downloading | The cache is almost always cold |
| 03 | The entire server-side command pipeline is behind `ENABLE_SERVER_BIBLE_COMMANDS`, set nowhere in the repo | The safety net that would catch 01 is dark |

Fourteen further findings follow. Four are critical (including an unauthenticated WebSocket that opens a billed Deepgram stream, and two simultaneous HFB engines running against shared stores).

---

## 2. How the pipeline works today

### 2.1 Command classes

All three are parsed from the same Deepgram partial by the same client parser. Only the first can name a *different book*.

```
"Turn to Romans chapter 8 verse 28"     explicit reference   → processInterimLocally
"Now chapter 8, verse 28"               contextual nav       → processContextNavigationLocally
"Next verse" / "Previous chapter"       relative nav         → processRelativeNavigationLocally
```

### 2.2 Dispatch order

`useHandsfreeBible.ts` → `onPartialTranscript` (~line 1010) and `onFinalTranscript` (~line 1053):

```ts
const isHandled =
  processContextNavigationLocally(text, conf, false) ||
  processRelativeNavigationLocally(text, conf, false);

if (!isHandled) {
  void processInterimLocally(text, metadata).then(...)
}
```

### 2.3 Resolution per class

```
processContextNavigationLocally  → executeNavigation("jump_to_chapter_verse", …)
processRelativeNavigationLocally → executeNavigation("verse_change" | "chapter_change", …)
                                        ↓
                                   POST /bible/voice-command      ← NETWORK. Works.

processInterimLocally            → resolveCachedHFBVerse()
                                        ↓
                                   RAM dictionary → IndexedDB
                                        ↓
                                   miss → `return false`          ← DEAD END. This is the bug.
```

Both navigation handlers reach the server. The explicit-reference handler does not. That asymmetry is the exact fingerprint of the reported symptom.

### 2.4 What fills the cache today

Only lazy per-chapter seeding, and only *after* a chapter has already been rendered:

- `useHFBStore.fetchHFBChapter` — cloud-fallback branch, `bulkPut` + `setChapterInRam`
- `useInlineBibleBrowser.fetchBibleChapter` — same pattern

Therefore any book the operator has not already opened this session is a guaranteed cache miss, and therefore unreachable by voice.

### 2.5 Server pipeline (currently inert)

`audio.socket.ts` maintains per-connection session state (`currentContext`, `activeVersion`, `partialState`, occurrence dedup) and can emit `bible_match` / `navigation`. All three execution sites are gated:

```ts
const ENABLE_SERVER_COMMANDS = process.env.ENABLE_SERVER_BIBLE_COMMANDS === "true";
```

The string appears **only** at `audio.socket.ts:562, 657, 689`. Not in `production.env.example`, `docker-compose.yaml`, or anything under `infra/`.

---

## 3. Findings

Severity: **C** critical · **H** high · **M** medium.

| # | Sev | Finding | Location |
|---|:--:|---|---|
| 01 | C | Cache miss on an explicit reference bails silently, no HTTP fallback | `useHandsfreeBible.ts:439–445` |
| 02 | C | Nothing populates the offline cache; invalidation deletes without refetch | `useBibleSync.ts:38–50, 208–214`; `db.ts:56–66` |
| 03 | C | Server command pipeline behind an unset env flag | `audio.socket.ts:562, 657, 689` |
| 04 | C | Projection-sequence high-water mark survives reconnect; server counter resets | `audio.socket.ts:157`; `useHandsfreeBible.ts:126, 171–180` |
| 05 | H | Server clock compared to browser clock with 300 ms tolerance | `useHandsfreeBible.ts:230–241, 1099–1105` |
| 06 | C | Two HFB engines mounted simultaneously; two WebSockets, two Deepgram sessions | `DashboardLayoutV2.tsx:1121`; `LiveConsoleLeftPanel.tsx:22` |
| 07 | H | Manual book browser has no request-sequence guard | `useInlineBibleBrowser.ts:47–173` |
| 08 | H | Parser offsets index a cleaned string; callers slice the raw one | `hfbFastReferenceParser.ts:131–137, 184`; `useHandsfreeBible.ts:431–466, 835, 911` |
| 09 | M | `fetchHFBChapter` hardcodes `verseEnd: 150`; Psalm 119 has 176 | `useHFBStore.ts:341–343` |
| 10 | M | Contextual nav bounds-checks canon-wide, not per-book | `hfbFastReferenceParser.ts:158–161` |
| 11 | M | Voice version change fires three competing loads | `useHandsfreeBible.ts:676–707` |
| 12 | M | `executeNavigation` captures projection generation pre-await | `useHandsfreeBible.ts:562–563, 584–588` |
| 13 | M | Clearing the screen doesn't reset the 5 s re-projection block | `useHandsfreeBible.ts:243–248` |
| 14 | M | Preceding-book guard has a dead branch and a 30-char window | `hfbFastReferenceParser.ts:143–153` |
| 15 | C | Audio WebSocket is unauthenticated; opens billed Deepgram on connect | `audio.socket.ts:141–143, 206, 218` |
| 16 | H | Deepgram connects on panel visibility, not on intent | `useHandsfreeBible.ts:1222–1240`; `audio.socket.ts:218` |
| 17 | M | Version casing has no single normalisation point | `useHFBStore.ts:160–162, 255–279` |

### Verified, *not* a problem

Server and client book-name canonicalisation agree on all 66 names, including the usual offenders. `aliasNormalizer.ts` `name` fields match `bibleBooks.ts` `BIBLE_BOOKS_LCC[].name` exactly — `"Psalms"`, `"Song of Solomon"`, `"Revelation"`, `"1 Corinthians"`. Do not "fix" book naming.

### Evidence for finding 08

The client parser was compiled and executed against realistic transcripts. This is actual output, not inspection:

```
input   "Well, brothers and sisters, let's open to John chapter 3, verse 16."
parsed   John 3:16   start=40  end=63

raw.slice(40, 63)    → "o John chapter 3, verse"      ← what callers actually slice
clean.slice(40, 63)  → "john chapter 3 verse 16"      ← what the parser measured
```

---

## 4. Target architecture after the fixes

### 4.1 Verse resolution becomes one tiered function

Today two call sites implement partial, inconsistent tiering. After the fix there is **one** resolver with four tiers, and every consumer uses it:

```
resolveHFBVerse(book, chapter, verse, version)
  │
  ├─ tier 0  RAM dictionary        useBibleRAMCache.getChapter()          ~0 ms
  ├─ tier 1  IndexedDB             db.verses compound PK lookup           ~1–5 ms
  ├─ tier 2  Network               POST /bible/search (whole chapter)     ~150–600 ms
  │            └─ on success: seed IndexedDB + RAM, so tier 0 hits next time
  └─ tier 3  null                  caller logs and fails closed
```

Tier 2 fetches the **whole chapter**, not the single verse. Cost is comparable, and it warms the chapter the operator is about to navigate within — which is what `fetchHFBChapter` does immediately afterwards anyway.

### 4.2 Invariants to hold after the work

1. **No voice command fails without either projecting or logging.** A silent `return false` is a bug.
2. **One HFB engine per browser tab.** One WebSocket, one Deepgram session, one set of cursors.
3. **One index space per string.** Parser offsets are either always raw-relative or always clean-relative — never mixed.
4. **Clock comparisons never cross domains.** Server timestamps compare to server timestamps only.
5. **Every async state write is sequence-guarded.** If a newer request started, the older response is discarded.
6. **The version key is a lowercase `BibleVersionCode` everywhere except at render.**

### 4.3 Dependency order

```
FIX-03 (env check)     ── independent, do first, it reframes everything
FIX-15 (WS auth)       ── independent, ship immediately
FIX-01 (HTTP fallback) ── absorbs FIX-09; the direct fix for the reported bug
     └─ FIX-02 (hydration)   ── turns FIX-01's network tier into a rare path
FIX-06 (singleton)     ── prerequisite for trusting FIX-04, FIX-12, FIX-16
     ├─ FIX-04 (seq reset)
     ├─ FIX-05 (clock domains)
     └─ FIX-12, FIX-16
FIX-07 (browser guard) ── independent
FIX-08 (index map)     ── independent, but touches FIX-01's caller
FIX-10, 11, 13, 14, 17 ── independent sweep
```

---

## 5. Fixes

### FIX-03 — Confirm and document the server command flag

**Do first. Five minutes.**

1. Check the deployed value of `ENABLE_SERVER_BIBLE_COMMANDS` in the Coolify environment for the server service.
2. If unset (expected), the server has never emitted `bible_match` or `navigation`. Note this in the PR: it means findings 04 and 05 have been *latent*, not active, and will become active the moment the flag is turned on.
3. Either way, add it to `production.env.example` and `docker-compose.yaml` with an explicit value and a comment, so the state is visible:

```env
# Server-side Bible command execution from the audio socket.
# When false, the client parser is the only command path (see FIX-01).
ENABLE_SERVER_BIBLE_COMMANDS=false
```

**Do not enable it in the same PR as any other fix.** Turning it on activates a second command source that races the client parser; that needs its own change and its own rehearsal.

---

### FIX-01 — Tiered verse resolution with a network fallback

**Files:** `apps/client/src/features/dashboard/hooks/useHFBStore.ts`, `apps/client/src/features/dashboard/hooks/useHandsfreeBible.ts`

#### 5.1.1 New resolver in `useHFBStore.ts`

Replace the exported `resolveCachedHFBVerse` usage (keep the function; it becomes tier 0–1) and add a chapter loader plus the full resolver above it.

```ts
import { BIBLE_BOOKS_LCC } from '../data/bibleBooks';

export interface HFBResolvedVerse {
  number: number;
  text: string;
  source: 'ram' | 'indexeddb' | 'network';
}

/** Canonical verse count for a chapter; falls back to the canon maximum. */
const chapterVerseCount = (book: string, chapter: number): number =>
  BIBLE_BOOKS_LCC.find(item => item.name === book)?.verses[chapter - 1] ?? 176;

/**
 * In-flight chapter fetches, keyed `version|book|chapter`.
 * Several interim frames can miss the cache for the same chapter within a few
 * hundred milliseconds; without this they would each fire a request.
 */
const chapterFetches = new Map<string, Promise<HFBChapterVerse[] | null>>();

/**
 * Tier 2. Fetches a whole chapter from the API, seeds IndexedDB and RAM,
 * and returns the normalised verses. Never throws — returns null on failure.
 */
export async function fetchChapterFromNetwork(
  book: string,
  chapter: number,
  version: string,
): Promise<HFBChapterVerse[] | null> {
  const vKey = version.toLowerCase();
  const cacheKey = `${vKey}|${book}|${chapter}`;
  const inFlight = chapterFetches.get(cacheKey);
  if (inFlight) return inFlight;

  const request = (async (): Promise<HFBChapterVerse[] | null> => {
    try {
      const response = await apiClient.post('/bible/search', {
        book,
        chapter,
        verseStart: 1,
        verseEnd: chapterVerseCount(book, chapter),   // FIX-09
        version: vKey,
      });

      const data = response.data;
      if (!data?.success || !data?.result?.verses?.length) {
        console.warn(`[HFB] Network lookup returned no verses for ${book} ${chapter} (${vKey})`);
        return null;
      }

      const verses: HFBChapterVerse[] = (data.result.verses as any[])
        .map(item => ({
          number: Number(item.number ?? item.verse ?? 0),
          text: String(item[vKey] ?? item.text ?? '').trim(),
        }))
        .filter(item => item.number > 0 && item.text.length > 0)
        .sort((left, right) => left.number - right.number);

      if (!verses.length) return null;

      // Seed both cache tiers so the next lookup is instant.
      try {
        await db.verses.bulkPut(verses.map(item => ({
          version: vKey, book, chapter, verse: item.number, text: item.text,
        })));
      } catch (dbError) {
        console.error('[HFB] Failed to seed IndexedDB', dbError);   // non-fatal
      }
      useBibleRAMCache.getState().setChapterInRam(vKey, book, chapter, verses);

      return verses;
    } catch (error) {
      // 404 / 422 (TRANSLATION_TEXT_MISSING) / network — all non-fatal.
      console.warn(`[HFB] Network lookup failed for ${book} ${chapter} (${vKey})`, error);
      return null;
    } finally {
      chapterFetches.delete(cacheKey);
    }
  })();

  chapterFetches.set(cacheKey, request);
  return request;
}

/**
 * Full tiered resolver. RAM → IndexedDB → network. This is the only function
 * callers should use to turn a parsed reference into verse text.
 */
export async function resolveHFBVerse(
  book: string,
  chapter: number,
  verse: number,
  version: string,
): Promise<HFBResolvedVerse | null> {
  const cached = await resolveCachedHFBVerse(book, chapter, verse, version);
  if (cached) return cached;

  const verses = await fetchChapterFromNetwork(book, chapter, version);
  const match = verses?.find(item => item.number === verse);
  if (!match) {
    console.warn(`[HFB] Unresolvable reference: ${book} ${chapter}:${verse} (${version})`);
    return null;
  }
  return { number: match.number, text: match.text, source: 'network' };
}
```

Also apply FIX-09 to the existing `fetchHFBChapter` cloud branch — replace `verseEnd: 150` with `verseEnd: chapterVerseCount(book, chapter)`. Better still, have `fetchHFBChapter`'s cloud branch call `fetchChapterFromNetwork` so there is one network path, one seeding path, and no duplicated mapping logic.

#### 5.1.2 Caller change in `useHandsfreeBible.ts`

In `processInterimLocally`, around line 437:

```ts
// BEFORE
const cached = await resolveCachedHFBVerse(parsed.book, parsed.chapter, parsed.verse, version);
if (!cached) return false;

// AFTER
const resolved = await resolveHFBVerse(parsed.book, parsed.chapter, parsed.verse, version);
if (!resolved) {
  setDetectedCommands(`${parsed.book} ${parsed.chapter}:${parsed.verse} is unavailable in ${version}`);
  return false;
}
```

Then use `resolved` in place of `cached` at the `handleBibleMatch` call (~line 470), including `source: \`client-${resolved.source}\`` in telemetry so the latency HUD distinguishes RAM / IndexedDB / network hits.

#### 5.1.3 Sequence guards — critical, do not skip

The existing guards immediately after the cache read must be **kept and re-checked after the new, longer await**:

```ts
const lookupSequence = ++localLookupSequenceRef.current;
const projectionGeneration = projectionGenerationRef.current;

const resolved = await resolveHFBVerse(...);          // now up to ~600 ms

if (
  lookupSequence !== localLookupSequenceRef.current ||
  projectionGeneration !== projectionGenerationRef.current
) return false;
```

A network tier makes this window an order of magnitude wider than it was. Without the re-check, a slow lookup for a discarded interim can project over a newer verse — the exact class of failure the guards exist to prevent.

#### 5.1.4 Strict-mode interaction

`resolveHFBVerse` runs *after* the strict-mode cue check and *after* the interim confirmation-count check (`count < requiredResults`). Do not move it earlier. Firing network requests on unconfirmed interim frames would issue several requests per utterance.

---

### FIX-02 — Restore offline hydration

**File:** `apps/client/src/hooks/useBibleSync.ts`, plus one call site.

Three changes.

**(a) Re-hydrate what the revision check invalidates.**

`checkBibleCacheRevisions` currently deletes stale versions and fires `qworship:bible-cache-invalidated`, but never re-downloads. Do **not** call `ensureBibleVersionCached` from inside `checkBibleCacheRevisions` — `ensureBibleVersionCached` awaits `checkBibleCacheRevisions()`, which returns the still-pending `revisionCheck` promise, and you deadlock. Trigger it from the event listener instead:

```ts
// inside useBibleSync's existing useEffect
useEffect(() => {
  if (!enabled) return;

  const rehydrateInvalidated = (event: Event) => {
    const versions = (event as CustomEvent<{ versions?: string[] }>).detail?.versions || [];
    for (const version of versions) {
      void ensureBibleVersionCached(version).catch(() => undefined);
    }
  };
  window.addEventListener('qworship:bible-cache-invalidated', rehydrateInvalidated);

  void checkBibleCacheRevisions().catch(/* … existing … */);
  const interval = window.setInterval(() => {
    void checkBibleCacheRevisions(true).catch(() => undefined);
  }, REVISION_CHECK_INTERVAL_MS);

  return () => {
    window.removeEventListener('qworship:bible-cache-invalidated', rehydrateInvalidated);
    window.clearInterval(interval);
  };
}, [enabled]);
```

By the time the event fires, `revisionCheck`'s `.finally` has cleared it and `revisionCheckedAt` is fresh, so the nested `checkBibleCacheRevisions()` returns `cachedRevisions` synchronously. No recursion, no deadlock.

**(b) Hydrate the active version on demand, not all six on login.**

The original auto-hydration was disabled because six versions at ~6 MB each blocked startup. That reasoning is sound — do not simply uncomment it. Hydrate one version, lazily, when HFB actually opens.

In `useHandsfreeBible.ts`, extend the existing preferences effect (~line 158):

```ts
useEffect(() => {
  if (!isHandsfreeBibleOpen && !isPanelActive) return;
  void loadHfbPreferences();
  // Background hydration of the active translation. Non-blocking by design:
  // FIX-01's network tier already guarantees correctness, so this is purely a
  // latency optimisation and must never gate a projection.
  void ensureBibleVersionCached(selectedBibleVersionRef.current.toLowerCase())
    .catch(() => undefined);
}, [isHandsfreeBibleOpen, isPanelActive, loadHfbPreferences]);
```

Add the same call to `applyVoiceVersionChange` and to `HFBTranslationControls.selectVersion`, so switching translation warms the new one. `ensureBibleVersionCached` already de-dupes concurrent calls via the `versionHydrations` map, so it is safe to call freely.

**(c) Expose a visible sync control.**

`syncAllBibleVersions` already accepts an `onProgress` callback shaped for a progress bar. Wire `hydrateAllVersions` to a "Download Bible for offline use" control in Live Console settings. This is the only way an operator can prepare a venue with poor connectivity before a service.

**Ordering note:** FIX-01 must land before or with FIX-02. FIX-01 is the correctness fix; FIX-02 is the latency fix. Shipping FIX-02 alone would mask the bug on developer machines while leaving it live on any freshly-signed-in browser.

---

### FIX-06 — One HFB engine per tab

**Files:** new `apps/client/src/features/dashboard/providers/HandsfreeBibleProvider.tsx`, `DashboardLayoutV2.tsx`, `LiveConsoleLeftPanel.tsx`

`useHandsfreeBible` is currently invoked twice. Each instance opens its own WebSocket; the server constructs a `DeepgramTranscriptionService` per connection. The engines have **private** ordering state and **shared** output:

| Private per instance | Shared globally |
|---|---|
| `currentVerseContextRef` | `useHFBStore` |
| `selectedBibleVersionRef` | `useBibleProjectionStore` |
| `consumedCursorIndexRef` | |
| `executedTurnReferencesRef` | |
| `executedContextNavigationsRef` | |
| `lastProjectedRef` | |
| `projectionGenerationRef` | |
| `lastServerProjectionSequenceRef` | |

Neither can see the other's dedup or generation counters, so no ordering guarantee in the hook actually holds. They also disagree about socket lifetime: the warm-up effect (line 1222) keys off `isHandsfreeBibleOpen || isPanelActive`, which differ between instances, so one instance's cleanup tears down a socket the other just opened.

**Change:** hoist to a provider mounted exactly once.

```tsx
// providers/HandsfreeBibleProvider.tsx
import { createContext, useContext, MutableRefObject, ReactNode } from 'react';
import { useHandsfreeBible } from '../hooks/useHandsfreeBible';

type HandsfreeBibleApi = ReturnType<typeof useHandsfreeBible>;
const HandsfreeBibleContext = createContext<HandsfreeBibleApi | null>(null);

export function HandsfreeBibleProvider({
  liveWindow, handsfreeBibleButtonRef, isPanelActive, children,
}: {
  liveWindow: Window | null;
  handsfreeBibleButtonRef: MutableRefObject<HTMLElement | null>;
  isPanelActive: boolean;
  children: ReactNode;
}) {
  const api = useHandsfreeBible({ liveWindow, handsfreeBibleButtonRef, isPanelActive });
  return (
    <HandsfreeBibleContext.Provider value={api}>{children}</HandsfreeBibleContext.Provider>
  );
}

export function useHandsfreeBibleContext(): HandsfreeBibleApi {
  const value = useContext(HandsfreeBibleContext);
  if (!value) throw new Error('useHandsfreeBibleContext must be used within HandsfreeBibleProvider');
  return value;
}
```

Then:

1. In `DashboardLayoutV2.tsx`, replace the direct `useHandsfreeBible({...})` call at line 1121 with the provider wrapping the dashboard subtree, and consume the API via `useHandsfreeBibleContext()` where the destructured values are used.
2. `isPanelActive` must now be the **union** of both former conditions. Lift `leftPanelTab` from `useLiveConsoleStore` in the provider and pass `isPanelActive={leftPanelTab === 'hfb'}`; the hook already ORs it with its own `isHandsfreeBibleOpen`.
3. In `LiveConsoleLeftPanel.tsx`, delete the `useHandsfreeBible` call and the `dummyRef`, and replace with `const hfb = useHandsfreeBibleContext();`.

**Verification:** open the Live Console, then confirm exactly one `[HFB Socket] Connecting` line in the browser console and exactly one `[AudioSocket] Client connected` line in the server log.

---

### FIX-04 — Reset the projection sequence on socket reconnect

**Files:** `apps/client/src/hooks/useRealtimeSocket.ts`, `useHandsfreeBible.ts`

`projectionSequence` is declared inside `wss.on("connection")` (`audio.socket.ts:157`), so it is per-WebSocket. The client's `lastServerProjectionSequenceRef` is per-hook-lifetime. After any reconnect the server restarts at 1 while the client holds a larger value, and every projection is rejected.

Note that `onConnectionStatus` relays the **Deepgram** status, not the browser socket status — Deepgram can reconnect within one WebSocket. Reset must be driven by the browser socket's `onopen`.

**(a)** Add an `onSocketOpen` callback to `RealtimeSocketProps` and invoke it in `ws.onopen`:

```ts
ws.onopen = () => {
  // … existing flush of pendingControlRef / pendingAudioRef …
  callbacks.current.onSocketOpen?.();
};
```

**(b)** In `useHandsfreeBible.ts`, pass:

```ts
onSocketOpen: () => {
  // The server's projectionSequence is per-connection and restarts at 0.
  lastServerProjectionSequenceRef.current = 0;
  lastServerProjectionAtRef.current = 0;   // see FIX-05
},
```

**Optional hardening:** have the server include a `connectionId` (a UUID minted per connection) alongside `projectionSequence`, and have the client key its high-water mark on `{connectionId, seq}`. That removes the reliance on callback ordering entirely.

---

### FIX-05 — Stop comparing clock domains

**File:** `useHandsfreeBible.ts`

`incomingServerTime` derives from `telemetry.serverResolvedAt` — `Date.now()` on the server. `lastProjectionTimestampRef.current` is `Date.now()` in the browser. They are compared with a 300 ms tolerance at lines 234–241 and again at 1099–1105 for navigation. Any skew past 300 ms permanently suppresses server projections for the session.

Introduce a second ref and compare like-for-like:

```ts
// alongside lastProjectionTimestampRef (client clock, keep for latency telemetry)
const lastServerProjectionAtRef = useRef(0);   // server clock only
```

In `handleBibleMatch`:

```ts
const incomingServerTime =
  data?.telemetry?.serverResolvedAt || data?.serverDetectedAt || data?.serverTimestamp;

if (incomingServerTime && lastServerProjectionAtRef.current > 0) {
  if (incomingServerTime < lastServerProjectionAtRef.current - 300) {
    console.info(`[HFB] Stale server projection suppressed: ${projectionKey}`);
    return;
  }
}
// … on accept:
if (incomingServerTime) lastServerProjectionAtRef.current = incomingServerTime;
lastProjectionTimestampRef.current = Date.now();   // client clock, telemetry only
```

Apply the identical change in the `onNavigation` handler (line 1099). Reset both refs in `onSocketOpen` (FIX-04) and in `closeHandsfreeBible`.

`lastProjectionTimestampRef` stays, but it must no longer participate in any staleness decision — only in latency reporting.

---

### FIX-07 — Sequence-guard the manual book browser

**File:** `apps/client/src/features/dashboard/hooks/useInlineBibleBrowser.ts`

`useHFBStore.fetchHFBChapter` guards every await with `latestChapterFetchSequence` (line 158, checked at 271/290/311/329/344/371/377/382). `useInlineBibleBrowser.fetchBibleChapter` has no equivalent. Click a cold book (cloud, 300–800 ms) then a warm one (RAM, ~0 ms): the warm chapter renders, then the cold response lands and calls `setBiblePassage` over it. `bibleBookIndex` still points at the second book, so the breadcrumb and the verse grid disagree.

```ts
const fetchSequenceRef = useRef(0);

const fetchBibleChapter = useCallback(async (bookName, chapter, version) => {
  const sequence = ++fetchSequenceRef.current;
  const isCurrent = () => sequence === fetchSequenceRef.current;

  setBibleIsLoading(true);
  setBibleSearchError(null);
  try {
    // … RAM tier: guard before every setState …
    if (ramVerses?.length && !hasEmptyTranslationText) {
      if (!isCurrent()) return null;
      setBiblePassage(p);
      setBibleIsLoading(false);
      return p;
    }

    const localVerses = await db.verses.where({ version: vKey, book: bookName, chapter }).toArray();
    if (!isCurrent()) return null;
    // … IndexedDB tier …

    const resp = await apiClient.post('/bible/search', { … });
    if (!isCurrent()) return null;
    // … cloud tier …
  } catch {
    if (isCurrent()) setBibleSearchError('Error loading chapter.');
  } finally {
    if (isCurrent()) setBibleIsLoading(false);
  }
  return null;
}, []);
```

Every `setBiblePassage`, `setBibleIsLoading`, `setBibleSearchError` and cache-seed write must sit behind `isCurrent()`. Returning `null` from a superseded call is important: `handleVersionChange` and `handleBibleSearch` both act on the return value, and must not act on a stale passage.

Add an `AbortController` per request and abort the previous one at the top of the callback while you are here.

---

### FIX-08 — One index space for parser offsets

**Files:** `apps/client/src/features/dashboard/lib/hfbFastReferenceParser.ts`, `useHandsfreeBible.ts`, `LiveConsoleLeftPanel.tsx`

`parseHFBReference` (line 184) and `scanHFBContextNavigations` (line 131) normalise before matching:

```ts
const clean = text.toLowerCase().replace(/[!?;,]+/g, " ").replace(/\s+/g, " ").trim();
```

and return `start` / `end` as offsets into `clean`. Callers apply them to `text`. Two consequences: the Live Transcript HUD splits `committedText` / candidate / `liveTailText` at the wrong character, and `processRelativeNavigationLocally` mixes the spaces outright — slicing raw text with a clean cursor at line 835, then writing a raw `text.length` back into that cursor at line 911.

**Preferred fix:** build an index map during normalisation and translate offsets back before returning.

```ts
interface CleanedText { clean: string; map: number[] }   // map[i] = index in the original

function cleanWithMap(text: string): CleanedText {
  const clean: string[] = [];
  const map: number[] = [];
  let pendingSpace = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const isSeparator = /[!?;,]/.test(char) || /\s/.test(char);
    if (isSeparator) {
      if (clean.length > 0) pendingSpace = true;
      continue;
    }
    if (pendingSpace) { clean.push(' '); map.push(index); pendingSpace = false; }
    clean.push(char.toLowerCase());
    map.push(index);
  }
  return { clean: clean.join(''), map };
}

/** Translate a [start, end) range in clean-space to raw-space. */
const toRawRange = (map: number[], start: number, end: number) => ({
  start: map[start] ?? 0,
  end: (map[end - 1] ?? map[map.length - 1] ?? 0) + 1,
});
```

`scanHFBContextNavigations` strips `[!?;,.:]` while `parseHFBReference` strips `[!?;,]` — preserve that difference by parameterising the separator class rather than unifying it. The `.` and `:` difference is deliberate: `parseHFBReference` needs `:` intact for the `Book 3:16` colon pattern (pattern index 3).

Then in each function, after a successful match, return `{...toRawRange(map, match.index, match.index + match[0].length), rawText: text.slice(rawStart, rawEnd)}`. `rawText` should be the original substring, not the cleaned one — the HUD displays it.

**Then audit every consumer of `start`/`end`:**

- `processInterimLocally` — `consumedCursorIndexRef`, `lastParsedOffsetRef`, the three `text.slice()` calls building `hfbLiveTokens`
- `processContextNavigationLocally` — `navigation.end`, the `text.slice()` calls
- `processRelativeNavigationLocally` — line 835 `text.slice(fromIndex)`, line 911 `consumedCursorIndexRef.current = text.length`
- `LiveConsoleLeftPanel.tsx:248–288` — renders `committedText` / `candidate.label` / `liveTailText`

All of these become correct once offsets are raw-relative, and no further change is needed in them.

**Cheaper alternative** if the map is too invasive: normalise once in `onPartialTranscript`, store the cleaned text, and pass *that* to every handler, the store's `setHfbCurrentPartial`, and the HUD. Consistent, but the operator then sees a punctuation-stripped transcript, which is a visible regression. Prefer the map.

**Regression test:**

```
parseHFBReference("Well, brothers and sisters, let's open to John chapter 3, verse 16.")
  → start/end such that raw.slice(start, end) === "John chapter 3, verse 16"
```

---

### FIX-15 — Authenticate the audio WebSocket

**File:** `apps/server/src/modules/bible/audio.socket.ts`

Every HTTP route in `bible.routes.ts` carries `protect, requireProductAccess`. The WebSocket server does not. `wss.on("connection")` accepts any client reaching `/api/bible/audio-stream`, and `transcriptionService.connect()` fires at line 218 — before any audio arrives, with no identity check at any point. Anyone who can reach the host gets free unmetered speech-to-text on the Deepgram account and can hold open unlimited concurrent sessions.

Reject at the HTTP upgrade so no `WebSocket` object is ever constructed for an unauthenticated peer:

```ts
export function setupAudioSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request, socket, head) => {
    const { pathname, searchParams } = new URL(request.url ?? '', 'http://localhost');
    if (pathname !== '/api/bible/audio-stream') return;   // let other handlers have it

    try {
      // Browsers cannot set headers on WebSocket handshakes, so the token
      // arrives as a query parameter. Cookie auth also works if the client
      // sends credentials on the upgrade.
      const token = searchParams.get('token');
      const user = await verifyAudioSocketToken(token);   // reuse auth.middleware logic
      if (!user || !hasProductAccess(user)) throw new Error('unauthorised');

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, user);
      });
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, _request, user) => { /* … existing body … */ });
  return wss;
}
```

Factor the JWT verification out of `auth.middleware.ts` into a shared function so the socket and the routes cannot drift apart.

**Client side:** `useRealtimeSocket.connect()` must append the token:

```ts
const token = localStorage.getItem('token') || localStorage.getItem('authToken');
const wsUrl = `${baseUrl}/api/bible/audio-stream?token=${encodeURIComponent(token ?? '')}`;
```

A token in a query string appears in server access logs — either scrub that path in the log format or issue a short-lived socket ticket from a `POST /bible/audio-ticket` endpoint and pass the ticket instead. The ticket approach is preferable if you have the budget.

---

### FIX-16 — Open Deepgram on intent, not on visibility

**Files:** `audio.socket.ts`, `useHandsfreeBible.ts`

The client warm-up effect connects the socket as soon as HFB is visible (line 1222); the server connects to Deepgram as soon as the socket opens (line 218). With FIX-06 unlanded that is two Deepgram sessions per console, held alive by the 3-minute inactivity timer whether or not the microphone is ever used.

Keep the browser→server socket warm — that is a genuine latency win and the buffering in `sendPCMData` depends on it. Move only the Deepgram connection:

1. Remove the eager `transcriptionService.connect()` at line 218.
2. Connect on the first binary frame in the `ws.on("message")` handler, next to the existing `firstAudioAt` bookkeeping, or on an explicit `hfb_trace_start` control message (the client already sends this from `toggleMicrophone`, which is exactly "the user pressed Listen").
3. Add an idle teardown: if no audio for N seconds, call `transcriptionService.stop()` and reconnect on the next frame. The client's existing 3-minute `INACTIVITY_TIMEOUT_MS` is the natural upper bound; something shorter (30–60 s) is better for cost.
4. `connection_status` events must still reach the client. While Deepgram is intentionally not connected, report `"idle"` rather than `"disconnected"` so the HFB status pill does not show "Unavailable" during normal standby.

---

### FIX-10 — Bound contextual navigation to the active book

**File:** `hfbFastReferenceParser.ts:158–161`

```ts
// current — canon-wide, book-agnostic
if (
  Number.isInteger(chapter) && chapter >= 1 && chapter <= 150 &&
  Number.isInteger(verse) && verse >= 1 && verse <= 176
) { … }
```

"Chapter 90 verse 3" is accepted while sitting in John (21 chapters) and dispatched to the server as a real command. `parseHFBReference` already validates against `BIBLE_BOOKS_LCC` at lines 198–199.

`scanHFBContextNavigations` does not currently know the active book, so thread it in as an optional parameter:

```ts
export function scanHFBContextNavigations(
  text: string,
  fromIndex = 0,
  activeBook?: string,
): HFBContextNavigation[] {
  const bookData = activeBook
    ? BIBLE_BOOKS_LCC.find(item => item.name === activeBook)
    : undefined;
  const maxChapter = bookData?.chapters ?? 150;
  const maxVerse = bookData ? Math.max(...bookData.verses) : 176;
  // … then validate chapter <= maxChapter, verse <= maxVerse, and additionally
  //     verse <= bookData.verses[chapter - 1] when bookData is known
}
```

The caller in `processContextNavigationLocally` resolves `bookName` at line 723 *after* calling the scanner. Reorder: resolve `bookName` first (from `parseHFBReference`, then `hfbBookName`, then the projection store, then `currentVerseContextRef`), then pass it into the scan. Keep the existing behaviour when `activeBook` is undefined so the parser stays usable standalone.

---

### FIX-11 — One load per voice version change

**File:** `useHandsfreeBible.ts:676–707`

`applyVoiceVersionChange` currently fires `fetchHFBChapter` *and* `executeNavigation("jump_to_verse", …)`; the resulting `handleBibleMatch` then calls `fetchHFBChapter` a third time (line 309). Whichever settles last wins.

With FIX-01 in place, the resolver already does the right thing. Replace the body with a single resolution:

```ts
const ctx = currentVerseContextRef.current;
const book = ctx?.book || hfbState.hfbBookName;
const chapter = ctx?.chapter || hfbState.hfbChapter;
const verseNum = ctx?.verse || hfbState.hfbActiveVerseNum || 1;
if (!book || !chapter) return;

const resolved = await resolveHFBVerse(book, chapter, verseNum, normalized);
if (!resolved) {
  setDetectedCommands(`${normalized} text unavailable for ${book} ${chapter}:${verseNum}`);
  return;
}
handleBibleMatch({
  commandType: 'version_change',
  requestedVersion: normalized,
  result: { book, chapter, verses: [{ verse: verseNum, [normalized.toLowerCase()]: resolved.text }] },
  telemetry: { source: `client-${resolved.source}` },
}, normalized);
```

`handleBibleMatch` already calls `fetchHFBChapter` to refresh Center Stage, so no separate call is needed.

---

### FIX-12 — Don't kill navigation on an unrelated projection

**File:** `useHandsfreeBible.ts:562–563, 584–588`

`executeNavigation` captures `projectionGenerationRef.current` before its await and discards the response if it changed. Any unrelated projection landing during the round trip kills a legitimate navigation. With FIX-06 landed the generation counter becomes single-source and this fires far less often, but the guard is still wrong in kind: `navigationRequestSequenceRef` already provides correct ordering *for navigations*, which is the property that matters here.

Drop `projectionGeneration` from the `executeNavigation` staleness check and keep `requestSequence` only:

```ts
if (requestSequence !== navigationRequestSequenceRef.current) {
  console.info('[HFB] Superseded navigation response discarded');
  return;
}
```

Leave the generation guard in `processInterimLocally` — there it is doing real work, because a cached lookup genuinely can be superseded by a projection from another source.

---

### FIX-13 — Clearing the screen should clear the re-projection block

**File:** `useHandsfreeBible.ts:243–248`, plus the clear handlers

`lastProjectedRef` blocks the same reference for 5 s. `closeHandsfreeBible` resets it implicitly by clearing store state, but the "Clear screen" buttons in `LiveConsoleCenterStage` (lines 302–310) and the "Clear" in the detected-verses list do not, so an operator who clears by mistake cannot immediately say the verse again.

Expose a reset from the hook and call it from both clear paths:

```ts
const resetProjectionDedup = useCallback(() => {
  lastProjectedRef.current = { key: '', at: 0 };
  pendingInterimRef.current = { key: '', count: 0, at: 0, firstSeenAt: 0 };
  executedTurnReferencesRef.current.clear();
  executedContextNavigationsRef.current.clear();
  executedRelativeNavigationsRef.current.clear();
}, []);
```

Return it from the hook and call it in `onClearProjection`. With FIX-06 the context makes this reachable from the Center Stage component without prop drilling.

---

### FIX-14 — Tidy the preceding-book guard

**File:** `hfbFastReferenceParser.ts:143–153`

Two issues, both cosmetic today but misleading:

1. The guard tests `` `\\b${alias}(?:\\s+chapter)?\\s*$` `` against the prefix. `contextualChapterVersePattern` always begins at the literal word `chapter`, so the prefix can never end with it — that alternation is dead. Remove it.
2. `prefix.slice(-30)` is enough for every current alias (`"1 thessalonians"` is 15 chars, `"song of solomon"` 15) but leaves no margin for longer conversational forms. Compute the window from the longest alias instead: `prefix.slice(-(longestAliasLength + 4))`.

Also worth doing while here: the loop `for (const [alias] of aliases)` compiles a fresh `RegExp` per alias per match, ~120 allocations per scan on every interim frame. Precompute a single alternation anchored at end-of-string at module load, the way `bookAlternation` already is.

---

### FIX-17 — Normalise the version key once

**Files:** `useHFBStore.ts`, `useHandsfreeBible.ts`, `HFBTranslationControls.tsx`

`hfbVersion` is written uppercase by `fetchHFBChapter` (line 267) and `setHfbVersion`, lowercased at each cache-key site, sent lowercase over the socket, and compared with ad-hoc `.toLowerCase()` calls. It works today, but there is no single normalisation point — and a cache key that silently disagrees by case is exactly the failure mode behind findings 01 and 02.

Store the lowercase `BibleVersionCode` (the type already exists in `bibleTranslations.ts`) as the single source of truth:

```ts
hfbVersion: BibleVersionCode;                                   // always lowercase
setHfbVersion: (version: string) => set({
  hfbVersion: normalizeBibleVersion(version) ?? 'kjv',          // already exported
});
```

Uppercase only at the render boundary (`item.abbreviation` in `HFBTranslationControls` already does this correctly). Update `selectedBibleVersionRef` to hold the same lowercase code and remove the `.toUpperCase()` / `.toLowerCase()` churn through `handleBibleMatch`, `processInterimLocally` and `executeNavigation`.

Do this **after** FIX-01 and FIX-02, and in its own commit — it touches many lines and a mistake here reintroduces exactly the class of bug being fixed.

---

## 6. Verification

### 6.1 Manual — the reported bug

Use a **fresh browser profile** (or clear IndexedDB for the origin) so the cache is genuinely cold. Testing with a warm cache will show a false pass.

1. Open Live Console → HFB → Listen.
2. Say "John chapter 3 verse 16". Expect projection, and `[HFB Latency]` with `source: client-network` on the first hit.
3. Say "Romans chapter 8 verse 28". **This is the regression case.** Expect projection.
4. Say "verse 30" → stays in Romans 8. Say "next chapter" → Romans 9:1.
5. Say "Psalms chapter 119 verse 176". Expect projection — this covers FIX-09.
6. Repeat step 3. Expect `source: client-ram`.

### 6.2 Manual — races

- **FIX-07:** with a cold cache, click Genesis then immediately click John. The breadcrumb and the verse grid must agree. Repeat with the network throttled to Slow 3G.
- **FIX-06:** open the console. Exactly one `[HFB Socket] Connecting` client-side and one `[AudioSocket] Client connected` server-side.
- **FIX-04:** with HFB listening, kill the server, restart it, wait for reconnect, then say a reference. It must project. Before the fix it never does.

### 6.3 Automated

Add a test file for the client parser — it has no dependency on React or the DOM and is trivially testable:

```ts
// FIX-08: offsets must be raw-relative
const text = "Well, brothers and sisters, let's open to John chapter 3, verse 16.";
const parsed = parseHFBReference(text);
assert.equal(text.slice(parsed.start, parsed.end), "John chapter 3, verse 16");

// FIX-10: bounds are per-book
assert.deepEqual(scanHFBContextNavigations("chapter 90 verse 3", 0, "John"), []);
assert.equal(scanHFBContextNavigations("chapter 90 verse 3", 0, "Psalms").length, 1);

// preceding-book guard must still suppress explicit references
assert.deepEqual(scanHFBContextNavigations("Romans chapter 8 verse 28"), []);
```

The regression cases already written in `hfb_issues.md` §7 should be turned into real assertions in the same file.

---

## 7. Scope and confidence

**Read in full:** `useHandsfreeBible.ts`, `useHFBStore.ts`, `useBibleRAMCache.ts`, `useInlineBibleBrowser.ts`, `useBibleSync.ts`, `useRealtimeSocket.ts`, `hfbFastReferenceParser.ts`, `bibleBooks.ts`, `bibleTranslations.ts`, `db.ts`, `api.ts`, all seven `live-console/` components, `LiveControlCentre.tsx`, `useBibleProjectionStore.ts`; server-side `audio.socket.ts`, `bible.controller.ts`, `bible.routes.ts`, `bible.model.ts`, `aliasNormalizer.ts`.

- Findings **08** and **14** were verified by compiling the real client parser and executing it against realistic transcripts. The offsets quoted are actual output.
- Findings **02**, **03** and **06** rest on absence of callers, confirmed across every file importing the relevant modules. A repo-wide `grep` is worth thirty seconds before acting on **03**.
- Book-name canonicalisation was checked and is **not** a defect. Do not change it.
- **Not audited in depth:** `bible.service.ts` (87 KB), `fast-bible-parser.ts` beyond `scanForCommands`, `deepgram.service.ts`, and the `LivePresentation` render path.
- The parser defects already catalogued in `hfb_issues.md` — spoken compound numerals, Psalms three-digit chapters, digit-by-digit phrasing — are real and unaddressed, but are a **separate workstream** from this one. Do not fold them into these PRs; they change parse *results*, whereas everything here changes *delivery*, and mixing them makes any regression impossible to attribute.
