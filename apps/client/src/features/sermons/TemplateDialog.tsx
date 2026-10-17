import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, RotateCcw, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage, saveManuscriptTemplate, sermonKeys } from "./api";
import { DEFAULT_TEMPLATE, SECTION_NAMES, TEMPLATE_FONTS, renderManuscriptHtml, type ManuscriptMeta } from "./manuscriptTemplate";
import type { LabelledSection, Manuscript, ManuscriptSection, ManuscriptTemplate, TemplateFont } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saved: ManuscriptTemplate;
  manuscript: Manuscript;
  meta: ManuscriptMeta;
}

const inputClass =
  "w-full rounded-md border border-white/10 bg-[#120a22] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-purple-400 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400";
const btn =
  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

const ACCENT_PRESETS = ["#7c5cbf", "#1e3a8a", "#0f766e", "#15803d", "#b45309", "#b91c1c", "#9d174d", "#1f2937"];
const LABELLED: LabelledSection[] = ["summary", "keyPoints", "discussionQuestions", "scriptureReferences"];

/** Downscale to a sensible print size so the template stays small enough to store inline. */
async function readLogo(file: File): Promise<string> {
  if (file.type === "image/svg+xml") {
    if (file.size > 300_000) throw new Error("SVG logos must be under 300 KB");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 600 / bitmap.width, 300 / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.9);
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-md border border-white/10 bg-[#120a22] p-0.5">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded px-2.5 py-1 text-xs ${value === v ? "bg-purple-600 text-white" : "text-gray-300 hover:text-white"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function FontSelect({ value, onChange }: { value: TemplateFont; onChange: (v: TemplateFont) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as TemplateFont)} className={inputClass}>
      {(Object.keys(TEMPLATE_FONTS) as TemplateFont[]).map((f) => (
        <option key={f} value={f}>
          {TEMPLATE_FONTS[f].label}
        </option>
      ))}
    </select>
  );
}

