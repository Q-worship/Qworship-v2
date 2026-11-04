import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CURRENT_USER_KEY } from "@/lib/userApi";
import {
  fetchOrganization,
  organizationKey,
  updateOrganization,
  type OrganizationUpdate,
} from "@/lib/organizationApi";

/**
 * React Query bindings for one church's own record.
 *
 * Renaming a church changes the name the session endpoint reports too, so a
 * save invalidates both. Leaving that to each caller is how a sidebar ends up
 * showing the old name until a reload.
 */

export function useOrganization(id?: string) {
  const query = useQuery({
    queryKey: organizationKey(id),
    // A person can legitimately have no church yet — one is created during
    // onboarding — so this waits rather than failing.
    enabled: Boolean(id),
    queryFn: () => fetchOrganization(id as string),
  });
  return { ...query, organization: query.data?.organization };
}

export function useUpdateOrganization(id?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (update: OrganizationUpdate) => {
      if (!id) throw new Error("No church to update");
      return updateOrganization(id, update);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKey(id) });
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_KEY });
      toast({ title: "Saved", description: "Your organization details have been updated." });
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
