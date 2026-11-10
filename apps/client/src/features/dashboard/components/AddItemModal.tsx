import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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

/** The screen position of the Add button the panel belongs to. */
export interface AddItemAnchor {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

// This panel's own icons for two entries; the header menu keeps its own
const ICON_OVERRIDES: Record<string, React.ElementType> = {
  "On-Screen Bible": PictureInPicture2,
  "Import Item": Download,
};

const MARGIN = 8;

interface AddItemModalProps {
  /** Where the panel opens: beside this button. Null keeps it closed. */
  anchor: AddItemAnchor | null;
  onClose: () => void;
  /** The Insert Item menu entries; choosing one adds it to the selected service section */
  items: AddItemMenuEntry[];
}

/**
 * "Add item": the Insert Item menu as a small panel beside the Add button that opened it - to the
 * right of the button, level with it, moving up (or to the left of the button) when there is
 * no room below (or to the right). The page is not dimmed. It is drawn into the page body (a
 * portal) above everything, so no section of the sidebar or the workspace can sit on top of it or
 * clip it. It closes on Esc, a click anywhere else, or when the page is resized or scrolled.
 */
export const AddItemModal: React.FC<AddItemModalProps> = ({ anchor, onClose, items }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const open = anchor !== null;

  // Place the panel beside the button, kept inside the window. Done again when the list grows
  // (Import Item opened).
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!anchor || !panel) {
      setPosition(null);
      return;
    }
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = anchor.right + MARGIN;
    if (left + width > viewportWidth - MARGIN) left = anchor.left - width - MARGIN;
    left = Math.min(Math.max(left, MARGIN), Math.max(MARGIN, viewportWidth - MARGIN - width));

    let top = anchor.top;
    if (top + height > viewportHeight - MARGIN) top = anchor.bottom - height;
    top = Math.min(Math.max(top, MARGIN), Math.max(MARGIN, viewportHeight - MARGIN - height));

    setPosition({ top, left });
  }, [anchor, expanded, items]);

  useEffect(() => {
    if (!open) {
      setExpanded(null);
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    // The panel is placed against the button, so it must not be left behind when either moves
    const onMove = (event: Event) => {
      if (panelRef.current && event.target instanceof Node && panelRef.current.contains(event.target)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const choose = (action?: () => void) => {
    // Close first, then add: the item goes to the section that was chosen with the Add button
    onClose();
    action?.();
  };

  return createPortal(
    <>
      {/* Invisible: a click anywhere outside the panel closes it */}
      <div className="fixed inset-0 z-[299]" onMouseDown={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-label="Add item"
        className="fixed z-[300] w-[300px] overflow-y-auto rounded-2xl border border-white/10 bg-[#12091c] shadow-2xl"
        style={{
          top: position?.top ?? 0,
          left: position?.left ?? 0,
          maxHeight: `calc(100vh - ${MARGIN * 2}px)`,
          // Measured first, shown once it has its place
          visibility: position ? "visible" : "hidden",
        }}
        data-testid="add-item-modal">
        <div className="px-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8356F3]/20">
              <AddFileIcon className="h-5 w-5 text-[#8356F3]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-tight text-[#8356F3]">Add item</h2>
              <p className="text-[10px] leading-tight text-gray-400">
                Click to add an item to your selected service section
              </p>
            </div>
          </div>
          <div className="mt-3 h-px bg-white/10" />
        </div>

        <ul className="px-2 py-2">
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
                  className="flex w-full items-center gap-4 rounded-lg px-3 py-2.5 text-left text-sm text-white transition-colors hover:bg-[#21182A] focus-visible:bg-[#21182A] focus-visible:outline-none">
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
    </>,
    document.body,
  );
};
