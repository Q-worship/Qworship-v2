/** Quiet Momentum profile menu: identity-first account navigation, clear status, and confirmed session exit.
 *  Adapted from the referrer-portal wireframe to show the real signed-in referee's name/email (from
 *  useAuthStore) instead of the fixed "Daniel Mensah" prototype record, and to sign out for real. */
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Bell,
  Check,
  ChevronDown,
  HelpCircle as CircleHelp,
  CreditCard,
  KeyRound,
  Loader2,
  LogOut,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "../lib/toast";
import { useLocation } from "wouter";
import { useAuthStore } from "@/features/auth/auth.store";

type MenuDestination = {
  label: string;
  description: string;
  href: string;
  icon: typeof UserRound;
  badge?: string;
};

const accountItems: MenuDestination[] = [
  { label: "Profile & territory", description: "Identity, contact and region", href: "/settings?tab=profile", icon: UserRound },
  { label: "Payout details", description: "Bank destination and readiness", href: "/settings?tab=payout", icon: CreditCard },
  { label: "Security & sessions", description: "Password, MFA and devices", href: "/settings?tab=security", icon: KeyRound },
  { label: "Notification preferences", description: "Choose what reaches you", href: "/settings?tab=notifications", icon: Settings2 },
];

const assistanceItems: MenuDestination[] = [
  { label: "Notifications", description: "Referral and money updates", href: "/notifications", icon: Bell, badge: "2" },
  { label: "Help & support", description: "Answers and support requests", href: "/support", icon: CircleHelp },
];

export default function ProfileMenu() {
  const [location, navigate] = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [open, setOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Referral Partner";
  const initials = (
    (user?.firstName?.[0] || "") + (user?.lastName?.[0] || user?.email?.[1] || "")
  ).toUpperCase() || "RP";

  function goTo(href: string) {
    setOpen(false);
    navigate(href);
  }

  function isActive(href: string) {
    const [path, query] = href.split("?");
    if (!location.startsWith(path)) return false;
    if (!query) return location === path;
    const expectedTab = new URLSearchParams(query).get("tab");
    return new URLSearchParams(window.location.search).get("tab") === expectedTab;
  }

  function signOut() {
    setSigningOut(true);
    window.setTimeout(() => {
      logout();
      setSigningOut(false);
      setSignOutOpen(false);
      toast.success("You have been signed out securely");
      navigate("/refer-and-earn/login");
    }, 400);
  }

  const renderItem = (item: MenuDestination) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return <DropdownMenuItem key={item.href} onSelect={() => goTo(item.href)} className={cn("group my-0.5 cursor-pointer rounded-xl px-3 py-2.5 focus:bg-[#f2eeff]", active && "bg-[#f2eeff]")}>
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f5f2fb] text-[#726a7d] transition group-focus:bg-white group-focus:text-[#8054F6]", active && "bg-white text-[#8054F6] shadow-sm")}><Icon size={17}/></span>
      <span className="min-w-0 flex-1"><span className={cn("block text-xs font-extrabold text-[#37323d]", active && "text-[#6840ce]")}>{item.label}</span><span className="mt-0.5 block truncate text-[10px] text-[#918a98]">{item.description}</span></span>
      {item.badge && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#ff2e91] px-1 text-[9px] font-extrabold text-white">{item.badge}</span>}
      {active && !item.badge && <Check size={14} className="text-[#8054F6]"/>}
    </DropdownMenuItem>;
  };

  return <>
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className={cn("ml-1 flex items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8054F6] focus-visible:ring-offset-2", open && "bg-white shadow-sm")} aria-label={`Open ${fullName} account menu`} aria-expanded={open}>
          <Avatar className="h-9 w-9"><AvatarFallback className="bg-[#221f29] text-xs font-bold text-white">{initials}</AvatarFallback></Avatar>
          <div className="hidden text-left md:block"><div className="text-xs font-bold text-[#2a2730]">{fullName}</div><div className="text-[10px] text-[#8b8794]">Referral Partner</div></div>
          <ChevronDown className={cn("hidden text-[#9995a3] transition-transform duration-200 md:block", open && "rotate-180 text-[#8054F6]")} size={14}/>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-[318px] rounded-[20px] border-[#e9e4f1] bg-white p-2 shadow-[0_24px_70px_rgba(39,29,67,.18)]">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="relative overflow-hidden rounded-[16px] bg-[#29242f] p-4 text-white">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#ff2e91] via-[#8054F6] to-[#c9bcff]"/>
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#8054F6]/20"/>
            <div className="relative flex items-center gap-3"><Avatar className="h-12 w-12 ring-2 ring-white/10"><AvatarFallback className="bg-white text-sm font-extrabold text-[#282330]">{initials}</AvatarFallback></Avatar><div className="min-w-0"><div className="truncate text-sm font-extrabold">{fullName}</div><div className="mt-0.5 truncate text-[10px] text-[#c9c1cf]">{user?.email}</div><div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-emerald-300"><ShieldCheck size={12}/>Active · Email verified</div></div></div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-2 bg-[#f0edf4]"/>
        <DropdownMenuGroup>{accountItems.map(renderItem)}</DropdownMenuGroup>
        <DropdownMenuSeparator className="my-2 bg-[#f0edf4]"/>
        <DropdownMenuGroup>{assistanceItems.map(renderItem)}</DropdownMenuGroup>
        <DropdownMenuSeparator className="my-2 bg-[#f0edf4]"/>
        <DropdownMenuItem onSelect={(event) => { event.preventDefault(); setOpen(false); setSignOutOpen(true); }} className="cursor-pointer rounded-xl px-3 py-2.5 text-rose-600 focus:bg-rose-50 focus:text-rose-700"><span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50"><LogOut size={17}/></span><span className="ml-1"><span className="block text-xs font-extrabold">Sign out</span><span className="mt-0.5 block text-[10px] text-rose-400">End this portal session</span></span></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <AlertDialog open={signOutOpen} onOpenChange={(value) => !signingOut && setSignOutOpen(value)}>
      <AlertDialogContent className="rounded-[24px] sm:max-w-[470px]">
        <AlertDialogHeader><span className="mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><LogOut size={21}/></span><AlertDialogTitle className="text-2xl">Sign out of Q-Worship?</AlertDialogTitle><AlertDialogDescription>You will return to the Referrer sign-in screen. Your account and referral activity will remain unchanged.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={signingOut}>Stay signed in</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); signOut(); }} disabled={signingOut} className="bg-rose-600 text-white hover:bg-rose-700">{signingOut ? <><Loader2 className="mr-2 animate-spin" size={16}/>Signing out…</> : <><LogOut className="mr-2" size={16}/>Sign out</>}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
