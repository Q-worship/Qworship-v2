import { apiRequest } from "@/lib/queryClient";

/**
 * The one place a server response becomes data or an Error.
 *
 * Every API module in lib/ goes through `request`, so no component ever holds
 * a Response, parses a body, or decides what "failed" means. That is the whole
 * point of the split: a screen asks for a thing and gets the thing.
 */

/**
 * Reads the server's message rather than inventing one, so a refusal explains
 * itself — a blocked downgrade says how many churches to release.
 *
 * apiRequest throws on a non-2xx before returning, and its message is the raw
 * body prefixed with the status ("409: {\"success\":false,...}"). Left alone
 * that JSON lands in a toast, so it is unpacked back into the sentence the
 * server actually wrote.
 */
export function readableError(error: unknown): Error {
  const raw = error instanceof Error ? error.message : String(error);
  const match = /^\d{3}:\s*(\{[\s\S]*\})$/.exec(raw.trim());
  if (match) {
    try {
      const body = JSON.parse(match[1]);
      if (typeof body?.message === "string") return new Error(body.message);
    } catch {
      // Not JSON after all; fall through to the raw text.
    }
  }
  return new Error(raw);
}

/** Runs a request, unwraps the body, and turns `success: false` into a throw. */
export async function request<T>(fn: () => Promise<Response>): Promise<T> {
  let res: Response;
  try {
    res = await fn();
  } catch (error) {
    throw readableError(error);
  }
  const body = await res.json().catch(() => null);
  if (body?.success === false) throw new Error(body.message || "Request failed");
  return body as T;
}

/** Shorthands, so modules below read as verbs rather than plumbing. */
export const get = <T>(path: string) => request<T>(() => apiRequest("GET", path));
export const put = <T>(path: string, body?: unknown) =>
  request<T>(() => apiRequest("PUT", path, body));
export const post = <T>(path: string, body?: unknown) =>
  request<T>(() => apiRequest("POST", path, body));
export const del = <T>(path: string) => request<T>(() => apiRequest("DELETE", path));
