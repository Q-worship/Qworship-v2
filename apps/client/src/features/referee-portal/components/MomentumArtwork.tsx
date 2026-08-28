/** Quiet Momentum signature artwork: deterministic magenta-to-violet paths, referral nodes, and paper-white milestones. */
import { cn } from "@/lib/utils";
import { Banknote, Building2, Check, Link2, Sparkles } from "lucide-react";

export default function MomentumArtwork({ variant = "share", dark = false, className }: { variant?: "share" | "growth" | "payout" | "resource"; dark?: boolean; className?: string }) {
  const Icon = variant === "payout" ? Banknote : variant === "resource" ? Sparkles : variant === "growth" ? Building2 : Link2;
  return <div className={cn("pointer-events-none absolute inset-y-0 right-0 w-[46%] overflow-hidden", className)} aria-hidden="true">
    <div className={cn("absolute -right-10 -top-12 h-52 w-52 rounded-full", dark ? "bg-[#8054F6]/20" : "bg-[#ded4ff]/70")} />
    <div className={cn("absolute bottom-[-4rem] right-20 h-44 w-44 rounded-full", dark ? "bg-[#ff2e91]/12" : "bg-[#ffd9eb]/55")} />
    <div className={cn("absolute right-[8%] top-1/2 h-[3px] w-[82%] -translate-y-1/2 rotate-[-12deg] rounded-full", dark ? "bg-gradient-to-r from-[#ff2e91] via-[#8054F6] to-white/20" : "bg-gradient-to-r from-[#ff2e91] via-[#8054F6] to-[#cabdff]")} />
    <span className={cn("absolute left-[18%] top-[58%] grid h-10 w-10 place-items-center rounded-xl shadow-lg", dark ? "bg-white text-[#8054F6]" : "bg-white text-[#8054F6]")}><Icon size={18}/></span>
    <span className="absolute left-[49%] top-[42%] grid h-8 w-8 place-items-center rounded-full bg-[#ff2e91] text-white shadow-[0_8px_20px_rgba(255,46,145,.24)]"><Check size={14}/></span>
    <span className="absolute right-[14%] top-[25%] grid h-12 w-12 place-items-center rounded-[16px] bg-[#8054F6] text-white shadow-[0_12px_28px_rgba(128,84,246,.3)]"><Building2 size={20}/></span>
    <span className={cn("absolute bottom-[14%] right-[9%] rounded-full px-3 py-1.5 text-[10px] font-extrabold", dark ? "bg-white/10 text-white ring-1 ring-white/15" : "bg-white text-[#5d3abd] shadow-sm")}>{variant === "payout" ? "CLEARED" : variant === "resource" ? "READY" : "ATTRIBUTED"}</span>
  </div>;
}
