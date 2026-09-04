import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Monitor, MonitorUp, Info, CheckCircle2 } from "lucide-react";
import { useExternalDisplayDetection, type DisplayOutputMode } from "@/features/dashboard/hooks/useExternalDisplayDetection";

interface DisplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Keeps the "Detecting External Displays" state on screen for a minimum
// stretch even when the real check resolves faster, so it reads as a real
// check happening rather than a flash the eye can't register.
const MIN_DETECT_DISPLAY_MS = 2200;

export function DisplaySettingsModal({ isOpen, onClose }: DisplaySettingsModalProps) {
  const externalDisplay = useExternalDisplayDetection();
  const { defaultOutput, setDefaultOutput, supported, enabled, externalScreen, requestEnable, disableDetection } = externalDisplay;

  // Which tab is being VIEWED - independent of which output is actually the
  // committed default. Switching to HDMI only previews/checks it; nothing is
  // saved until "Set as default display" is checked (see handleSelectHdmi).
  const [viewingTab, setViewingTab] = useState<DisplayOutputMode>(defaultOutput);
  // Local, modal-only "still checking" flag - separate from the store's own
  // isDetecting so the minimum-display-time wrapper doesn't need to fight
  // over the same flag other consumers (the toast) also read.
  const [isCheckingHdmi, setIsCheckingHdmi] = useState(false);

  useEffect(() => {
    if (isOpen) setViewingTab(defaultOutput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSelectWeb = () => {
    setViewingTab("web");
    setDefaultOutput("web");
  };

  const handleSelectHdmi = () => {
    setViewingTab("hdmi");
    setIsCheckingHdmi(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_DETECT_DISPLAY_MS));
    Promise.all([requestEnable(), minDelay]).finally(() => setIsCheckingHdmi(false));
  };

  const showDetectingPanel = viewingTab === "hdmi" && supported && (isCheckingHdmi || externalScreen);
  const showDefaultBanner = viewingTab === defaultOutput;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-xl w-[92vw] max-h-[85vh] bg-[#0f0920] border-gray-700 p-0 flex flex-col"
        data-testid="modal-display-settings"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-700/50 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-[#C77DFF]">Display Settings</DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure your Q-worship Cloud display settings. Detect any external display sources connected to your
            computer and set your preferred output source for live presentation
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="bg-[#120a26] border border-gray-700/40 rounded-xl p-6">
            <h3 className="text-base font-semibold text-white">Default Display Output</h3>
            <p className="mt-1 text-sm text-gray-400">Choose default presentation mode for your displays</p>

            <div className="mt-4 inline-flex rounded-xl bg-[#0f0920] border border-gray-700/60 p-1">
              <button
                type="button"
                onClick={handleSelectWeb}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  viewingTab === "web" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Monitor className="h-4 w-4" />
                Web Screen
              </button>
              <button
                type="button"
                onClick={handleSelectHdmi}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  viewingTab === "hdmi" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <MonitorUp className="h-4 w-4" />
                HDMI
              </button>
            </div>

            {showDefaultBanner && (
              <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-400" />
                <span>
                  Your default is currently set to {defaultOutput === "web" ? "Web screen" : "HDMI"}, this means when
                  you go live,{" "}
                  {defaultOutput === "web"
                    ? "a new window will be opened in your browser"
                    : "a new window will be opened in your extended HDMI screen"}
                  .
                </span>
              </div>
            )}

            {showDetectingPanel && (
              <div className="mt-5 border-t border-gray-700/40 pt-5">
                <h4 className="text-sm font-semibold text-white">External HDMI Display</h4>
                {isCheckingHdmi ? (
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-700/60">
                      <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-purple-600 to-purple-400" />
                    </div>
                    <p className="mt-2 text-center text-xs text-gray-500">Detecting External Displays</p>
                  </div>
                ) : externalScreen ? (
                  <div className="mt-3 flex items-start gap-3">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-purple-600/20 text-purple-300">
                      <MonitorUp className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-purple-300">External display detected - HDMI</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Show the live output there? Your console will stay open here.
                      </p>
                      <label className="mt-3 flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={defaultOutput === "hdmi"}
                          onChange={(e) => setDefaultOutput(e.target.checked ? "hdmi" : "web")}
                          className="h-3.5 w-3.5 rounded accent-purple-500 cursor-pointer"
                        />
                        <span className="text-xs text-gray-300">Set as default display</span>
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          {supported && (
            <section className="bg-[#120a26] border border-gray-700/40 rounded-xl p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => {
                    if (e.target.checked) requestEnable();
                    else disableDetection();
                  }}
                  className="mt-0.5 w-4 h-4 rounded accent-purple-500 cursor-pointer"
                />
                <span>
                  <span className="block text-sm text-gray-200 font-medium">Automatically detect external displays</span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    When a second display is connected and extended (e.g. a projector over HDMI), you'll be asked
                    whether to show live output there while the console stays here. Your browser will ask for
                    permission once.
                  </span>
                  <span className="block text-xs text-gray-600 mt-2">
                    Please note that this is only available for Google Chrome and Microsoft Edge browsers, if you
                    cannot detect your external display, please switch to one of these browsers.
                  </span>
                </span>
              </label>
              {enabled && externalScreen && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Detection is active and an external display is currently connected.
                </p>
              )}
            </section>
          )}

          {!supported && (
            <p className="text-xs text-gray-500">
              Automatic external display detection is only available in Google Chrome and Microsoft Edge - switch to
              one of these browsers to use it.
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-700/50 flex-shrink-0 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-[#6366f1] hover:bg-[#5558e3] text-white"
            data-testid="button-close-display-settings"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
