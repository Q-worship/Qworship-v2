import { useEffect, useLayoutEffect, useRef } from "react";
import { ArrowDown, ArrowUp, Heading2, Pilcrow, Plus, Quote, Trash2 } from "lucide-react";
import type { Manuscript, ManuscriptBlock } from "./types";

interface Props {
  value: Manuscript;
  onChange: (next: Manuscript) => void;
}

const inputClass =
  "w-full rounded-md border border-white/10 bg-[#120a22] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-purple-400 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400";

const BLOCK_ICONS = { heading: Heading2, paragraph: Pilcrow, quote: Quote } as const;

const fitHeight = (el: HTMLTextAreaElement) => {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

/**
 * Auto-growing textarea so long paragraphs never need an inner scrollbar.
 * Re-fits when its width changes too: a height measured before layout
 * settles (narrower box → more lines) would otherwise leave a tall gap.
 */
function GrowingTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (ref.current) fitHeight(ref.current);
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== width) {
        width = el.clientWidth;
        fitHeight(el);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      onInput={(e) => fitHeight(e.currentTarget)}
      className={`${inputClass} resize-none overflow-hidden leading-relaxed ${className ?? ""}`}
    />
  );
}

const linesToList = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

export function ManuscriptEditor({ value, onChange }: Props) {
  const set = <K extends keyof Manuscript>(key: K, v: Manuscript[K]) => onChange({ ...value, [key]: v });

  const updateBlock = (i: number, block: ManuscriptBlock) =>
    set("blocks", value.blocks.map((b, j) => (j === i ? block : b)));
  const removeBlock = (i: number) => set("blocks", value.blocks.filter((_, j) => j !== i));
  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.blocks.length) return;
    const blocks = [...value.blocks];
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    set("blocks", blocks);
  };
  const insertBlock = (i: number, type: ManuscriptBlock["type"]) => {
    const blocks = [...value.blocks];
    blocks.splice(i, 0, { type, text: "" } as ManuscriptBlock);
    set("blocks", blocks);
  };
  const changeType = (i: number, type: ManuscriptBlock["type"]) => {
    const b = value.blocks[i];
    updateBlock(i, type === "quote" ? { type, text: b.text, reference: b.type === "quote" ? b.reference : "" } : { type, text: b.text });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <div>
          <label className={labelClass}>Title</label>
          <input className={`${inputClass} text-base font-semibold`} value={value.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Main scripture</label>
          <input
            className={inputClass}
            value={value.mainScripture ?? ""}
            placeholder="e.g. Philippians 4:4-7"
            onChange={(e) => set("mainScripture", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Summary</label>
        <GrowingTextarea value={value.summary} onChange={(e) => set("summary", e.target.value)} />
      </div>

      <div>
        <label className={labelClass}>Manuscript</label>
        <div className="space-y-2">
          {value.blocks.map((block, i) => {
            const Icon = BLOCK_ICONS[block.type];
            return (
              <div key={i} className="group flex gap-2 rounded-lg border border-transparent p-1 hover:border-white/10">
                <div className="flex w-8 shrink-0 flex-col items-center gap-1 pt-2 text-gray-500">
                  <button
                    type="button"
                    title={`${block.type === "quote" ? "Scripture" : block.type[0].toUpperCase() + block.type.slice(1)} — click to change type`}
                    onClick={() => changeType(i, block.type === "paragraph" ? "heading" : block.type === "heading" ? "quote" : "paragraph")}
                    className="rounded p-1 hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <GrowingTextarea
                    value={block.text}
                    onChange={(e) => updateBlock(i, { ...block, text: e.target.value })}
                    className={
                      block.type === "heading"
                        ? "text-base font-semibold"
                        : block.type === "quote"
                          ? "border-l-2 border-l-purple-400 italic"
                          : ""
                    }
                    placeholder={block.type === "heading" ? "Heading" : block.type === "quote" ? "Scripture text" : "Paragraph"}
                  />
                  {block.type === "quote" && (
                    <input
                      className={`${inputClass} max-w-xs py-1 text-xs`}
                      value={block.reference ?? ""}
                      placeholder="Reference, e.g. John 3:16"
                      onChange={(e) => updateBlock(i, { ...block, reference: e.target.value })}
                    />
                  )}
                </div>
                <div className="flex shrink-0 items-start gap-0.5 pt-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <button type="button" title="Move up" onClick={() => moveBlock(i, -1)} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" title="Move down" onClick={() => moveBlock(i, 1)} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" title="Insert paragraph below" onClick={() => insertBlock(i + 1, "paragraph")} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" title="Delete block" onClick={() => removeBlock(i)} className="rounded p-1 text-gray-400 hover:bg-red-500/20 hover:text-red-300">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          <div className="flex gap-2 pl-10">
            {(["paragraph", "heading", "quote"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => insertBlock(value.blocks.length, type)}
                className="rounded-md border border-dashed border-white/15 px-3 py-1 text-xs text-gray-400 hover:border-purple-400 hover:text-white"
              >
                + {type === "quote" ? "Scripture" : type[0].toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Key points (one per line)</label>
          <GrowingTextarea
            defaultValue={value.keyPoints.join("\n")}
            onBlur={(e) => set("keyPoints", linesToList(e.target.value))}
          />
        </div>
        <div>
          <label className={labelClass}>Discussion questions (one per line)</label>
          <GrowingTextarea
            defaultValue={value.discussionQuestions.join("\n")}
            onBlur={(e) => set("discussionQuestions", linesToList(e.target.value))}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Scripture references (comma separated)</label>
        <input
          className={inputClass}
          defaultValue={value.scriptureReferences.join(", ")}
          onBlur={(e) => set("scriptureReferences", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        />
      </div>
    </div>
  );
}
