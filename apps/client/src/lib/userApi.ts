import { buildUrl } from "@/lib/queryClient";
import { get, put, readableError } from "@/lib/apiResult";

/**
 * The signed-in person: their profile, their photo, their password.
 *
 * Separate from accountApi, which is about what a church BOUGHT. These two get
 * confused constantly because both hang off the same session, but a phone
 * number and a slot count change for different reasons and are written by
 * different endpoints.
 */

export interface CurrentUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  bio?: string;
  profilePicture?: string;
  /** The authorization role, not a job title. Displayed, never edited here. */
  role: string;
  accountType?: string;
  planType?: string;
  emailVerified?: boolean;
  /** How this person wants to be contacted. Marketing is `agreeToMarketing`. */
  notificationPreferences?: NotificationPreferences;
  /** Idle minutes before the client signs them out. Not a token lifetime. */
  sessionTimeoutMinutes?: number;
  /** Marketing consent, set at signup. The single source for opt-in. */
  agreeToMarketing?: boolean;
  createdAt?: string;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  trial: boolean;
  login: boolean;
  /** Warn when many branches stream at once on a Sunday. */
  streamPeak: boolean;
  /** Prompt to top up the moment a church runs out mid-service. */
  autoRefill: boolean;
}

/** The churches this person belongs to, as the session endpoint lists them. */
export interface UserOrganizationRef {
  id: string;
  name: string;
}

export interface CurrentUserResponse {
  user: CurrentUser;
  organizations: UserOrganizationRef[];
}

/**
 * Fields the server will actually persist.
 *
 * Mirrors the allowlist in `updateProfile` on the server. Email and role are
 * absent from both: changing an email needs re-verification, and `role` is an
 * authorization field. Typing it this way means a screen cannot offer to edit
 * something that would be silently dropped.
 */
export interface ProfileUpdate {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  bio?: string;
  username?: string;
  profilePicture?: string;
  /** Partial: the server merges key by key rather than replacing the object. */
  notificationPreferences?: Partial<NotificationPreferences>;
  sessionTimeoutMinutes?: number;
  agreeToMarketing?: boolean;
}

/** Defaults mirroring the schema, so a screen never renders `undefined`. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email: true,
  sms: false,
  trial: true,
  login: true,
  streamPeak: true,
  autoRefill: false,
};

/** Idle-timeout choices offered in Preferences. */
export const SESSION_TIMEOUT_OPTIONS = [15, 30, 60, 120, 480] as const;

export const CURRENT_USER_KEY = ["/api/user/current"] as const;

export function fetchCurrentUser(): Promise<CurrentUserResponse> {
  return get<CurrentUserResponse>("/api/user/current");
}

export function updateProfile(update: ProfileUpdate): Promise<{ user: CurrentUser }> {
  return put<{ user: CurrentUser }>("/api/user/profile", update);
}

export function updatePassword(currentPassword: string, newPassword: string): Promise<unknown> {
  return put("/api/user/update-password", { currentPassword, newPassword });
}

/**
 * Uploads an image, then points the profile at it.
 *
 * Two calls because the media service owns storage and the user record owns
 * the reference; there is no endpoint that does both. Raw fetch rather than
 * apiRequest because this sends FormData — apiRequest sets a JSON content
 * type, which would make the multipart boundary unparseable.
 */
export async function uploadProfilePhoto(
  file: File,
  owner: { firstName?: string; lastName?: string },
): Promise<{ user: CurrentUser }> {
  const formData = new FormData();
  formData.append("files", file);
  formData.append(
    "metadata_0",
    JSON.stringify({
      title: `Profile Picture - ${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim(),
      tags: ["profile-picture"],
      categories: ["Images"],
      description: "User profile picture",
    }),
  );

  let response: Response;
  try {
    response = await fetch(buildUrl("/api/user-media-assets/upload"), {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: formData,
    });
  } catch (error) {
    throw readableError(error);
  }
  if (!response.ok) throw new Error("The photo could not be uploaded");

  const uploaded = await response.json().catch(() => null);
  const asset = uploaded?.assets?.[0];
  if (!asset) throw new Error("The photo could not be uploaded");

  // Store a path, not a bare id. Older rows hold bare ids and `profilePhotoSrc`
  // below still has to read those, but nothing new should add to the pile.
  return updateProfile({ profilePicture: `/api/user-media-assets/${asset._id ?? asset.id}/file` });
}

/**
 * Resolves whatever shape this column happens to hold.
 *
 * Three have been stored over time — a full URL, an API path, and a bare asset
 * id from before paths were used — and all three are still in the database.
 */
export function profilePhotoSrc(picture?: string | null): string | undefined {
  if (!picture) return undefined;
  if (picture.startsWith("http")) return picture;
  if (picture.startsWith("/api") || picture.startsWith("/uploads")) return buildUrl(picture);
  return buildUrl(`/api/user-media-assets/${picture}/file`);
}

/**
 * Hides the middle of an address, matching how it reads elsewhere.
 *
 * Partially shown rather than hidden because people need to recognise WHICH
 * account they are looking at, and a fully masked address tells them nothing.
 */
export function maskEmail(email?: string | null): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0] ?? ""}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}
