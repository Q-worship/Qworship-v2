/**
 * Origins allowed to reach this server, shared by the HTTP CORS policy and the
 * hands-free Bible audio socket. It lives here rather than in index.ts so the
 * socket can read it without importing the module that mounts it.
 *
 * Resolved on each call rather than at module load: dotenv.config() runs in the
 * body of index.ts, which is after every import of this module has evaluated,
 * so a module-level constant would never see FRONTEND_URL.
 */
export function getAllowedOrigins(): string[] {
  return [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://app.qworship.com",
    "https://www.app.qworship.com",
    "https://qworship.com",
    "https://www.qworship.com",
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];
}
