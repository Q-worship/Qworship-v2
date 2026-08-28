/** Quiet Momentum shell: anchored navigation rail, spacious operational canvas, and clear escape routes.
 *  Adapted from the referrer-portal wireframe: sign-out now calls the app's real auth store. */
import { BrandLockup } from "./BrandLockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ProfileMenu from "./ProfileMenu";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth.store";
import { BarChart3 as ChartNoAxesCombined, Bell, BookOpen, Building2, CircleDollarSign, CreditCard, Headphones, LayoutDashboard, LogOut, Menu, Search, Settings, WalletCards } from "lucide-react";
import { ReactNode } from "react";
import { Link, useLocation } from "wouter";

const nav = [
  { label: "Overview", items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }] },
  { label: "Grow", items: [{ label: "Referrals", href: "/referrals", icon: Building2 }, { label: "Analytics", href: "/analytics", icon: ChartNoAxesCombined }] },
  { label: "Money", items: [{ label: "Earnings", href: "/earnings", icon: CircleDollarSign }, { label: "Withdrawals", href: "/withdrawals", icon: WalletCards }, { label: "Payment history", href: "/payments", icon: CreditCard }] },
  { label: "Enablement", items: [{ label: "Resources", href: "/resources", icon: BookOpen }, { label: "Support", href: "/support", icon: Headphones }] },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const [, navigate] = useLocation();
  return <div className="flex h-full flex-col">
    <div className="px-5 pb-7 pt-5"><BrandLockup compact /></div>
    <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-5" aria-label="Portal navigation">
      {nav.map(group => <div key={group.label} className="mb-6"><div className="px-3 pb-2 text-[10px] font-bold tracking-[.18em] text-[#9a96a7] uppercase">{group.label}</div>{group.items.map(item => {
        const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
        return <Link key={item.href} href={item.href} onClick={onNavigate} className={cn("mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition", active ? "bg-[#8054F6] text-white shadow-[0_10px_22px_rgba(128,84,246,.22)]" : "text-[#656270] hover:bg-[#f2efff] hover:text-[#6840d9]")}><item.icon size={18} strokeWidth={active ? 2.3 : 1.8} />{item.label}</Link>;
      })}</div>)}
    </nav>
    <div className="border-t border-[#eeebf6] p-3">
      <Link href="/settings" onClick={onNavigate} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition", location.startsWith("/settings") ? "bg-[#eee9ff] text-[#6840d9]" : "text-[#656270] hover:bg-[#f2efff]")}><Settings size={18} />Settings</Link>
      <button
        onClick={() => { onNavigate?.(); logout(); navigate("/refer-and-earn/login"); }}
        className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#656270] transition hover:bg-rose-50 hover:text-rose-600"
      >
        <LogOut size={18} />Sign out
      </button>
    </div>
  </div>;
}

export default function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f3ff] text-[#24222a]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[238px] border-r border-[#ebe8f5] bg-white/90 backdrop-blur-xl lg:block"><NavContent /></aside>
      <div className="lg:pl-[238px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center gap-4 border-b border-[#ebe8f5] bg-[#f4f3ff]/88 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden"><Menu size={21} /></Button></SheetTrigger><SheetContent side="left" className="w-[270px] border-0 p-0"><NavContent /></SheetContent></Sheet>
          <div className="relative hidden max-w-[430px] flex-1 sm:block"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aaa6b4]" size={17} /><Input className="h-10 rounded-xl border-white bg-white/90 pl-10 shadow-[0_8px_24px_rgba(48,35,91,.045)] focus-visible:ring-[#8054F6]" placeholder="Search churches, payments, resources…" /></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#777382] shadow-sm md:block">Prototype data</span>
            <Tooltip><TooltipTrigger asChild><Link href="/notifications" className="relative grid h-10 w-10 place-items-center rounded-xl bg-white text-[#56525e] shadow-sm transition hover:text-[#8054F6]"><Bell size={18} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ff2e91] ring-2 ring-white" /></Link></TooltipTrigger><TooltipContent>Notifications</TooltipContent></Tooltip>
            <ProfileMenu />
          </div>
        </header>
        <main className="page-enter mx-auto max-w-[1500px] px-4 py-6 sm:px-7 lg:px-9 lg:py-8"><div className="mb-6 h-[3px] w-32 rounded-full bg-gradient-to-r from-[#ff2e91] via-[#8054F6] to-[#d6ccf8]" aria-hidden="true" />{children}</main>
      </div>
    </div>
  );
}
