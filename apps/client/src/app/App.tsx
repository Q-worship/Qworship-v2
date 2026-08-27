import React, { lazy, Suspense } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useBibleSync } from "@/hooks/useBibleSync";
import { useSongSync } from "@/hooks/useSongSync";
import { useBibleRAMCache } from "@/features/dashboard/hooks/useBibleRAMCache";
import { useSongRAMCache } from "@/features/dashboard/hooks/useSongRAMCache";
import { SyncLoadingOverlay } from "@/features/dashboard/components/SyncLoadingOverlay";

import { Home } from "@/features/web/pages/Home";
const About = lazy(() => import("@/features/web/pages/About").then(m => ({ default: m.About })));
const Pricing = lazy(() => import("@/features/web/pages/Pricing").then(m => ({ default: m.Pricing })));
const Features = lazy(() => import("@/features/web/pages/Features").then(m => ({ default: m.Features })));
const FAQs = lazy(() => import("@/features/web/pages/FAQs").then(m => ({ default: m.FAQs })));
const Downloads = lazy(() => import("@/features/web/pages/Downloads").then(m => ({ default: m.Downloads })));
const Resources = lazy(() => import("@/features/web/pages/Resources").then(m => ({ default: m.Resources })));
const JobDetailPage = lazy(() => import("@/features/web/pages/JobDetailPage").then(m => ({ default: m.JobDetailPage })));
const GuideDetailPage = lazy(() => import("@/features/web/pages/GuideDetailPage").then(m => ({ default: m.GuideDetailPage })));
const Guides = lazy(() => import("@/features/web/pages/Guides").then(m => ({ default: m.Guides })));
const ReferAndEarn = lazy(() => import("@/features/web/pages/ReferAndEarn").then(m => ({ default: m.ReferAndEarn })));
import { Login } from "@/features/web/pages/Login";
import { SignUp } from "@/features/web/pages/SignUp";
import { Verify } from "@/features/web/pages/Verify";
import { ForgotPassword } from "@/features/web/pages/ForgotPassword";
import { ResetPassword } from "@/features/web/pages/ResetPassword";
const Onboarding = lazy(() => import("@/features/web/pages/Onboarding").then(m => ({ default: m.Onboarding })));
const TrialExpiredPage = lazy(() => import("@/features/auth/pages/TrialExpiredPage"));
const ProjectSelectionView = lazy(() => import("@/components/onboarding/ProjectSelectionView").then(m => ({ default: m.ProjectSelectionView })));
import { ChatbotWidget } from "@/components/chat/ChatbotWidget";
import { Layout } from "@/components/layout/Layout";
import AdminSignInPage from "@/features/auth/pages/AdminSignInPage";
const AdminForcePasswordChangePage = lazy(() => import("@/features/auth/pages/AdminForcePasswordChangePage"));
import DesktopAuthRemote from "@/features/auth/pages/DesktopAuthRemote";
const LivePresentationV2 = lazy(() => import("@/features/dashboard/live/LivePresentationV2").then(m => ({ default: m.LivePresentationV2 })));
const GuidePage = lazy(() => import("@/features/dashboard/pages/GuidePage").then(m => ({ default: m.GuidePage })));
const QworshipHomeV2Wrapper = lazy(() => import("@/features/dashboard/DashboardLayoutV2").then(m => ({ default: m.QworshipHomeV2Wrapper })));

import { AppLayout } from "./Layout";
import { useAuthStore } from "@/features/auth/auth.store";
import { getCurrentUser, setAuthToken } from "@/lib/authApi";
const BibleWorkspace = lazy(() => import("@/features/bible-reader/components/BibleWorkspace").then(m => ({ default: m.BibleWorkspace })));
const AssetsPage = lazy(() => import("@/features/dashboard/pages/AssetsPage").then(m => ({ default: m.AssetsPage })));
const HelpSupportPage = lazy(() => import("@/features/dashboard/pages/HelpSupportPage"));
const SuperAdminSidebar = lazy(() => import("@/features/super-admin/components/SuperAdminSidebar"));
import { LowerThirdEditorPage, LowerThirdSettingsPage } from "@/features/lowerThird";
import { MainPresentationSettingsPage } from "@/features/mainPresentation";
const LivePresentationSettingsPage = lazy(() => import("@/features/dashboard/live/LivePresentationSettingsPage").then(m => ({ default: m.LivePresentationSettingsPage })));

const DashboardMock = () => (
  <div className="flex flex-col gap-4">
    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
    <p className="text-muted-foreground">
      Select a module from the sidebar to begin.
    </p>
  </div>
);

const SongsMock = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold">Song Library</h1>
  </div>
);
const PresentationsMock = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold">Presentations</h1>
  </div>
);


