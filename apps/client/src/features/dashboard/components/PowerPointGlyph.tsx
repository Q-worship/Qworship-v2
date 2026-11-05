import React from "react";

/** The PowerPoint mark used by Import Presentation and by imported slides in the sidebar. */
export const PowerPointGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <rect x="17" y="6" width="27" height="36" rx="3" fill="#CDBBF7" />
    <rect x="23" y="14" width="15" height="3" rx="1.5" fill="#7A52D8" opacity="0.55" />
    <rect x="23" y="21" width="15" height="3" rx="1.5" fill="#7A52D8" opacity="0.55" />
    <rect x="23" y="28" width="15" height="3" rx="1.5" fill="#7A52D8" opacity="0.55" />
    <rect x="3" y="12" width="26" height="26" rx="4" fill="#6D3FD1" />
    <text
      x="16"
      y="31"
      textAnchor="middle"
      fontSize="18"
      fontWeight="700"
      fill="#FFFFFF"
      fontFamily="Arial, Helvetica, sans-serif">
      P
    </text>
  </svg>
);

/** Slides added by Import Presentation get ids like "imported-<time>-0003". */
export const isImportedPresentationItem = (item: {
  id?: unknown;
  type?: unknown;
}): boolean =>
  item.type === "media" &&
  typeof item.id === "string" &&
  item.id.startsWith("imported-");
