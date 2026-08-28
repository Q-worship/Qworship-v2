/** Referrer portal brand lockup, adapted to reuse this app's own logo asset instead of the wireframe's manus-storage URLs. */
import { cn } from "@/lib/utils";
import { images } from "@/lib/theme";

export const ICON_URL = images.logo;

export function BrandLockup({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)} aria-label="Q-Worship Referrer">
        <img src={ICON_URL} alt="" className="h-10 w-10 object-contain" />
        <div className="leading-none"><div className="font-[Manrope] text-[18px] font-extrabold tracking-[-.05em]">Q-Worship</div><div className="mt-1 text-[10px] font-semibold tracking-[.18em] text-[#8054F6] uppercase">Referrer</div></div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)} aria-label="Q-Worship Referrer">
      <img src={ICON_URL} alt="Q-Worship" className="h-10 w-10 object-contain" />
      <span className="font-[Manrope] text-[18px] font-extrabold tracking-[-.05em]">Q-Worship</span>
      <span className="h-8 w-px bg-[#d7d6dc]" aria-hidden="true" />
      <span className="font-[Manrope] text-[17px] font-semibold text-[#202027]">Referrer</span>
    </div>
  );
}
