/** Routing shell for the referrer-portal port: mirrors the wireframe's own App.tsx PortalRoutes structure,
 *  mounted at /refer-and-earn/dashboard via a nested wouter Router in App.tsx so internal <Link href="..."> calls
 *  in every ported page resolve correctly without rewriting them. */
import PortalShell from "./components/PortalShell";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import Earnings from "./pages/Earnings";
import Notifications from "./pages/Notifications";
import PaymentHistory from "./pages/PaymentHistory";
import ReferralDetail from "./pages/ReferralDetail";
import Referrals from "./pages/Referrals";
import Resources from "./pages/Resources";
import Settings from "./pages/Settings";
import Support from "./pages/Support";
import Withdrawals from "./pages/Withdrawals";
import NotFound from "./pages/NotFound";
import { Route, Switch } from "wouter";

export default function RefereePortalApp() {
  return (
    <PortalShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/referrals" component={Referrals} />
        <Route path="/referrals/tools/qr-code" component={Referrals} />
        <Route path="/referrals/tools/share-message" component={Referrals} />
        <Route path="/referrals/tools/campaign-link" component={Referrals} />
        <Route path="/referrals/:id" component={ReferralDetail} />
        <Route path="/earnings" component={Earnings} />
        <Route path="/withdrawals" component={Withdrawals} />
        <Route path="/payments" component={PaymentHistory} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/resources" component={Resources} />
        <Route path="/support" component={Support} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </PortalShell>
  );
}
