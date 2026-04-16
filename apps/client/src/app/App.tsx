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
const About = lazy(() => import("@/features/web/pages/About"));
const Pricing = lazy(() => import("@/features/web/pages/Pricing").then(m => ({ default: m.Pricing })));
const Contact = lazy(() => import("@/features/web/pages/Contact"));
const EndUserLicense = lazy(() => import("@/features/web/pages/EndUserLicense"));
const Features = lazy(() => import("@/features/web/pages/Features"));
const PrivacyPolicy = lazy(() => import("@/features/web/pages/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("@/features/web/pages/RefundPolicy"));
const DocsPage = lazy(() => import("@/features/web/pages/DocsPage").then(m => ({ default: m.DocsPage })));
const DownloadPage = lazy(() => import("@/features/web/pages/DownloadPage").then(m => ({ default: m.DownloadPage })));
import SignInPage from "@/features/auth/pages/SignInPage";
import AdminSignInPage from "@/features/auth/pages/AdminSignInPage";
import DesktopAuthRemote from "@/features/auth/pages/DesktopAuthRemote";
const LivePresentationV2 = lazy(() => import("@/features/dashboard/live/LivePresentationV2").then(m => ({ default: m.LivePresentationV2 })));
const OrganizationSetup = lazy(() => import("@/features/onboarding/pages/OrganizationSetup"));
const PlanSelection = lazy(() => import("@/features/onboarding/pages/PlanSelection"));
const ProjectSelection = lazy(() => import("@/features/onboarding/pages/ProjectSelection").then(m => ({ default: m.ProjectSelection })));
const QworshipHomeV2Wrapper = lazy(() => import("@/features/dashboard/DashboardLayoutV2").then(m => ({ default: m.QworshipHomeV2Wrapper })));

import { AppLayout } from "./Layout";
import { useAuthStore } from "@/features/auth/auth.store";
const BibleWorkspace = lazy(() => import("@/features/bible-reader/components/BibleWorkspace").then(m => ({ default: m.BibleWorkspace })));
const AssetsPage = lazy(() => import("@/features/dashboard/pages/AssetsPage"));
const HelpSupportPage = lazy(() => import("@/features/dashboard/pages/HelpSupportPage"));
const GuidesPage = lazy(() => import("@/features/web/pages/GuidesPage"));
const SuperAdminSidebar = lazy(() => import("@/features/super-admin/components/SuperAdminSidebar"));
import { LowerThirdEditorPage, LowerThirdSettingsPage } from "@/features/lowerThird";
import { MainPresentationSettingsPage } from "@/features/mainPresentation";

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
  
  // Hydrate the IndexedDB background caches once authenticated
  const { isSyncing: isBibleSyncing } = useBibleSync();
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

  if (!isAuthenticated) return <Redirect to="/login" />;
  
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
  
  return <>{children}</>;
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

export const AppRouter = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#0d071d]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>}>
          <Switch>
          <Route path="/" component={Home} />
          <Route path="/about" component={About} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/features" component={Features} />
          <Route path="/contact" component={Contact} />
          <Route path="/docs" component={DocsPage} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/refund-policy" component={RefundPolicy} />
          <Route path="/eula" component={EndUserLicense} />
          <Route path="/download" component={DownloadPage} />
          <Route path="/login" component={SignInPage} />
          <Route path="/signup" component={SignInPage} />
          <Route path="/desktop-auth" component={DesktopAuthRemote} />
          <Route path="/admin/login" component={AdminSignInPage} />

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

          <Route>
            <AuthGuard>
              <AppLayout>
                <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#1a0f2e]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>}>
                  <Switch>
                  <Route path="/organization-setup" component={OrganizationSetup} />
                  <Route path="/plan-selection" component={PlanSelection} />
                  <Route path="/project-selection" component={ProjectSelection} />
                  <Route path="/dashboard" component={QworshipHomeV2Wrapper} />
                  <Route path="/bible" component={BibleWorkspace} />
                  <Route path="/songs" component={SongsMock} />
                  <Route path="/presentations" component={PresentationsMock} />
                  <Route path="/dashboard-assets" component={AssetsPage} />
                  <Route path="/dashboard-help" component={HelpSupportPage} />
                  <Route path="/guides" component={GuidesPage} />
                  <Route path="/lower-third-settings" component={LowerThirdSettingsRoute} />
                  <Route path="/lower-third-editor/:templateId" component={LowerThirdEditorPage} />
                  <Route path="/main-presentation-settings" component={MainPresentationSettingsRoute} />

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