const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);
  const [isVerifyingSession, setIsVerifyingSession] = React.useState(isAuthenticated);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setIsVerifyingSession(false);
      return;
    }
    getCurrentUser()
      .then((response) => setAuth(response.user))
      .catch(() => {
        setAuthToken(null);
        logout();
      })
      .finally(() => setIsVerifyingSession(false));
  }, []);
  
  // Hydrate the IndexedDB background caches once authenticated
  const { isSyncing: isBibleSyncing } = useBibleSync(isAuthenticated);
  const { isSyncing: isSongSyncing } = useSongSync();

  const isSyncing = isBibleSyncing || isSongSyncing;
  const [showSync, setShowSync] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  React.useEffect(() => {
    // Only start tracking sync state once authentication is verified
    if (!isAuthenticated) return;
    
    if (isSyncing) {
      setShowSync(true);
      setIsSuccess(false);
    } else if (showSync && !isSyncing) {
      // Finished syncing
      setIsSuccess(true);
      const timer = setTimeout(() => {
         setShowSync(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    // Note: We intentionally only want this to run after hydration is started,
    // we don't want it to flash true on initial mount if it's already cached.
    // If both hooks initialize as false, showSync will remain false.
  }, [isSyncing, isAuthenticated]);

  // Instantly dump the IndexedDB offline safehouse into the 0.00ms Memory dictionary
  // ONLY after the initial synchronization completes to prevent thread locking
  React.useEffect(() => {
    if (isAuthenticated && !isSyncing) {
      useBibleRAMCache.getState().loadFromDisk();
      useSongRAMCache.getState().loadFromDisk();
    }
  }, [isAuthenticated, isSyncing]);

  if (isVerifyingSession) return <div className="flex h-screen items-center justify-center bg-[#0d071d]">Checking your session…</div>;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.onboardingStatus !== 'completed') return <Redirect to="/onboarding" />;
  if (user?.trialStatus === 'expired') return <Redirect to="/account" />;
  
  return (
    <>
      {children}
      {showSync && <SyncLoadingOverlay isSyncing={!isSuccess} isSuccess={isSuccess} />}
    </>
  );
};

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  
  if (!isAuthenticated) return <Redirect to="/admin/login" />;
  if (user?.role !== 'admin' && user?.role !== 'superadmin') return <Redirect to="/dashboard" />;
  if (user?.mustChangePassword) return <Redirect to="/admin/force-password-change" />;

  return <>{children}</>;
};

const ProjectGuard = ({ children }: { children: React.ReactNode }) => {
  const selectedProjectId = sessionStorage.getItem('qworship_current_presentation_id');
  return selectedProjectId ? <>{children}</> : <Redirect to="/project-selection" />;
};

// Thin wrapper so we can call useLocation() inside a component (hooks can't
// be called in the outer AppRouter render directly via inline arrow fns).
function LowerThirdSettingsRoute() {
  const [, navigate] = useLocation();
  return <LowerThirdSettingsPage onClose={() => navigate("/dashboard")} />;
}
function MainPresentationSettingsRoute() {
  const [, navigate] = useLocation();
  return <MainPresentationSettingsPage onClose={() => navigate("/dashboard")} />;
}
function LivePresentationSettingsRoute() {
  const [, navigate] = useLocation();
  return <LivePresentationSettingsPage onClose={() => navigate("/dashboard")} />;
}

export const AppRouter = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#0d071d]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>}>
          <Switch>
          {/* New Auth and Onboarding Flow */}
          <Route path="/login" component={Login} />
          <Route path="/signup" component={SignUp} />
          <Route path="/verify" component={Verify} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/account" component={TrialExpiredPage} />
          <Route path="/project-selection">
            <AuthGuard><ProjectSelectionView /></AuthGuard>
          </Route>

          {/* New Marketing Pages in Layout */}
          <Route path="/">{(params) => <Layout><Home /></Layout>}</Route>
          <Route path="/features">{(params) => <Layout><Features /></Layout>}</Route>
          <Route path="/about/careers/:jobId"><Layout><JobDetailPage /></Layout></Route>
          <Route path="/about">{(params) => <Layout><About /></Layout>}</Route>
          <Route path="/pricing">{(params) => <Layout><Pricing /></Layout>}</Route>
          <Route path="/resources">{(params) => <Layout><Resources /></Layout>}</Route>
          <Route path="/refer-and-earn">{(params) => <Layout><ReferAndEarn /></Layout>}</Route>
          <Route path="/guides/:guideId"><Layout><GuideDetailPage /></Layout></Route>
          <Route path="/guides">{(params) => <Layout><Guides /></Layout>}</Route>
          <Route path="/faqs">{(params) => <Layout><FAQs /></Layout>}</Route>
          <Route path="/downloads">{(params) => <Layout><Downloads /></Layout>}</Route>
          <Route path="/desktop-auth" component={DesktopAuthRemote} />
          <Route path="/admin/login" component={AdminSignInPage} />
          <Route path="/admin/force-password-change" component={AdminForcePasswordChangePage} />

          {/* Standalone authenticated routes like Super Admin */}
          <Route path="/super-admin">
            <AdminGuard>
              <SuperAdminSidebar />
            </AdminGuard>
          </Route>

          {/* Live Presentation (Audience View) */}
          <Route path="/live">
            <AuthGuard>
              <LivePresentationV2 />
            </AuthGuard>
          </Route>

          {/* Guide (NDI Bridge configuration, etc.) */}
          <Route path="/dashboard-guide">
            <AuthGuard>
              <GuidePage />
            </AuthGuard>
          </Route>

          <Route>
            <AuthGuard>
              <AppLayout>
                <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#1a0f2e]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>}>
                  <Switch>
                  <Route path="/dashboard"><ProjectGuard><QworshipHomeV2Wrapper /></ProjectGuard></Route>
                  <Route path="/bible" component={BibleWorkspace} />
                  <Route path="/songs" component={SongsMock} />
                  <Route path="/presentations" component={PresentationsMock} />
                  <Route path="/dashboard-assets"><AssetsPage /></Route>
                  <Route path="/dashboard-help" component={HelpSupportPage} />
                  <Route path="/lower-third-settings" component={LowerThirdSettingsRoute} />
                  <Route path="/lower-third-editor/:templateId" component={LowerThirdEditorPage} />
                  <Route path="/main-presentation-settings" component={MainPresentationSettingsRoute} />
                  <Route path="/live-presentation-settings" component={LivePresentationSettingsRoute} />

                  <Route>
                    <div className="text-center py-20 text-muted-foreground flex items-center justify-center font-bold text-2xl h-full">
                      404 - Page not found in workspace
                    </div>
                  </Route>
                  </Switch>
                </Suspense>
              </AppLayout>
            </AuthGuard>
          </Route>
        </Switch>
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  );
};
