import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AccountPage, FieldRow, InfoSidecar, fieldInputClass } from "@/components/account/AccountShell";
import { ACCOUNT_NOTES } from "@/components/account/AccountNotes";
import { SecurityPreferences } from "./components/SecurityPreferences";
import { useCurrentUser, useUpdatePassword } from "@/hooks/useCurrentUser";

/**
 * Sign-in credentials and the controls that protect them.
 *
 * Security settings live here rather than under Preferences, where the design
 * also draws them. Two screens writing the same fields is how they drift, and
 * a password and the switch that adds a second factor belong beside each
 * other — nobody hunting for 2FA looks under "language, currency, time zone".
 */

interface PasswordDraft {
  current: string;
  next: string;
  confirm: string;
}

const EMPTY_DRAFT: PasswordDraft = { current: "", next: "", confirm: "" };

export const LoginSecurityPage: React.FC = () => {
  const { toast } = useToast();
  const { user, isLoading } = useCurrentUser();

  const [changing, setChanging] = useState(false);
  const [draft, setDraft] = useState<PasswordDraft>(EMPTY_DRAFT);

  const close = () => {
    setChanging(false);
    setDraft(EMPTY_DRAFT);
  };

  const changePassword = useUpdatePassword(close);

  /**
   * The three obvious mistakes, caught before a round trip. The server
   * re-checks the current password regardless; this is courtesy, not security.
   */
  const submit = () => {
    if (!draft.current) {
      return toast({
        title: "Current password required",
        description: "Enter your current password to set a new one.",
        variant: "destructive",
      });
    }
    if (draft.next.length < 8) {
      return toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
    }
    if (draft.next !== draft.confirm) {
      return toast({
        title: "Passwords do not match",
        description: "The new password and confirmation are different.",
        variant: "destructive",
      });
    }
    changePassword.mutate({ currentPassword: draft.current, newPassword: draft.next });
  };

  return (
    <AccountPage
      title="Login & Security"
      subtitle="Update your password and secure your account"
      sidecar={<InfoSidecar notes={ACCOUNT_NOTES} />}
    >
      {isLoading ? (
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-white/5" />
          ))}
        </div>
      ) : (
        <>
          {/* The sign-in identifier. Locked: changing it is an email change. */}
          <FieldRow label="Username" value={user?.username || user?.email} locked />

          <FieldRow
            label="Current password"
            value="•••••••••"
            editing={changing}
            onCancel={close}
            onSave={submit}
            saving={changePassword.isPending}
            action={
              <button
                type="button"
                onClick={() => setChanging(true)}
                className="text-sm font-medium text-white underline underline-offset-4 transition-colors hover:text-profile-primary"
              >
                Change password
              </button>
            }
            last
          >
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Current password"
              value={draft.current}
              onChange={(e) => setDraft({ ...draft, current: e.target.value })}
              className={fieldInputClass}
              autoFocus
            />
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="New password (at least 8 characters)"
              value={draft.next}
              onChange={(e) => setDraft({ ...draft, next: e.target.value })}
              className={fieldInputClass}
            />
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={draft.confirm}
              onChange={(e) => setDraft({ ...draft, confirm: e.target.value })}
              className={fieldInputClass}
            />
          </FieldRow>

          <SecurityPreferences />
        </>
      )}
    </AccountPage>
  );
};

export default LoginSecurityPage;