export function TemplateDialog({ open, onOpenChange, saved, manuscript, meta }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(saved);
  const fileRef = useRef<HTMLInputElement>(null);

  // Start from the saved template each time the dialog opens (not on refetch,
  // which would clobber edits in progress).
  useEffect(() => {
    if (open) setDraft(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof ManuscriptTemplate>(key: K, v: ManuscriptTemplate[K]) => setDraft((d) => ({ ...d, [key]: v }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const previewHtml = useMemo(() => renderManuscriptHtml(manuscript, meta, draft), [manuscript, meta.preacher, meta.serviceDate, draft]);

  const save = useMutation({
    mutationFn: () => saveManuscriptTemplate(draft),
    onSuccess: () => {
      queryClient.setQueryData(sermonKeys.template, draft);
      toast({ title: "Manuscript style saved", description: "It applies to all your sermons." });
      onOpenChange(false);
    },
    onError: (err) => toast({ title: "Could not save style", description: errorMessage(err), variant: "destructive" }),
  });

  const onLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      set("logo", await readLogo(file));
    } catch (err) {
      toast({ title: "Could not use that image", description: errorMessage(err), variant: "destructive" });
    }
  };

  const close = (next: boolean) => {
    if (!next && dirty && !window.confirm("Discard your unsaved style changes?")) return;
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex h-[90vh] max-w-6xl flex-col gap-0 border-white/10 bg-[#1f1438] p-0 text-white">
        <DialogHeader className="border-b border-white/10 px-6 py-4">
          <DialogTitle>Manuscript style</DialogTitle>
          <p className="text-sm text-gray-400">Applies to the preview, print/PDF, HTML and copied text of every sermon.</p>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <div className="w-80 shrink-0 space-y-6 overflow-y-auto border-r border-white/10 px-5 py-5">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Branding</h3>
              <div>
                <label className={labelClass}>Church name</label>
                <input
                  className={inputClass}
                  value={draft.churchName}
                  placeholder="e.g. Grace Community Church"
                  onChange={(e) => set("churchName", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Logo</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    onLogo(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {draft.logo ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 flex-1 items-center justify-center rounded-md bg-white p-2">
                      <img src={draft.logo} alt="Logo" className="max-h-full max-w-full object-contain" />
                    </div>
                    <button type="button" title="Replace logo" onClick={() => fileRef.current?.click()} className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
                      <ImagePlus className="h-4 w-4" />
                    </button>
                    <button type="button" title="Remove logo" onClick={() => set("logo", undefined)} className="rounded p-1.5 text-gray-400 hover:bg-red-500/20 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-white/15 py-3 text-sm text-gray-400 hover:border-purple-400 hover:text-white"
                  >
                    <ImagePlus className="h-4 w-4" /> Upload logo
                  </button>
                )}
              </div>
              {draft.logo && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Logo size</span>
                  <Segmented value={draft.logoSize} options={[["small", "S"], ["medium", "M"], ["large", "L"]]} onChange={(v) => set("logoSize", v)} />
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Header</span>
                <Segmented value={draft.headerAlign} options={[["center", "Centered"], ["left", "Left"]]} onChange={(v) => set("headerAlign", v)} />
              </div>
              <div>
                <label className={labelClass}>Accent colour</label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {ACCENT_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      onClick={() => set("accentColor", c)}
                      className={`h-6 w-6 rounded-full border-2 ${draft.accentColor.toLowerCase() === c ? "border-white" : "border-transparent"}`}
                      style={{ background: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={draft.accentColor}
                    title="Custom colour"
                    onChange={(e) => set("accentColor", e.target.value)}
                    className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Typography</h3>
              <div>
                <label className={labelClass}>Headings</label>
                <FontSelect value={draft.headingFont} onChange={(v) => set("headingFont", v)} />
              </div>
              <div>
                <label className={labelClass}>Body text</label>
                <FontSelect value={draft.bodyFont} onChange={(v) => set("bodyFont", v)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Text size</span>
                <Segmented value={draft.textSize} options={[["small", "Small"], ["medium", "Medium"], ["large", "Large"]]} onChange={(v) => set("textSize", v)} />
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Sections</h3>
              <p className="text-xs text-gray-500">Untick a section to leave it out. Rename headings to match your church.</p>
              {(Object.keys(SECTION_NAMES) as ManuscriptSection[]).map((s) => {
                const labelled = (LABELLED as string[]).includes(s) ? (s as LabelledSection) : null;
                return (
                  <div key={s} className="space-y-1 rounded-md border border-white/5 p-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
                      <input
                        type="checkbox"
                        checked={draft.show[s]}
                        onChange={(e) => set("show", { ...draft.show, [s]: e.target.checked })}
                        className="accent-purple-500"
                      />
                      {SECTION_NAMES[s]}
                    </label>
                    {labelled && draft.show[s] && (
                      <input
                        className={`${inputClass} py-1 text-xs`}
                        value={draft.labels[labelled]}
                        placeholder={labelled === "summary" ? "No heading" : DEFAULT_TEMPLATE.labels[labelled]}
                        onChange={(e) => set("labels", { ...draft.labels, [labelled]: e.target.value })}
                      />
                    )}
                  </div>
                );
              })}
            </section>

            <section>
              <label className={labelClass}>Footer</label>
              <textarea
                className={`${inputClass} h-20 resize-y`}
                value={draft.footerText}
                placeholder="e.g. www.yourchurch.org · Sundays at 10am"
                onChange={(e) => set("footerText", e.target.value)}
              />
            </section>
          </div>

          <div className="min-w-0 flex-1 bg-[#120a22] p-4">
            <iframe title="Manuscript style preview" srcDoc={previewHtml} className="h-full w-full rounded-lg bg-white" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-6 py-3">
          <button
            type="button"
            className={`${btn} text-gray-300 hover:bg-white/10`}
            onClick={() => window.confirm("Reset to the default style? Your logo and church name will be kept.") &&
              setDraft({ ...DEFAULT_TEMPLATE, churchName: draft.churchName, logo: draft.logo })}
          >
            <RotateCcw className="h-4 w-4" /> Reset to default
          </button>
          <div className="flex gap-2">
            <button type="button" className={`${btn} border border-white/10 text-gray-200 hover:bg-white/10`} onClick={() => close(false)}>
              Cancel
            </button>
            <button type="button" className={`${btn} bg-purple-600 text-white hover:bg-purple-500`} disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save style
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
