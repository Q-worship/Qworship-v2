import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { AccountMenu } from "@/features/dashboard/components/AccountMenu";
import { useAccountMenu } from "@/features/dashboard/hooks/useAccountMenu";
import qworshipLogo from "@assets/Group 1_1754122708985.png";

/**
 * The persistent bar above the account and workspace pages.
 *
 * Before this, every /dashboard-* route rendered inside AppLayout, which is a
 * bare flex container: the pages had no header, no avatar menu and no way back
 * except the browser's own button. The dashboard's chrome lives in AppHeader,
 * mounted only on /dashboard and taking forty props of presentation state —
 * build mode, slides, go-live, project renaming — so it cannot simply be
 * hoisted up here.
 *
 * What is genuinely persistent is the logo, the way home and the account menu.
 * That is this bar. The presentation toolbar stays with /dashboard, where its
 * buttons have something to act on, and the avatar menu is the shared
 * AccountMenu, so the two chromes cannot drift apart.
 */
export const AppShellBar: React.FC = () => {
  const [, setLocation] = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menu = useAccountMenu();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#484848]/40 border-profile-border/40 bg-[#2A203C] bg-profile-header px-6">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-2 rounded-lg py-1 text-white transition-opacity hover:opacity-90"
          title="Back to dashboard"
        >
          <img src={qworshipLogo} alt="Qworship" className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-wide">Q-worship</span>
        </button>
        {/* Back link as shown in screenshots */}
        <button
          type="button"
          onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-1.5 py-1 text-sm text-[#CBCED5] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Back to dashboard</span>
        </button>
      </div>

      <AccountMenu
        {...menu}
        isProfileMenuOpen={isProfileMenuOpen}
        setIsProfileMenuOpen={setIsProfileMenuOpen}
      />
    </header>
  );
};

/**
 * Wraps a page in the shell bar.
 *
 * A flex column rather than a fixed bar plus padding, so a page below it gets a
 * real box to fill and nothing overflows by the bar's height.
 */
export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-full flex-col">
    <AppShellBar />
    <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
  </div>
);
