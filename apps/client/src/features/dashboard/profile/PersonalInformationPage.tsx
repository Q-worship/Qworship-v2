import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHURCH_ROLES, churchRoleLabel } from "@qworship/shared";
import { AccountPage, FieldRow, InfoSidecar, fieldInputClass } from "@/components/account/AccountShell";
import { ACCOUNT_NOTES } from "@/components/account/AccountNotes";
import { ProfilePhotoField } from "./components/ProfilePhotoField";
import { useCurrentUser, useUpdateProfile, useUploadProfilePhoto } from "@/hooks/useCurrentUser";
import { maskEmail, profilePhotoSrc, type ProfileUpdate } from "@/lib/userApi";
import type { ChurchRole } from "@qworship/shared";

/**
 * Name, contact details and photo.
 *
 * Email is shown but locked: changing it needs re-verification, which is a
 * flow, not a text box.
 *
 * "Role" is the person's job title at the church (`churchRole`, picked from
 * `CHURCH_ROLES`), NOT `user.role`. The latter is the authorization enum and
 * the server refuses it from this form, so a dropdown writing to it would
 * have been a field that silently discarded what you chose.
 */

/** Rows that save. Keyed by the server's own field names, so nothing maps. */
type EditableField = Extract<
  keyof ProfileUpdate,
  "firstName" | "lastName" | "phoneNumber" | "bio" | "churchRole"
>;

export const PersonalInformationPage: React.FC = () => {
  const { user, isLoading } = useCurrentUser();
  const saveProfile = useUpdateProfile();
  const uploadPhoto = useUploadProfilePhoto({
    firstName: user?.firstName,
    lastName: user?.lastName,
  });

  // One row opens at a time, so the draft belongs to whichever that is.
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [draft, setDraft] = useState("");

  const row = (field: EditableField, current?: string) => ({
    editing: editing === field,
    onEdit: () => {
      setEditing(field);
      setDraft(current ?? "");
    },
    onCancel: () => setEditing(null),
    onSave: () => {
      // The role dropdown has no "none" option, so an untouched draft is a
      // cancel, not a request the server would refuse.
      if (field === "churchRole" && !draft) return setEditing(null);
      saveProfile.mutate({ [field]: draft.trim() }, { onSuccess: () => setEditing(null) });
    },
    saving: saveProfile.isPending,
  });

  const editor = (props: { type?: string; placeholder?: string } = {}) => (
    <Input
      type={props.type ?? "text"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      placeholder={props.placeholder}
      className={fieldInputClass}
      autoFocus
    />
  );

  return (
    <AccountPage
      title="Personal Information"
      breadcrumb="Personal info"
      subtitle="Provide personal details and how we can reach you"
      sidecar={<InfoSidecar notes={ACCOUNT_NOTES} />}
    >
      {isLoading ? (
        <div className="space-y-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-white/5" />
          ))}
        </div>
      ) : (
        <>
          <FieldRow label="First name" value={user?.firstName} {...row("firstName", user?.firstName)}>
            {editor()}
          </FieldRow>

          <FieldRow label="Last name" value={user?.lastName} {...row("lastName", user?.lastName)}>
            {editor()}
          </FieldRow>

          {/* Masked display with Edit link matching screenshot 2 */}
          <FieldRow
            label="Email address"
            value={maskEmail(user?.email)}
            action={
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-[15px] font-medium leading-[22px] text-white underline underline-offset-4 transition-colors hover:text-profile-primary"
              >
                Edit
              </button>
            }
          />

          <FieldRow
            label="Phone number"
            value={user?.phoneNumber}
            empty="Add a phone number to your Q-worship"
            {...row("phoneNumber", user?.phoneNumber)}
          >
            {editor({ type: "tel", placeholder: "+44 7700 900000" })}
          </FieldRow>

          <FieldRow
            label="Role"
            value={churchRoleLabel(user?.churchRole)}
            empty="Add your role at the church"
            {...row("churchRole", user?.churchRole)}
          >
            <Select value={draft} onValueChange={(v) => setDraft(v as ChurchRole)}>
              <SelectTrigger className={fieldInputClass} autoFocus>
                <SelectValue placeholder="Choose a role" />
              </SelectTrigger>
              <SelectContent className="border-[#484848] bg-[#2A203C] text-white">
                {CHURCH_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="focus:bg-[#8356F3]/30 focus:text-white">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Bio" value={user?.bio} {...row("bio", user?.bio)}>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder="Tell us about yourself…"
              className={fieldInputClass}
              autoFocus
            />
          </FieldRow>

          <ProfilePhotoField
            src={profilePhotoSrc(user?.profilePicture)}
            initial={user?.firstName?.[0] ?? "U"}
            busy={uploadPhoto.isPending}
            onSelect={(file) => uploadPhoto.mutate(file)}
          />

          {/* Update button matching screenshot 2 */}
          <div className="mt-8">
            <button
              type="button"
              className="rounded-lg bg-profile-primary px-8 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#7245e2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-profile-primary"
            >
              Update
            </button>
          </div>
        </>
      )}
    </AccountPage>
  );
};

export default PersonalInformationPage;
