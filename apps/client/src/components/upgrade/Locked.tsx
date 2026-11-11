import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import type { FeatureId } from "@qworship/shared";
import { useFeature } from "@/hooks/useCapabilities";
import { useUpgradePrompt } from "./UpgradeContext";
import { cn } from "@/lib/utils";

/**
 * A control the plan does not include: visible, disabled, and explained.
 *
 * Shown rather than hidden, on purpose. A feature nobody can see is a
 * feature nobody buys, and a volunteer who cannot find lower thirds will
 * open a support ticket rather than a plan page. Shown rather than live,
 * also on purpose: a control that looks ready and then fails is a trick, and
 * this product is used in front of a congregation.
 *
 * So the control stays where it is, dimmed, with a lock on it, and pressing
 * it opens the plan modal on the thing that was just wanted.
 */

interface LockedProps {
  feature: FeatureId;
  children: ReactNode;
  /** Hide the little lock pip, for dense rows where it would be noise. */
  hideBadge?: boolean;
  className?: string;
}

export function Locked({ feature, children, hideBadge, className }: LockedProps) {
  const { allowed, label, blurb } = useFeature(feature);
  const { openUpgrade } = useUpgradePrompt();

  // Available: render exactly what was passed, wrapping nothing. No stray
  // div is left in the tree to disturb a parent's grid or flex layout.
  if (allowed) return <>{children}</>;

  return (
    <button
      type="button"
      onClick={() => openUpgrade(feature)}
      title={blurb}
      aria-label={`${label} — included with Standard`}
      className={cn(
        "relative inline-flex cursor-pointer rounded-lg text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b3dff]",
        className,
      )}
    >
      {/*
        The real control, dimmed and inert. `pointer-events-none` matters:
        without it the child keeps its own click handler and a disabled-
        looking button would still fire.
      */}
      <span className="pointer-events-none select-none opacity-40 grayscale">
        {children}
      </span>

      {!hideBadge && (
        <span
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#8b3dff] shadow-sm"
          aria-hidden="true"
        >
          <Lock className="h-2.5 w-2.5 text-white" />
        </span>
      )}
    </button>
  );
}

/**
 * The same rule as a text tag, for list rows and menu items.
 *
 * Some places have no control to dim — a row in a menu, an entry in a
 * sidebar — and a lock pip floating over text reads as damage. There, the
 * word does the work instead.
 */
export function StandardTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full bg-[#8b3dff]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b388ff]",
        className,
      )}
    >
      Standard
    </span>
  );
}
