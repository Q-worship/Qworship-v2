import React from "react";

interface CustomToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const CustomToggle: React.FC<CustomToggleProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  className = "",
}) => {
  return (
    <button
      type="button"
      className={`
        relative inline-flex h-6 w-11 shrink-0 grow-0 basis-[2.75rem] !min-h-0 !min-w-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#8356F3] focus:ring-offset-2 focus:ring-offset-[#1A102D]
        ${checked ? "bg-[#8356F3]" : "bg-[#393048] border border-[#484848]/60"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
      // Width is pinned as well as classed: these sit beside paragraphs in
      // flex rows, where the default flex-shrink squeezes a 44px track into an
      // oval and the knob then overruns it.
      style={{ minHeight: "unset", minWidth: "2.75rem", width: "2.75rem", height: "1.5rem" }}
      onClick={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      aria-checked={checked}
      role="switch">
      <span
        className={`
          inline-block h-4 w-4 shrink-0 transform rounded-full bg-white transition-transform shadow-lg
          ${checked ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  );
};
