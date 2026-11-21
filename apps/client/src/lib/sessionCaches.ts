/**
 * Caches that belong to one signed-in session, and how to drop them.
 *
 * A registry rather than a list of imports, because the caches live inside
 * features and the thing that ends a session — the auth store — must not
 * reach across into them. `features/a` importing `features/b` is the rule
 * this project checks by grep at the end of every change, and auth reaching
 * into the dashboard's RAM caches broke it.
 *
 * So each cache registers itself (a feature importing `lib` is allowed, the
 * other direction is not), and sign-out calls `resetSessionCaches()` without
 * knowing what has registered. Nothing registered is a no-op, which is also
 * the honest answer for a page that never mounted the dashboard.
 */
type Reset = () => void;

const resets = new Map<string, Reset>();

/**
 * Register a cache to be emptied when the session ends.
 *
 * Keyed by name so a hot reload re-registering the same cache replaces it
 * rather than accumulating duplicates.
 */
export function registerSessionCache(name: string, reset: Reset): void {
  resets.set(name, reset);
}

/**
 * Empty every registered cache. Called when somebody signs out, and when a
 * different user signs in — the case that matters on a shared console
 * machine, where the next person must not inherit the last one's data.
 *
 * One cache throwing must not stop the others, and must not stop a sign-out.
 */
export function resetSessionCaches(): void {
  for (const [name, reset] of resets) {
    try {
      reset();
    } catch (error) {
      console.warn(`[session] Could not reset the ${name} cache`, error);
    }
  }
}
