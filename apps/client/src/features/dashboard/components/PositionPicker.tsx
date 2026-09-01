import React from "react";
import type { BibleReferencePosition } from "@/features/dashboard/hooks/useWysiwygEditor";

interface PositionRowProps {
  align: "left" | "center" | "right";
  label: string;
  selected: boolean;
  onClick: () => void;
}

const ALIGN_TO_JUSTIFY: Record<PositionRowProps["align"], string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

const PositionRow: React.FC<PositionRowProps> = ({ align, label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={`w-full rounded-lg px-4 py-3 mb-2 last:mb-0 transition-colors ${
      selected ? "bg-[#4a3f6b] ring-2 ring-[#8b5cf6]" : "bg-[#3a3550] hover:bg-[#423c5c]"
    }`}
  >
    <div className="flex flex-col gap-1.5" style={{ alignItems: ALIGN_TO_JUSTIFY[align] as any }}>
      <span className="h-1 w-20 rounded-full bg-[#8b5cf6]" />
      <span className="text-sm text-white">{label}</span>
    </div>
  </button>
);

interface PositionPickerProps {
  value: BibleReferencePosition;
  onChange: (value: BibleReferencePosition) => void;
}

export const PositionPicker: React.FC<PositionPickerProps> = ({ value, onChange }) => {
  return (
    <div>
      <p className="text-sm text-gray-400 mb-4">Choose a position for your reference</p>

      <h4 className="text-xl font-semibold text-white mb-2">Top</h4>
      <div className="mb-4">
        <PositionRow align="left" label="Left" selected={value === "top-left"} onClick={() => onChange("top-left")} />
        <PositionRow align="center" label="Middle" selected={value === "top-center"} onClick={() => onChange("top-center")} />
        <PositionRow align="right" label="Right" selected={value === "top-right"} onClick={() => onChange("top-right")} />
      </div>

      <h4 className="text-xl font-semibold text-white mb-2">Bottom</h4>
      <div>
        <PositionRow align="left" label="Left" selected={value === "bottom-left"} onClick={() => onChange("bottom-left")} />
        <PositionRow align="center" label="Middle" selected={value === "bottom-center"} onClick={() => onChange("bottom-center")} />
        <PositionRow align="right" label="Right" selected={value === "bottom-right"} onClick={() => onChange("bottom-right")} />
      </div>
    </div>
  );
};
