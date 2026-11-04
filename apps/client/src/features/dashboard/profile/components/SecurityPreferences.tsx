import React from "react";
import { Link } from "wouter";
import { SettingRow } from "@/components/account/AccountShell";
import { CustomToggle } from "@/components/ui/custom-toggle";

/**
 * The one security control that genuinely does not exist yet.
 *
 * The design draws three here — two-factor, session timeout and login
 * notifications. The latter two are now real settings that persist, and they
 * live on Preferences. Drawing them here as well meant this screen showed a
 * hardcoded "30 minutes" that would keep saying 30 after someone set two
 * hours next door, which is worse than not showing it at all.
 *
 * Two-factor stays, disabled, because the shape of the screen is agreed and
 * the gap is worth being honest about. It is a feature rather than a flag:
 * enrollment, backup codes, a verify step in sign-in, and a recovery path for
 * a lost device. A toggle that moved would forget on reload and quietly
 * promise protection nobody has.
 */
export const SecurityPreferences: React.FC = () => (
  <section className="mt-10">
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="text-lg font-semibold text-white">Security Preferences</h2>
      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
        Not yet active
      </span>
    </div>
    <p className="mt-2 text-sm text-gray-500">
      Two-factor authentication is part of the agreed design and is not connected yet. It is not
      protecting your account today.
    </p>

    <div className="mt-4">
      <SettingRow
        label="Two-Factor Authentication"
        description="Add an extra layer of security to your account"
        control={<CustomToggle checked={false} disabled onCheckedChange={() => {}} />}
        last
      />
    </div>

    <p className="mt-6 text-sm text-gray-500">
      Session timeout and login notifications are under{" "}
      <Link
        href="/dashboard-profile/preferences"
        className="font-medium text-white underline underline-offset-4 transition-colors hover:text-[#a98bff]"
      >
        Preferences
      </Link>
      .
    </p>
  </section>
);
