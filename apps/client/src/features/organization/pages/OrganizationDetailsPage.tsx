import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountPage, FieldRow, InfoSidecar, fieldInputClass } from "@/components/account/AccountShell";
import { ACCOUNT_NOTES } from "@/components/account/AccountNotes";
import { OrganizationPanel } from "./OrganizationProfilePage";
import { usePrimaryOrganizationId } from "@/hooks/useCurrentUser";
import { useOrganization, useUpdateOrganization } from "@/hooks/useOrganization";
import type { Organization, OrganizationUpdate } from "@/lib/organizationApi";

/**
 * The church's own details, then the network it sits in.
 *
 * Lives under features/organization rather than with the other account spokes
 * because it is an organization screen that the account hub happens to link
 * to. Putting it beside the profile pages would have meant importing
 * OrganizationPanel across a feature boundary, which the folder guide forbids
 * — and the rule is right here: this page and that panel change together.
 *
 * The design stops at Website, but the hub card promises "branches" and the
 * branch list already exists, so it is appended rather than left elsewhere. A
 * person who came here to add a campus should not have to be told where
 * campuses live.
 */

interface FieldSpec {
  key: Extract<keyof OrganizationUpdate, string>;
  label: string;
  type?: string;
}

/** Every field the organization endpoint accepts, in the order drawn. */
const FIELDS: FieldSpec[] = [
  { key: "name", label: "Church/Organization Name" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State/Province" },
  { key: "country", label: "Country" },
  { key: "phone", label: "Church Phone", type: "tel" },
  { key: "denomination", label: "Denomination" },
  { key: "size", label: "Congregation Size", type: "number" },
  { key: "website", label: "Website", type: "url" },
];

export const OrganizationDetailsPage: React.FC = () => {
  const organizationId = usePrimaryOrganizationId();
  const { organization, isLoading } = useOrganization(organizationId);
  const save = useUpdateOrganization(organizationId);

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  /** Size is the one number here; everything else goes up as typed. */
  const asPayload = (field: FieldSpec, value: string): OrganizationUpdate =>
    field.key === "size" ? { size: Number(value) || 0 } : { [field.key]: value };

  return (
    <AccountPage
      title="Church/Organization Details"
      subtitle="Update your organization name, size, branches and other details."
      sidecar={<InfoSidecar notes={ACCOUNT_NOTES} />}
    >
      {isLoading ? (
        <div className="space-y-5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-white/5" />
          ))}
        </div>
      ) : !organizationId ? (
        <p className="rounded-xl border border-profile-border bg-profile-card p-6 text-sm text-profile-text">
          You are not part of a church yet. One is created when you finish setting up, or when you
          accept an invitation to join a network.
        </p>
      ) : (
        <>
          {FIELDS.map((field, index) => {
            const raw = organization?.[field.key as keyof Organization];
            // 0 is a real congregation size, so it must not read as empty.
            const value = raw === 0 || raw ? String(raw) : "";
            return (
              <FieldRow
                key={field.key}
                label={field.label}
                value={value}
                editing={editing === field.key}
                onEdit={() => {
                  setEditing(field.key);
                  setDraft(value);
                }}
                onCancel={() => setEditing(null)}
                onSave={() =>
                  save.mutate(asPayload(field, draft.trim()), {
                    onSuccess: () => setEditing(null),
                  })
                }
                saving={save.isPending}
                last={index === FIELDS.length - 1}
              >
                <Input
                  type={field.type ?? "text"}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className={fieldInputClass}
                  autoFocus
                />
              </FieldRow>
            );
          })}

          <section className="mt-12 border-t border-profile-border pt-10">
            <h2 className="text-lg font-semibold text-white">Branches and capacity</h2>
            <p className="mt-2 text-sm text-profile-text">
              The churches on your account, and what your plan has room for.
            </p>
            <div className="mt-6">
              <OrganizationPanel embedded />
            </div>
          </section>
        </>
      )}
    </AccountPage>
  );
};

export default OrganizationDetailsPage;
