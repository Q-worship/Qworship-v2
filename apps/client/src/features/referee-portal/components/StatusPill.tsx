/** Quiet Momentum status language: gentle semantic colour with unmistakable labels. */
import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  "Active subscriber": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Trial active": "bg-violet-50 text-violet-700 border-violet-100",
  "Getting set up": "bg-sky-50 text-sky-700 border-sky-100",
  "Trial complete": "bg-amber-50 text-amber-700 border-amber-100",
  "Interest received": "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100",
  "Payment attention": "bg-orange-50 text-orange-700 border-orange-100",
  "Subscription ended": "bg-slate-100 text-slate-600 border-slate-200",
  Available: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Pending: "bg-violet-50 text-violet-700 border-violet-100",
  Paid: "bg-sky-50 text-sky-700 border-sky-100",
  Reversed: "bg-rose-50 text-rose-700 border-rose-100",
  Processing: "bg-amber-50 text-amber-700 border-amber-100",
};

export default function StatusPill({ label, className }: { label: string; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", tones[label] || "bg-slate-100 text-slate-600 border-slate-200", className)}>{label}</span>;
}
