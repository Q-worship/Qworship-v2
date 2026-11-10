import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, Download, PictureInPicture2 } from "lucide-react";
import { AddFileIcon } from "./AddFileIcon";

/** One entry of the Insert Item menu (the same list the header's Insert Item menu uses). */
export interface AddItemMenuEntry {
  name: string;
  iconComponent?: React.ElementType;
  hasSubmenu?: boolean;
  submenuItems?: { name: string; action: () => void }[];
  action?: () => void;
}

// This panel's own icons for two entries; the header menu keeps its own
const ICON_OVERRIDES: Record<string, React.ElementType> = {
  "On-Screen Bible": PictureInPicture2,
  "Import Item": Download,
};

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  /** The Insert Item menu entries; choosing one adds it to the selected service section */
  items: AddItemMenuEntry[];
}

/**
 * "Add item": the Insert Item menu as a modal. It is drawn into the page body (a portal) above
 * everything, so no section of the sidebar or the workspace can sit on top of it or clip it.
 */
export const AddItemModal: React.FC<AddItemModalProps> = ({ open, onClose, items }) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setExpanded(null);
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const choose = (action?: () => void) => {
    // Close first, then add: the item goes to the section that was chosen with the Add button
    onClose();
    action?.();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      data-testid="add-item-modal">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-item-title"
        className="w-full max-w-[340px] overflow-hidden rounded-2xl border border-white/10 bg-[#12091c] shadow-2xl">
        <div className="px-5 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8356F3]/20">
              <AddFileIcon className="h-5 w-5 text-[#8356F3]" />
            </div>
            <div className="min-w-0">
              <h2 id="add-item-title" className="text-lg font-semibold leading-tight text-[#8356F3]">
                Add item
              </h2>
              <p className="text-[10px] leading-tight text-gray-400">
                Click to add an item to your selected service section
              </p>
            </div>
          </div>
          <div className="mt-4 h-px bg-white/10" />
        </div>

        <ul className="max-h-[70vh] overflow-y-auto px-3 py-3">
          {items.map((entry) => {
            const Icon = ICON_OVERRIDES[entry.name] ?? entry.iconComponent;
            const label = entry.name.replace("On-Screen", "On-screen");
            const isOpen = expanded === entry.name;
            return (
              <li key={entry.name}>
                <button
                  type="button"
                  onClick={() =>
                    entry.hasSubmenu
                      ? setExpanded(isOpen ? null : entry.name)
                      : choose(entry.action)
                  }
                  className="flex w-full items-center gap-4 rounded-lg px-3 py-3 text-left text-sm text-white transition-colors hover:bg-[#21182A] focus-visible:bg-[#21182A] focus-visible:outline-none">
                  {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-gray-300" />}
                  <span className="flex-1">{label}</span>
                  {entry.hasSubmenu && (
                    <ChevronDownIcon
                      className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  )}
                </button>

                {entry.hasSubmenu && isOpen && (
                  <ul className="mb-1 ml-9 border-l border-white/10 pl-2">
                    {(entry.submenuItems ?? []).map((sub) => (
                      <li key={sub.name}>
                        <button
                          type="button"
                          onClick={() => choose(sub.action)}
                          className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-[#21182A] hover:text-white focus-visible:bg-[#21182A] focus-visible:outline-none">
                          {sub.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
};
