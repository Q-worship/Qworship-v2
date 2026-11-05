import React, { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

export interface ImportHealthSlide {
  number: number;
  title: string;
  status: "ready" | "notes" | "simplified";
  notes: { level: "info" | "warning"; message: string }[];
}

export interface ImportHealthReport {
  fileName: string;
  slides: ImportHealthSlide[];
}

/** True when the report has something the user should look at (not just info notes). */
export const reportNeedsAttention = (report: ImportHealthReport): boolean =>
  report.slides.some(
    (slide) =>
      slide.status !== "ready" || slide.notes.some((note) => note.level === "warning"),
  );

interface ImportHealthReportModalProps {
  report: ImportHealthReport | null;
  onClose: () => void;
}

export const ImportHealthReportModal: React.FC<ImportHealthReportModalProps> = ({
  report,
  onClose,
}) => {
  useEffect(() => {
    if (!report) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [report, onClose]);

  if (!report) return null;

  const withNotes = report.slides.filter((slide) => slide.notes.length > 0);
  const exact = report.slides.filter(
    (slide) => !slide.notes.some((note) => note.level === "warning"),
  ).length;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10001]"
      onClick={onClose}>
      <div
        role="dialog"
        aria-label="Import health report"
        onClick={(event) => event.stopPropagation()}
        className="bg-gradient-to-b from-[#2a1f3d] to-[#1a0f2e] border border-[#8356F3]/30 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] mx-4 flex flex-col">
        <div className="px-8 pt-8 pb-4">
          <h3 className="text-xl font-semibold text-white mb-2">Import health report</h3>
          <p className="text-gray-300 text-sm">
            <span className="text-[#8356F3] font-semibold">{report.fileName}</span> was
            imported.{" "}
            {exact === report.slides.length
              ? `All ${report.slides.length} slides match the original.`
              : `${exact} of ${report.slides.length} slides match the original; the rest are listed below.`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-2 space-y-3">
          {withNotes.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              Nothing needs your attention.
            </div>
          ) : (
            withNotes.map((slide) => (
              <div key={slide.number} className="rounded-lg bg-[#3a3147]/70 px-4 py-3">
                <div className="text-sm font-semibold text-white mb-1.5">
                  Slide {slide.number}
                  {slide.title && (
                    <span className="font-normal text-gray-400"> – {slide.title.slice(0, 50)}</span>
                  )}
                </div>
                <ul className="space-y-1">
                  {slide.notes.map((note, index) => (
                    <li
                      key={index}
                      className={`flex items-start gap-2 text-xs ${
                        note.level === "warning" ? "text-amber-300" : "text-gray-400"
                      }`}>
                      {note.level === "warning" ? (
                        <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
                      ) : (
                        <Info className="w-3.5 h-3.5 mt-px shrink-0" />
                      )}
                      <span>{note.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end px-8 py-5">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-[#8356F3] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded-lg transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
