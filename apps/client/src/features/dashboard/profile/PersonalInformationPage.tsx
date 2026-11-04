import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountPage, FieldRow, InfoSidecar, fieldInputClass } from "@/components/account/AccountShell";
import { ACCOUNT_NOTES } from "@/components/account/AccountNotes";
import { ProfilePhotoField } from "./components/ProfilePhotoField";
import { useCurrentUser, useUpdateProfile, useUploadProfilePhoto } from "@/hooks/useCurrentUser";
import { maskEmail, profilePhotoSrc, type ProfileUpdate } from "@/lib/userApi";

/**
 * Name, contact details and photo.
 *
 * Email and role are shown but locked. Both are refused by the server anyway —
 * `updateProfile` allows only firstName, lastName, profilePicture, phoneNumber,
 * bio and username — so an editable control here would have been a field that
 * silently discarded what you typed. Changing an email needs re-verification,
 * which is a flow, not a text box; `role` is the authorization enum and is not
 * a person's job title.
 */

/** Rows that save. Keyed by the server's own field names, so nothing maps. */
type EditableField = Extract<keyof ProfileUpdate, "firstName" | "lastName" | "phoneNumber" | "bio">;

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  superadmin: "Administrator",
  pastor: "Pastor",
  worship_leader: "Worship Leader",
  member: "Member",
  user: "Member",
};

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
    onSave: () =>
      saveProfile.mutate({ [field]: draft.trim() }, { onSuccess: () => setEditing(null) }),
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

          {/* Masked but present: people need to recognise which account this is. */}
          <FieldRow label="Email address" value={maskEmail(user?.email)} locked />

          <FieldRow
            label="Phone number"
            value={user?.phoneNumber}
            empty="Add a phone number to your Q-worship"
            {...row("phoneNumber", user?.phoneNumber)}
          >
            {editor({ type: "tel", placeholder: "+44 7700 900000" })}
          </FieldRow>

          <FieldRow label="Role" value={ROLE_LABELS[user?.role ?? ""] ?? user?.role} locked />

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
        </>
      )}
    </AccountPage>
  );
};

export default PersonalInformationPage;
