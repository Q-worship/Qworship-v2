import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  LayoutGrid,
  List,
  Plus,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  parsePptx,
  type ParsedPresentation,
  type ParsedSlide,
} from "@/lib/pptxParser";

export interface SlideAllocation {
  slide: ParsedSlide;
  /** Key used by the dashboard's sectionItems (e.g. "WARM - UP") */
  section: string;
}

interface ImportPresentationModalProps {
  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;
  handleImportSlides: (
    presentation: ParsedPresentation,
    allocations: SlideAllocation[],
  ) => Promise<void>;
}

type Step = "select" | "review" | "slides";

const SERVICE_SECTION_OPTIONS = [
  { key: "PRE-SERVICE ITEMS", label: "PRE-SERVICE ITEMS" },
  { key: "WARM - UP", label: "WARM-UP" },
  { key: "SERVICE ITEMS", label: "SERVICE ITEMS" },
  { key: "POST SERVICE LOOP", label: "POST SERVICE LOOP" },
];

const sectionLabel = (key: string) =>
  SERVICE_SECTION_OPTIONS.find((option) => option.key === key)?.label ?? key;

const PowerPointGlyph: React.FC<{ className?: string }> = ({ className }) => (
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

const AllocateChip: React.FC<{ section?: string; className?: string }> = ({
  section,
  className = "",
}) =>
  section ? (
    <span
      className={`inline-flex items-center gap-1 rounded bg-[#8356F3]/25 border border-[#8356F3] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#d9ccff] ${className}`}>
      <Check className="w-2.5 h-2.5" />
      {sectionLabel(section)}
    </span>
  ) : (
    <span
      className={`inline-flex items-center gap-1 rounded bg-[#8356F3] px-2 py-0.5 text-[9px] font-semibold text-white ${className}`}>
      <Plus className="w-2.5 h-2.5" />
      Allocate
    </span>
  );

export const ImportPresentationModal: React.FC<
  ImportPresentationModalProps
> = ({ isImportModalOpen, setIsImportModalOpen, handleImportSlides }) => {
  const [step, setStep] = useState<Step>("select");
  const [presentation, setPresentation] = useState<ParsedPresentation | null>(
    null,
  );
  const [allocations, setAllocations] = useState<Record<number, string>>({});
  const [allocatingSlide, setAllocatingSlide] = useState<number | null>(null);
  const [pendingSection, setPendingSection] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetState = useCallback(() => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    setStep("select");
    setPresentation(null);
    setAllocations({});
    setAllocatingSlide(null);
    setPendingSection(null);
    setViewMode("grid");
    setIsParsing(false);
    setIsImporting(false);
    setIsDragOver(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!isImportModalOpen) resetState();
  }, [isImportModalOpen, resetState]);

  useEffect(() => () => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
  }, []);

  const closeModal = useCallback(() => {
    if (isImporting) return;
    setIsImportModalOpen(false);
  }, [isImporting, setIsImportModalOpen]);

  useEffect(() => {
    if (!isImportModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (allocatingSlide !== null) {
        setAllocatingSlide(null);
        setPendingSection(null);
      } else {
        closeModal();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isImportModalOpen, allocatingSlide, closeModal]);

  const handleFile = async (file: File) => {
    if (!/\.(pptx|ppt)$/i.test(file.name)) {
      setError("Please choose a PowerPoint file (.pptx or .ppt).");
      return;
    }
    setError(null);
    setIsParsing(true);
    try {
      const parsed = await parsePptx(file);
      if (parsed.slides.length === 0) {
        throw new Error("This presentation doesn't contain any slides.");
      }
      setPresentation(parsed);
      setAllocations({});
      setStep("review");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to read the presentation.",
      );
    } finally {
      setIsParsing(false);
    }
  };

  const openFilePicker = () => {
    if (!isParsing) fileInputRef.current?.click();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !isParsing) handleFile(file);
  };

  const openAllocation = (slideNumber: number) => {
    setPendingSection(allocations[slideNumber] ?? SERVICE_SECTION_OPTIONS[0].key);
    setAllocatingSlide(slideNumber);
  };

  const chooseSection = (sectionKey: string) => {
    if (allocatingSlide === null) return;
    const slideNumber = allocatingSlide;
    setPendingSection(sectionKey);
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      setAllocations((prev) => ({ ...prev, [slideNumber]: sectionKey }));
      setAllocatingSlide(null);
      setPendingSection(null);
    }, 180);
  };

  const allocatedCount = Object.keys(allocations).length;

  const importSlides = async () => {
    if (!presentation || allocatedCount === 0) return;
    const picked: SlideAllocation[] = presentation.slides
      .filter((slide) => allocations[slide.number])
      .map((slide) => ({ slide, section: allocations[slide.number] }));

    setError(null);
    setIsImporting(true);
    try {
      await handleImportSlides(presentation, picked);
      setIsImportModalOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import the slides.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  if (!isImportModalOpen) return null;

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".pptx,.ppt"
      className="hidden"
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) handleFile(file);
      }}
    />
  );

  /* ---------- Steps 1 & 2: choose file, then confirm it ---------- */
  if (step !== "slides" || !presentation) {
    const hasFile = step === "review" && presentation;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
        <div className="bg-gradient-to-b from-[#2a1f3d] to-[#1a0f2e] border border-[#8356F3]/30 rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-[#8356F3]/20 border border-[#8356F3]/30 mb-6">
              <Upload className="w-8 h-8 text-[#8356F3]" />
            </div>

            <h3 className="text-xl font-semibold text-white mb-3">
              Import Presentation
            </h3>

            <p className="text-gray-300 mb-6">
              Upload a PowerPoint file (.pptx or .ppt) to import as a new
              Q-worship presentation.
            </p>

            <div
              role="button"
              tabIndex={0}
              onClick={openFilePicker}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openFilePicker();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 mb-6 transition-colors cursor-pointer ${
                isDragOver || hasFile
                  ? "border-[#8356F3] bg-[#8356F3]/10"
                  : "border-[#8356F3]/50 hover:border-[#8356F3]"
              }`}>
              {hasFile && presentation ? (
                <div className="text-center">
                  <PowerPointGlyph className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-white font-semibold mb-1">
                    {presentation.fileName}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {presentation.slides.length}{" "}
                    {presentation.slides.length === 1 ? "Slide" : "Slides"}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <PowerPointGlyph className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-white font-medium mb-2">
                    Click to select file
                  </p>
                  <p className="text-gray-400 text-sm">
                    or drag and drop your PowerPoint file here
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Supports .pptx and .ppt files
                  </p>
                </div>
              )}
            </div>

            {isParsing && (
              <div className="mb-6">
                <div className="flex items-center justify-center space-x-2 text-[#8356F3]">
                  <div className="w-4 h-4 border-2 border-[#8356F3] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Reading presentation...</span>
                </div>
              </div>
            )}

            {error && (
              <p className="mb-6 text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <div className="flex space-x-4">
              <button
                onClick={closeModal}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors font-medium">
                Cancel
              </button>
              {hasFile ? (
                <button
                  onClick={() => setStep("slides")}
                  className="flex-1 px-6 py-3 bg-[#8356F3] hover:bg-[#7C3AED] text-white rounded-lg transition-colors font-medium">
                  Add Slides
                </button>
              ) : (
                <button
                  onClick={openFilePicker}
                  disabled={isParsing}
                  className="flex-1 px-6 py-3 bg-[#8356F3] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium">
                  Browse Files
                </button>
              )}
            </div>
          </div>
        </div>
        {hiddenInput}
      </div>
    );
  }

  /* ---------- Step 3: allocate slides to service sections ---------- */
  const total = presentation.slides.length;

  // Health check: which slides come across exactly as authored, which have caveats
  const warningsOf = (slide: ParsedSlide) =>
    slide.health.notes.filter((note) => note.level === "warning");
  const slidesWithWarnings = presentation.slides.filter(
    (slide) => slide.health.status !== "ready" && warningsOf(slide).length > 0,
  ).length;
  const tooltipFor = (slide: ParsedSlide) =>
    [
      slide.title || `Slide ${slide.number}`,
      ...warningsOf(slide).map((note) => `⚠ ${note.message}`),
    ].join("\n");

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
      <div className="relative bg-[#2a1f3d] border border-[#8356F3]/30 rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] mx-4 flex flex-col">
        <button
          onClick={closeModal}
          disabled={isImporting}
          aria-label="Close"
          className="absolute top-4 right-4 p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50">
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-10 pt-10 pb-6">
          <h2 className="text-4xl font-bold text-white mb-3">
            Your Presentation Slides
          </h2>
          <p className="text-gray-200 text-sm max-w-xl leading-relaxed">
            We have successfully loaded {total} slides from{" "}
            <span className="text-[#8356F3] font-semibold">
              {presentation.fileName}
            </span>{" "}
            . You can allocate the slides below to the respective service items.
          </p>
          <p
            className={`mt-3 inline-flex items-center gap-1.5 text-xs ${
              slidesWithWarnings === 0 ? "text-emerald-300" : "text-amber-300"
            }`}>
            {slidesWithWarnings === 0 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Health check: all {total} slides can be imported as they appear in
                PowerPoint.
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                Health check: {total - slidesWithWarnings} of {total} slides import
                exactly. Hover the warning on a slide to see what differs.
              </>
            )}
          </p>

          <div className="flex items-start justify-between mt-14">
            <div>
              <h3 className="text-3xl font-bold text-white mb-2">Slides</h3>
              <p className="text-gray-300 text-sm">
                Please hover on any slide below to allocate it to the
                respective service section.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-[#8356F3] p-1">
              <button
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                className={`p-1 rounded transition-colors ${
                  viewMode === "grid"
                    ? "bg-[#8356F3]/30 text-[#8356F3]"
                    : "text-[#8356F3]/60 hover:text-[#8356F3]"
                }`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                className={`p-1 rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-[#8356F3]/30 text-[#8356F3]"
                    : "text-[#8356F3]/60 hover:text-[#8356F3]"
                }`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-12">
              {presentation.slides.map((slide) => {
                const section = allocations[slide.number];
                return (
                  <div
                    key={slide.number}
                    title={tooltipFor(slide)}
                    onClick={() => openAllocation(slide.number)}
                    className={`group cursor-pointer rounded-lg border p-1 transition-colors ${
                      section
                        ? "border-[#8356F3]/70"
                        : "border-transparent hover:border-[#8356F3]/70"
                    }`}>
                    <div className="relative h-20 rounded-md bg-[#3a3147] flex items-center justify-center">
                      <PowerPointGlyph className="w-9 h-9" />
                      {warningsOf(slide).length > 0 && (
                        <AlertTriangle
                          aria-label="Some of this slide can't be reproduced exactly"
                          className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-amber-300"
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-2 px-0.5">
                      <span className="text-sm font-medium text-gray-200">
                        Slide {slide.number}
                      </span>
                      {section ? (
                        <AllocateChip section={section} />
                      ) : (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openAllocation(slide.number);
                          }}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                          <AllocateChip />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-12 space-y-2">
              {presentation.slides.map((slide) => {
                const section = allocations[slide.number];
                return (
                  <div
                    key={slide.number}
                    onClick={() => openAllocation(slide.number)}
                    className={`flex items-center gap-4 rounded-md border bg-[#3a3147]/60 hover:bg-[#3a3147] px-3 py-2.5 cursor-pointer transition-colors ${
                      section ? "border-[#8356F3]/70" : "border-transparent"
                    }`}>
                    <div className="w-12 h-10 rounded bg-[#3a3147] flex items-center justify-center shrink-0">
                      <PowerPointGlyph className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-100">
                        Slide {slide.number}
                      </div>
                      {slide.title && (
                        <div className="text-xs text-gray-400 truncate">
                          {slide.title}
                        </div>
                      )}
                      {warningsOf(slide).length > 0 && (
                        <div
                          className="flex items-center gap-1 text-[11px] text-amber-300 truncate"
                          title={tooltipFor(slide)}>
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {warningsOf(slide)[0].message}
                        </div>
                      )}
                    </div>
                    {section ? (
                      <AllocateChip section={section} />
                    ) : (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          openAllocation(slide.number);
                        }}>
                        <AllocateChip />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-4 px-10 py-5">
          {error && (
            <p className="text-sm text-red-400 mr-auto" role="alert">
              {error}
            </p>
          )}
          <button
            onClick={importSlides}
            disabled={allocatedCount === 0 || isImporting}
            title={
              allocatedCount === 0
                ? "Allocate at least one slide to a service section"
                : undefined
            }
            className="inline-flex items-center gap-2 px-8 py-2.5 bg-[#8356F3] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors">
            {isImporting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {isImporting ? "Importing..." : "Import Slides"}
          </button>
        </div>
      </div>

      {/* Service section picker (design: radio list over a dimmed panel) */}
      {allocatingSlide !== null && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/60"
          onClick={() => {
            setAllocatingSlide(null);
            setPendingSection(null);
          }}>
          <div
            role="dialog"
            aria-label={`Allocate slide ${allocatingSlide}`}
            onClick={(event) => event.stopPropagation()}
            className="bg-[#271c3a] border border-[#8356F3]/20 rounded-lg shadow-2xl px-7 py-8 w-full max-w-md mx-4">
            <h4 className="text-[#8356F3] font-semibold text-base mb-6">
              Add slide {allocatingSlide} to a service section below
            </h4>
            <div className="space-y-3" role="radiogroup">
              {SERVICE_SECTION_OPTIONS.map((option) => {
                const selected = pendingSection === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => chooseSection(option.key)}
                    className="w-full flex items-center gap-4 rounded-md bg-[#3a3147] hover:bg-[#443a54] px-4 py-3.5 text-left transition-colors">
                    <span
                      className={`flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 ${
                        selected ? "border-[#8356F3]" : "border-white"
                      }`}>
                      {selected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#8356F3]"></span>
                      )}
                    </span>
                    <span className="text-sm font-bold tracking-wide text-white">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {hiddenInput}
    </div>
  );
};
