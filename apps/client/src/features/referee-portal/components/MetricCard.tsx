/** Quiet Momentum metric card: high-signal number, restrained context, no decorative noise. */
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp } from "lucide-react";

export default function MetricCard({ label, value, note, icon: Icon, accent = "violet", trend }: { label: string; value: string; note: string; icon: LucideIcon; accent?: "violet" | "pink" | "green" | "amber"; trend?: string }) {
  const tones = { violet: "bg-violet-50 text-[#8054F6]", pink: "bg-pink-50 text-[#f52f8b]", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600" };
  return (
    <article className="surface group rounded-[20px] p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(48,35,91,.1)]">
      <div className="flex items-start justify-between gap-4"><span className={cn("grid h-10 w-10 place-items-center rounded-xl", tones[accent])}><Icon size={19} /></span>{trend && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><TrendingUp size={14} />{trend}</span>}</div>
      <div className="metric-number mt-5 text-[28px] font-extrabold text-[#202027]">{value}</div>
      <div className="mt-1 text-sm font-semibold text-[#31303a]">{label}</div>
      <p className="mt-1.5 text-xs leading-5 text-[#777483]">{note}</p>
    </article>
  );
}
