import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  CURRENT_USER_KEY,
  fetchCurrentUser,
  updatePassword,
  updateProfile,
  uploadProfilePhoto,
  DEFAULT_NOTIFICATION_PREFERENCES,
  type CurrentUser,
  type NotificationPreferences,
  type ProfileUpdate,
} from "@/lib/userApi";

/**
 * React Query bindings for the signed-in person.
 *
 * Screens call these and nothing else. Keeping the query keys, the cache
 * invalidation and the toast copy here means a component never decides when
 * the cache is stale, and two screens editing the same person cannot disagree
 * about what to invalidate — which is exactly how a saved value appears to
 * revert on the next render.
 */

export function useCurrentUser() {
  const query = useQuery({ queryKey: CURRENT_USER_KEY, queryFn: fetchCurrentUser });
  return {
    ...query,
    user: query.data?.user,
    organizations: query.data?.organizations ?? [],
  };
}

/** The church this person acts for. First membership until they can switch. */
export function usePrimaryOrganizationId(): string | undefined {
  const { organizations } = useCurrentUser();
  return organizations[0]?.id;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (update: ProfileUpdate) => updateProfile(update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_KEY });
      toast({ title: "Saved", description: "Your details have been updated." });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUploadProfilePhoto(owner: Pick<CurrentUser, "firstName" | "lastName">) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (file: File) => uploadProfilePhoto(file, owner),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_KEY });
      toast({ title: "Photo updated", description: "Your profile photo has been changed." });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Changing a password invalidates nothing: no cached value describes it, and
 * the session survives the change.
 */
export function useUpdatePassword(onDone?: () => void) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (values: { currentPassword: string; newPassword: string }) =>
      updatePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      onDone?.();
      toast({ title: "Password updated", description: "Your password has been changed." });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not change password",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Preferences, resolved and saved.
 *
 * Toggles commit immediately rather than collecting behind a Save button: the
 * design draws one, but a switch that has already moved and then needs
 * confirming is the classic way people end up believing they opted out when
 * they did not.
 *
 * Marketing reads from `agreeToMarketing`, not from notificationPreferences —
 * one consent flag, so an opt-out cannot be contradicted by a second one.
 */
export function usePreferences() {
  const { user, isLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const save = useMutation({
    mutationFn: (update: ProfileUpdate) => updateProfile(update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_KEY });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    isLoading,
    notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(user?.notificationPreferences ?? {}) },
    marketing: user?.agreeToMarketing ?? false,
    sessionTimeoutMinutes: user?.sessionTimeoutMinutes ?? 30,
    /** A phone number is required before SMS can be turned on. */
    canUseSms: Boolean(user?.phoneNumber),
    saving: save.isPending,
    setNotification: (key: keyof NotificationPreferences, value: boolean) =>
      save.mutate({ notificationPreferences: { [key]: value } }),
    setMarketing: (value: boolean) => save.mutate({ agreeToMarketing: value }),
    setSessionTimeout: (minutes: number) => save.mutate({ sessionTimeoutMinutes: minutes }),
  };
}
