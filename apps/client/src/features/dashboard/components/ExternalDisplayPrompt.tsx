import React from "react";
import { MonitorUp, X } from "lucide-react";

interface ExternalDisplayPromptProps {
  visible: boolean;
  onManage: () => void;
  onDismiss: () => void;
}

// A small, dismissible toast: "a second display was detected" - only ever
// rendered when useExternalDisplayDetection has found a genuine external
// screen (see DashboardLayoutV2.tsx). "Manage" opens Display Settings so the
// operator reviews/sets it there rather than switching output immediately;
// saying no or closing it just hides this prompt, it does not turn off
// detection, so it can reappear on a future screenschange.
export const ExternalDisplayPrompt: React.FC<ExternalDisplayPromptProps> = ({
  visible,
  onManage,
  onDismiss,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100000] w-[340px] rounded-xl border border-purple-500/30 bg-[#1a0f2e] p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-purple-600/20 text-purple-300">
          <MonitorUp className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Second display detected</p>
          <p className="mt-1 text-xs text-gray-400">
            Manage this in Display Settings to show live output there.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onManage}
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-purple-500"
            >
              Manage
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:border-gray-500"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-gray-500 hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
