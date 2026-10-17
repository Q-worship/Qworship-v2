import { apiRequest } from "@/lib/queryClient";
import type { Manuscript, ManuscriptProvider, ManuscriptStyle, ManuscriptTemplate, SermonDetail, SermonSummary } from "./types";
import { withTemplateDefaults } from "./manuscriptTemplate";

export const sermonKeys = {
  all: ["sermons"] as const,
  detail: (id: string) => ["sermons", id] as const,
  template: ["sermon-template"] as const,
};

export async function listSermons(): Promise<SermonSummary[]> {
  const res = await apiRequest("GET", "/api/sermons");
  return (await res.json()).sermons;
}

export async function getSermon(id: string): Promise<SermonDetail> {
  const res = await apiRequest("GET", `/api/sermons/${id}`);
  const { sermon } = await res.json();
  return { ...sermon, id: sermon._id };
}

export async function createSermon(input: { transcript: string; title?: string; preacher?: string; serviceDate?: string }) {
  const res = await apiRequest("POST", "/api/sermons", input);
  return (await res.json()) as { id: string };
}

export const updateSermon = (id: string, patch: { title?: string; preacher?: string; serviceDate?: string }) =>
  apiRequest("PATCH", `/api/sermons/${id}`, patch);

export const deleteSermon = (id: string) => apiRequest("DELETE", `/api/sermons/${id}`);

export const generateManuscript = (id: string, provider: ManuscriptProvider, style: ManuscriptStyle) =>
  apiRequest("POST", `/api/sermons/${id}/generate`, { provider, style });

export const saveManuscript = (id: string, manuscript: Manuscript, approve?: boolean) =>
  apiRequest("PUT", `/api/sermons/${id}/manuscript`, { manuscript, approve });

export const selectDraft = (id: string, draftId: string) =>
  apiRequest("POST", `/api/sermons/${id}/drafts/${draftId}/use`);

export async function getManuscriptTemplate(): Promise<ManuscriptTemplate> {
  const res = await apiRequest("GET", "/api/sermons/template");
  return withTemplateDefaults((await res.json()).template);
}

export const saveManuscriptTemplate = (template: ManuscriptTemplate) =>
  apiRequest("PUT", "/api/sermons/template", { template });

/** apiRequest throws "409: {json}" — pull the server's message out for toasts. */
export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const json = raw.slice(raw.indexOf(":") + 1).trim();
  try {
    return JSON.parse(json).error ?? raw;
  } catch {
    return raw;
  }
}
