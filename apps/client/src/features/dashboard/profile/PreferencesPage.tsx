import React from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomToggle } from "@/components/ui/custom-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccountPage, SettingRow } from "@/components/account/AccountShell";
import { usePreferences } from "@/hooks/useCurrentUser";
import { SESSION_TIMEOUT_OPTIONS } from "@/lib/userApi";

/**
 * How we contact this person, and when their session gives up.
 *
 * The design puts a Security tab beside these. It is not here: the password
 * and two-factor controls live on Login & Security, and two screens writing
 * the same fields is how they drift. A single-tab tab strip is also just
 * clutter, so it is gone too.
 *
 * Session timeout sits here rather than there because it is a comfort setting,
 * not a protection — it is an idle timer in the client, and the token it
 * eventually discards lasts a week regardless.
 */

const TIMEOUT_LABELS: Record<number, string> = {
  15: "15 minutes",
  30: "30 minutes",
  60: "1 hour",
  120: "2 hours",
  480: "8 hours",
};

export const PreferencesPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<"notifications" | "settings">("notifications");
  const {
    isLoading, notifications, marketing, sessionTimeoutMinutes, canUseSms, saving,
    setNotification, setMarketing, setSessionTimeout,
  } = usePreferences();

  if (isLoading) {
    return (
      <AccountPage
        title="Preferences"
        subtitle="Choose how we reach you, and how long a quiet session stays open."
      >
        <div className="space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-white/5" />
          ))}
        </div>
      </AccountPage>
    );
  }

  return (
    <AccountPage
      title="Preferences"
      subtitle="Choose how we reach you, and how long a quiet session stays open."
    >
      {/* Tab bar matching preferences-notificatioon-tab.svg & preferences-settings-tab.svg */}
      <div className="relative border-b border-profile-border">
        <div className="flex gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`relative pb-4 text-base font-medium transition-colors ${
              activeTab === "notifications" ? "text-white" : "text-profile-muted hover:text-white"
            }`}
          >
            Notification Preferences
            {activeTab === "notifications" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[3px] rounded-full bg-profile-primary" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`relative pb-4 text-base font-medium transition-colors ${
              activeTab === "settings" ? "text-white" : "text-profile-muted hover:text-white"
            }`}
          >
            Settings
            {activeTab === "settings" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[3px] rounded-full bg-profile-primary" />
            )}
          </button>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === "notifications" ? (
          <section>
            <div>
              <SettingRow
                label="Email Notification"
                description="Receive important updates via email"
                control={
                  <CustomToggle
                    checked={notifications.email}
                    disabled={saving}
                    onCheckedChange={(value) => setNotification("email", value)}
                  />
                }
              />

              <SettingRow
                label="SMS Notifications"
                description={
                  canUseSms
                    ? "Receive urgent alerts via SMS"
                    : "Add a phone number to your profile to receive SMS alerts"
                }
                control={
                  canUseSms ? (
                    <CustomToggle
                      checked={notifications.sms}
                      disabled={saving}
                      onCheckedChange={(value) => setNotification("sms", value)}
                    />
                  ) : (
                    <Link
                      href="/dashboard-profile/personal"
                      className="text-sm font-medium text-white underline underline-offset-4 transition-colors hover:text-profile-primary"
                    >
                      Add number
                    </Link>
                  )
                }
              />

              <SettingRow
                label="Marketing Emails"
                description="Receive product updates and tips"
                control={
                  <CustomToggle
                    checked={marketing}
                    disabled={saving}
                    onCheckedChange={setMarketing}
                  />
                }
              />

              <SettingRow
                label="Trial Notifications"
                description="Receive trial and subscription reminders"
                control={
                  <CustomToggle
                    checked={notifications.trial}
                    disabled={saving}
                    onCheckedChange={(value) => setNotification("trial", value)}
                  />
                }
              />

              <SettingRow
                label="Login Notifications"
                description="Get notified when someone signs into your account"
                control={
                  <CustomToggle
                    checked={notifications.login}
                    disabled={saving}
                    onCheckedChange={(value) => setNotification("login", value)}
                  />
                }
                last
              />
            </div>
          </section>
        ) : (
          <section>
            <div>
              <SettingRow
                label="Session Timeout"
                description="Sign out automatically after this long without activity"
                control={
                  <Select
                    value={String(sessionTimeoutMinutes)}
                    onValueChange={(value) => setSessionTimeout(Number(value))}
                    disabled={saving}
                  >
                    <SelectTrigger className="w-36 border-profile-border bg-profile-field text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-profile-border bg-profile-card text-white">
                      {SESSION_TIMEOUT_OPTIONS.map((minutes) => (
                        <SelectItem key={minutes} value={String(minutes)}>
                          {TIMEOUT_LABELS[minutes] ?? `${minutes} minutes`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
                last
              />
            </div>

            <p className="mt-4 text-xs leading-relaxed text-profile-muted">
              Saved, and applied the next time you sign in. Live services are never interrupted by
              this — a session running a presentation stays open.
            </p>
          </section>
        )}
      </div>

      <p className="mt-10 text-sm text-profile-muted">
        Looking for your password or two-factor settings? They are under{" "}
        <Link
          href="/dashboard-profile/security"
          className="font-medium text-white underline underline-offset-4 transition-colors hover:text-profile-primary"
        >
          Login &amp; Security
        </Link>
        .
      </p>
    </AccountPage>
  );
};

export default PreferencesPage;
