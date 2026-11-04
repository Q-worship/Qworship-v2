import { get, put } from "@/lib/apiResult";

/**
 * A single church's own record: name, address, denomination, size.
 *
 * Distinct from accountApi, which covers the NETWORK — branches, slots, plan.
 * One church editing its postcode and a head office buying a branch slot are
 * different jobs on different endpoints, and keeping them apart is what lets
 * the organization screens be read without knowing about billing.
 */

export interface Organization {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  website?: string;
  denomination?: string;
  size?: number;
}

/** Everything a church may change about itself. */
export type OrganizationUpdate = Partial<Omit<Organization, "id">>;

export const organizationKey = (id?: string) => ["/api/organization", id] as const;

export function fetchOrganization(id: string): Promise<{ organization: Organization }> {
  return get<{ organization: Organization }>(`/api/organization/${id}`);
}

export function updateOrganization(
  id: string,
  update: OrganizationUpdate,
): Promise<{ organization: Organization }> {
  return put<{ organization: Organization }>(`/api/organization/${id}`, update);
}
