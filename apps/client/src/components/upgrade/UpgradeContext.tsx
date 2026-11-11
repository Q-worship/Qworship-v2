import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { FeatureId } from "@qworship/shared";
import { PlanSelectionModal } from "./PlanSelectionModal";

/**
 * One place that opens the plan modal, from anywhere.
 *
 * Locked controls are scattered across the Live Console, the media library
 * and the slide canvas — all different features, none of which may import
 * from another. A context mounted once at the app root is how they share one
 * modal without sharing a feature folder.
 *
 * The feature that prompted it travels with the request, so the modal can
 * lead with the thing the person just tried to do rather than a generic
 * pitch. Somebody who pressed NIV should be told about Bible versions.
 */

interface UpgradeContextValue {
  /** Open the plan modal, optionally highlighting what was just refused. */
  openUpgrade: (featureId?: FeatureId) => void;
  closeUpgrade: () => void;
}

const UpgradeContext = createContext<UpgradeContextValue | null>(null);

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<FeatureId | null>(null);
  const [open, setOpen] = useState(false);

  const openUpgrade = useCallback((featureId?: FeatureId) => {
    setReason(featureId ?? null);
    setOpen(true);
  }, []);

  const closeUpgrade = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ openUpgrade, closeUpgrade }), [openUpgrade, closeUpgrade]);

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      <PlanSelectionModal open={open} onOpenChange={setOpen} reason={reason} />
    </UpgradeContext.Provider>
  );
}

/**
 * Open the plan modal.
 *
 * Returns a no-op outside the provider rather than throwing. A locked badge
 * that does nothing is a small disappointment; a crash during a service
 * because a component was rendered somewhere unexpected is not.
 */
export function useUpgradePrompt(): UpgradeContextValue {
  const context = useContext(UpgradeContext);
  if (context) return context;
  return { openUpgrade: () => {}, closeUpgrade: () => {} };
}
