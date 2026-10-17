import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileText,
  Loader2,
  Mic,
  Plus,
  Printer,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Pencil,
  RefreshCw,
  Palette,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  createSermon,
  deleteSermon,
  errorMessage,
  generateManuscript,
  getManuscriptTemplate,
  getSermon,
  listSermons,
  saveManuscript,
  selectDraft,
  sermonKeys,
  updateSermon,
} from "./api";
import { ManuscriptEditor } from "./ManuscriptEditor";
import { DEFAULT_TEMPLATE, renderManuscriptHtml, renderManuscriptText } from "./manuscriptTemplate";
import { TemplateDialog } from "./TemplateDialog";
import type { Manuscript, ManuscriptProvider, ManuscriptStyle, SermonDetail, SermonSummary } from "./types";

type Tab = "manuscript" | "preview" | "transcript" | "drafts";

const btn =
  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btn} bg-purple-600 text-white hover:bg-purple-500`;
const btnGhost = `${btn} border border-white/10 text-gray-200 hover:bg-white/10`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/** Readable name until the sermon has a real title, e.g. "Sermon · 16 Oct, 08:40". */
const fallbackName = (s: Pick<SermonSummary, "serviceDate" | "createdAt">) =>
  `Sermon · ${new Date(s.createdAt ?? s.serviceDate).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
const displayName = (s: SermonSummary) => s.title || s.manuscriptTitle || fallbackName(s);

const PROVIDER_LABELS: Record<ManuscriptProvider, string> = { openai: "OpenAI", groq: "Groq" };

function StatusBadge({ sermon }: { sermon: SermonSummary }) {
  if (sermon.status === "recording" && Date.now() - new Date(sermon.updatedAt).getTime() < 2 * 60_000)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] text-red-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> Recording
      </span>
    );
  if (sermon.approvedAt)
    return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">Approved</span>;
  const map = {
    none: ["Transcript", "bg-white/10 text-gray-300"],
    generating: ["Generating…", "bg-purple-500/20 text-purple-200"],
    ready: ["Draft ready", "bg-sky-500/15 text-sky-300"],
    failed: ["Failed", "bg-red-500/15 text-red-300"],
  } as const;
  const [label, cls] = map[sermon.manuscriptStatus];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] ${cls}`}>{label}</span>;
}

function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function printHtml(html: string) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0";
  document.body.appendChild(frame);
  frame.srcdoc = html;
  frame.onload = async () => {
    // Template web fonts can still be loading after onload; wait so the PDF uses them.
    await frame.contentDocument?.fonts.ready;
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  };
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sermon";

// ─── Paste transcript dialog ────────────────────────────────────────────────

function NewSermonDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [preacher, setPreacher] = useState("");
  const [transcript, setTranscript] = useState("");
  const mutation = useMutation({
    mutationFn: () => createSermon({ transcript, title: title || undefined, preacher: preacher || undefined }),
    onSuccess: ({ id }) => {
      setTitle("");
      setPreacher("");
      setTranscript("");
      onOpenChange(false);
      onCreated(id);
    },
    onError: (err) => toast({ title: "Could not add sermon", description: errorMessage(err), variant: "destructive" }),
  });
  const field = "w-full rounded-md border border-white/10 bg-[#120a22] px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-white/10 bg-[#1f1438] text-white">
        <DialogHeader>
          <DialogTitle>Add a sermon transcript</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-400">
          Sermons are captured automatically while Hands-free Bible is on. Use this for a sermon recorded somewhere else.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={field} placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className={field} placeholder="Preacher (optional)" value={preacher} onChange={(e) => setPreacher(e.target.value)} />
        </div>
        <textarea
          className={`${field} h-64 resize-y`}
          placeholder="Paste the transcript here…"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button className={btnGhost} onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button className={btnPrimary} disabled={!transcript.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Add sermon
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail panel ───────────────────────────────────────────────────────────

function SermonDetailPanel({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("manuscript");
  const [provider, setProvider] = useState<ManuscriptProvider>("openai");
  const [style, setStyle] = useState<ManuscriptStyle>("readable");
  const [working, setWorking] = useState<Manuscript | null>(null);
  const [dirty, setDirty] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [styleOpen, setStyleOpen] = useState(false);

  const { data: sermon, isLoading } = useQuery({
    queryKey: sermonKeys.detail(id),
    queryFn: () => getSermon(id),
    refetchInterval: (q) => {
      const s = q.state.data as SermonDetail | undefined;
      return s && (s.manuscriptStatus === "generating" || s.status === "recording") ? 3000 : false;
    },
  });

  // Load the server's working copy whenever it changes underneath us (new
  // draft, switched draft) — but never clobber unsaved edits.
  const serverVersion = `${sermon?.activeDraftId ?? ""}:${sermon?.drafts.length ?? 0}`;
  useEffect(() => {
    if (!sermon?.manuscript || dirty) return;
    setWorking(sermon.manuscript);
    setEditorKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, serverVersion]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: sermonKeys.detail(id) });
    queryClient.invalidateQueries({ queryKey: sermonKeys.all });
  };

  // Header fields save on blur; a failure must be visible, not silent.
  const saveField = (patch: Parameters<typeof updateSermon>[1]) =>
    updateSermon(id, patch)
      .then(refresh)
      .catch((err) => toast({ title: "Could not save", description: errorMessage(err), variant: "destructive" }));

  const generate = useMutation({
    mutationFn: () => generateManuscript(id, provider, style),
    onSuccess: refresh,
    onError: (err) => toast({ title: "Could not generate manuscript", description: errorMessage(err), variant: "destructive" }),
  });

  const save = useMutation({
    mutationFn: (approve?: boolean) => saveManuscript(id, working!, approve),
    onSuccess: (_, approve) => {
      setDirty(false);
      refresh();
      toast({ title: approve ? "Manuscript approved" : "Manuscript saved" });
    },
    onError: (err) => toast({ title: "Could not save", description: errorMessage(err), variant: "destructive" }),
  });

  const switchDraft = useMutation({
    mutationFn: (draftId: string) => selectDraft(id, draftId),
    onSuccess: () => {
      setDirty(false);
      refresh();
      setTab("manuscript");
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteSermon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sermonKeys.all });
      onDeleted();
    },
  });

  const { data: template = DEFAULT_TEMPLATE } = useQuery({
    queryKey: sermonKeys.template,
    queryFn: getManuscriptTemplate,
    staleTime: Infinity,
  });

  const meta = { preacher: sermon?.preacher, serviceDate: sermon?.serviceDate };
  const previewHtml = useMemo(
    () => (working ? renderManuscriptHtml(working, meta, template) : ""),
    [working, meta.preacher, meta.serviceDate, template]
  );

  if (isLoading || !sermon) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const generating = sermon.manuscriptStatus === "generating";
  const activeDraft = sermon.drafts.find((d) => d._id === sermon.activeDraftId);
  const lowRetention = activeDraft && activeDraft.stats.retention < 0.6;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <label className="group/title -mx-2 flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white/5 focus-within:bg-white/5">
              <input
                key={`title-${id}`}
                defaultValue={sermon.title ?? ""}
                placeholder={`${fallbackName(sermon)} — click to name it`}
                aria-label="Sermon title"
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                onBlur={(e) => {
                  const title = e.target.value.trim();
                  if (title !== (sermon.title ?? "")) saveField({ title });
                }}
                className="w-full bg-transparent text-xl font-semibold text-white placeholder:font-normal placeholder:text-gray-500 focus:outline-none"
              />
              <Pencil className="h-4 w-4 shrink-0 text-gray-500 group-hover/title:text-gray-300" />
            </label>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
              <input
                key={`preacher-${id}`}
                defaultValue={sermon.preacher ?? ""}
                placeholder="Add preacher"
                onBlur={(e) => e.target.value !== (sermon.preacher ?? "") && saveField({ preacher: e.target.value })}
                className="w-40 rounded bg-transparent px-1 hover:bg-white/5 focus:bg-white/5 focus:outline-none"
              />
              <input
                key={`date-${id}`}
                type="date"
                defaultValue={sermon.serviceDate.slice(0, 10)}
                onChange={(e) => e.target.value && saveField({ serviceDate: e.target.value })}
                className="rounded bg-transparent px-1 [color-scheme:dark] hover:bg-white/5 focus:outline-none"
              />
              <span>{sermon.wordCount.toLocaleString()} words</span>
              <StatusBadge sermon={sermon} />
            </div>
            {sermon.source === "live" && sermon.status === "recording" && (
              <p className="text-xs text-gray-500">
                Saving as you speak. The recording ends when Hands-free Bible is switched off or you leave the live console; turning it back on
                within 15 minutes continues this sermon.
              </p>
            )}
          </div>
          <button
            className={`${btnGhost} text-red-300 hover:bg-red-500/15`}
            onClick={() => window.confirm("Delete this sermon and its manuscript?") && remove.mutate()}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Generate bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-white/5 p-2">
          <Sparkles className="ml-1 h-4 w-4 text-purple-300" />
          <span className="text-sm text-gray-300">{sermon.drafts.length ? "Regenerate with" : "Create manuscript with"}</span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as ManuscriptProvider)}
            className="rounded-md border border-white/10 bg-[#120a22] px-2 py-1 text-sm text-white"
          >
            <option value="openai">OpenAI</option>
            <option value="groq">Groq</option>
          </select>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as ManuscriptStyle)}
            className="rounded-md border border-white/10 bg-[#120a22] px-2 py-1 text-sm text-white"
          >
            <option value="readable">Readable (removes crowd prompts)</option>
            <option value="verbatim">Close to spoken</option>
          </select>
          <button className={btnPrimary} disabled={generating || generate.isPending} onClick={() => generate.mutate()}>
            {generating || generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generating…" : "Generate"}
          </button>
          {generating && <span className="text-xs text-gray-400">This usually takes under a minute.</span>}
          {sermon.manuscriptStatus === "failed" && (
            <span className="text-xs text-red-300">Last attempt failed: {sermon.manuscriptError}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-6">
        <div className="flex gap-1">
          {(["manuscript", "preview", "transcript", "drafts"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-3 py-2.5 text-sm capitalize ${
                tab === t ? "border-purple-400 text-white" : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {t}
              {t === "drafts" && sermon.drafts.length > 0 && <span className="ml-1 text-xs text-gray-500">{sermon.drafts.length}</span>}
            </button>
          ))}
        </div>
        {working && (
          <div className="flex flex-wrap gap-2 py-2">
            <button className={btnGhost} disabled={!dirty || save.isPending} onClick={() => save.mutate(undefined)}>
              <Save className="h-4 w-4" /> {dirty ? "Save" : "Saved"}
            </button>
            <button
              className={btnGhost}
              onClick={() => {
                navigator.clipboard.writeText(renderManuscriptText(working, meta, template));
                toast({ title: "Copied as text", description: "Paste it into WhatsApp, email or your church app." });
              }}
            >
              <ClipboardCopy className="h-4 w-4" /> Copy
            </button>
            <button className={btnGhost} onClick={() => setStyleOpen(true)}>
              <Palette className="h-4 w-4" /> Customize
            </button>
            <button className={btnGhost} onClick={() => printHtml(previewHtml)}>
              <Printer className="h-4 w-4" /> Print / PDF
            </button>
            <button className={btnGhost} onClick={() => downloadFile(`${slugify(working.title)}.html`, previewHtml, "text/html")}>
              <Download className="h-4 w-4" /> HTML
            </button>
            {sermon.approvedAt && !dirty ? (
              <button className={`${btn} bg-emerald-600/20 text-emerald-300`} onClick={() => save.mutate(false)}>
                <CheckCircle2 className="h-4 w-4" /> Approved
              </button>
            ) : (
              <button className={`${btn} bg-emerald-600 text-white hover:bg-emerald-500`} disabled={save.isPending} onClick={() => save.mutate(true)}>
                <CheckCircle2 className="h-4 w-4" /> Approve
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {tab === "manuscript" &&
          (working ? (
            <>
              {lowRetention && (
                <div className="mb-4 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
                  This draft kept only {Math.round(activeDraft!.stats.retention * 100)}% of the spoken words. The AI may have
                  shortened parts of the sermon. Compare it with the transcript before approving.
                </div>
              )}
              <ManuscriptEditor
                key={editorKey}
                value={working}
                onChange={(m) => {
                  setWorking(m);
                  setDirty(true);
                }}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
              <FileText className="mb-3 h-10 w-10 text-gray-600" />
              <p className="font-medium text-gray-200">No manuscript yet</p>
              <p className="mt-1 max-w-sm text-sm">
                Generate one above. The AI cleans up the transcript and adds headings, scripture quotes, key points and discussion questions.
                Nothing is sent to anyone until you approve and share it.
              </p>
            </div>
          ))}

        {tab === "preview" &&
          (working ? (
            <iframe title="Manuscript preview" srcDoc={previewHtml} className="h-full min-h-[70vh] w-full rounded-lg bg-white" />
          ) : (
            <p className="text-gray-400">Generate a manuscript to see the preview.</p>
          ))}

        {tab === "transcript" && (
          <div className="mx-auto max-w-3xl">
            {sermon.references.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {sermon.references.map((r, i) => (
                  <span key={i} className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs text-purple-200">
                    {r.label}
                  </span>
                ))}
              </div>
            )}
            {sermon.segments.length === 0 ? (
              <p className="text-sm text-gray-400">No transcript captured yet.</p>
            ) : (
              <ol className="space-y-1.5">
                {sermon.segments.map((seg, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    {sermon.source === "live" && (
                      <span className="w-16 shrink-0 pt-px font-mono text-xs text-gray-500">
                        {new Date(seg.at).toLocaleTimeString(undefined, { hour12: false })}
                      </span>
                    )}
                    <span className="whitespace-pre-wrap text-gray-300">{seg.text}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {tab === "drafts" && (
          <div className="space-y-2">
            {sermon.drafts.length === 0 && <p className="text-gray-400">No drafts yet.</p>}
            {[...sermon.drafts].reverse().map((d) => (
              <div key={d._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 px-4 py-3">
                <div>
                  <div className="font-medium text-white">{d.manuscript.title}</div>
                  <div className="text-xs text-gray-400">
                    {PROVIDER_LABELS[d.provider]} · {d.model} · {d.style} · {(d.stats.latencyMs / 1000).toFixed(1)}s ·{" "}
                    <span className={d.stats.retention < 0.6 ? "text-amber-300" : ""}>{Math.round(d.stats.retention * 100)}% of words kept</span> ·{" "}
                    {new Date(d.createdAt).toLocaleString()}
                  </div>
                </div>
                {d._id === sermon.activeDraftId ? (
                  <span className="text-xs text-emerald-300">Working copy</span>
                ) : (
                  <button
                    className={btnGhost}
                    disabled={switchDraft.isPending}
                    onClick={() =>
                      (!dirty || window.confirm("Discard your unsaved edits and use this draft?")) && switchDraft.mutate(d._id)
                    }
                  >
                    Use this draft
                  </button>
                )}
              </div>
            ))}
            {sermon.drafts.length > 0 && (
              <p className="pt-2 text-xs text-gray-500">
                Switching drafts replaces the working copy, including any saved edits.
              </p>
            )}
          </div>
        )}
      </div>

      {working && (
        <TemplateDialog open={styleOpen} onOpenChange={setStyleOpen} saved={template} manuscript={working} meta={meta} />
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SermonsPage() {
  const [, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: sermons = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: sermonKeys.all,
    queryFn: listSermons,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!selectedId && sermons.length) setSelectedId(sermons[0].id);
  }, [sermons, selectedId]);

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-[#1a0f2e] text-white">
      <aside className="flex w-80 shrink-0 flex-col border-r border-white/10 bg-[#160c28]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setLocation("/dashboard")} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white" title="Back to dashboard">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="font-semibold">Sermons</h1>
          </div>
          <button className={btnGhost} onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-gray-400" />}
          {isError && (
            <div className="px-5 py-10 text-center text-sm text-gray-400">
              <p className="font-medium text-red-300">Couldn't load your sermons</p>
              <p className="mt-1">{errorMessage(error)}</p>
              <button className={`${btnGhost} mt-4`} disabled={isFetching} onClick={() => refetch()}>
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Try again
              </button>
            </div>
          )}
          {!isLoading && !isError && sermons.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-gray-400">
              <Mic className="mx-auto mb-3 h-8 w-8 text-gray-600" />
              <p className="font-medium text-gray-200">No sermons yet</p>
              <p className="mt-1">Turn on Hands-free Bible during a service and the sermon transcript will appear here.</p>
            </div>
          )}
          {sermons.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`block w-full border-b border-white/5 px-4 py-3 text-left transition ${
                selectedId === s.id ? "bg-purple-500/15" : "hover:bg-white/5"
              }`}
            >
              <div className="truncate text-sm font-medium text-white">{displayName(s)}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                <span>{formatDate(s.serviceDate)}</span>
                <span>·</span>
                <span>{s.wordCount.toLocaleString()} words</span>
                <span className="ml-auto">
                  <StatusBadge sermon={s} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="h-full min-w-0 flex-1">
        {selectedId ? (
          <SermonDetailPanel key={selectedId} id={selectedId} onDeleted={() => setSelectedId(null)} />
        ) : (
          !isLoading && <div className="flex h-full items-center justify-center text-gray-500">Select a sermon</div>
        )}
      </section>

      <NewSermonDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(id) => {
          queryClient.invalidateQueries({ queryKey: sermonKeys.all });
          setSelectedId(id);
        }}
      />
    </div>
  );
}
