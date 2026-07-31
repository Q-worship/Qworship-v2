import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, FileJson, Save, Search, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { BIBLE_BOOKS_LCC } from "@/features/dashboard/data/bibleBooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BIBLE_TRANSLATIONS, type BibleVersionCode } from "@/features/dashboard/data/bibleTranslations";

const VERSIONS = BIBLE_TRANSLATIONS.map(item => item.code);

interface ManagedVerse {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

interface ImportPreview {
  summary: {
    parsed: number;
    issues: number;
    duplicates: number;
    alreadyPopulated: number;
    fillable: number;
  };
  verses: ManagedVerse[];
  issues: Array<{ line: number; value: string; reason: string }>;
  duplicates: string[];
}

export function BibleManagement() {
  const { toast } = useToast();
  const [version, setVersion] = useState<BibleVersionCode>("kjv");
  const [coverage, setCoverage] = useState<Record<string, number>>({});
  const [totalCoordinates, setTotalCoordinates] = useState(0);
  const [invalidCoordinates, setInvalidCoordinates] = useState(0);
  const [book, setBook] = useState("Genesis");
  const [chapter, setChapter] = useState("1");
  const [missingOnly, setMissingOnly] = useState(false);
  const [verses, setVerses] = useState<ManagedVerse[]>([]);
  const [editedText, setEditedText] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [importText, setImportText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importMode, setImportMode] = useState<"fill-missing" | "overwrite">("fill-missing");
  const [sourceName, setSourceName] = useState("");
  const [provenance, setProvenance] = useState("");
  const [license, setLicense] = useState("");
  const [history, setHistory] = useState<any[]>([]);

  const selectedBook = useMemo(
    () => BIBLE_BOOKS_LCC.find(item => item.name === book) || BIBLE_BOOKS_LCC[0],
    [book],
  );

  const loadCoverage = useCallback(async () => {
    const response = await apiRequest("GET", "/api/admin/bible-coverage");
    const data = await response.json();
    setCoverage(data.coverage || {});
    setTotalCoordinates(data.total || 0);
    setInvalidCoordinates(data.invalidCoordinates || 0);
  }, []);

  const loadHistory = useCallback(async () => {
    const response = await apiRequest("GET", `/api/admin/bible/import/history?version=${version}`);
    const data = await response.json();
    setHistory(data.jobs || []);
  }, [version]);

  const loadVerses = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        version, book, chapter, limit: "200",
        ...(missingOnly ? { missingOnly: "true" } : {}),
      });
      const response = await apiRequest("GET", `/api/admin/bible/verses?${query}`);
      const data = await response.json();
      setVerses(data.verses || []);
      setEditedText({});
    } catch (error: any) {
      toast({ title: "Could not load Bible verses", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [book, chapter, missingOnly, toast, version]);

  useEffect(() => { loadCoverage().catch(console.error); }, [loadCoverage]);
  useEffect(() => { loadHistory().catch(console.error); }, [loadHistory]);
  useEffect(() => { loadVerses(); }, [loadVerses]);

  const saveVerse = async (item: ManagedVerse) => {
    const text = (editedText[item.id] ?? item.text).trim();
    if (!text) return;
    try {
      await apiRequest("PATCH", "/api/admin/bible/verses", {
        version, book: item.book, chapter: item.chapter, verse: item.verse, text,
      });
      toast({ title: `${item.book} ${item.chapter}:${item.verse} saved` });
      await Promise.all([loadVerses(), loadCoverage()]);
    } catch (error: any) {
      toast({ title: "Verse was not saved", description: error.message, variant: "destructive" });
    }
  };

  const previewImport = async () => {
    try {
      const response = await apiRequest("POST", "/api/admin/bible/import/preview", {
        version, text: importText,
      });
      setPreview(await response.json());
    } catch (error: any) {
      toast({ title: "Import could not be parsed", description: error.message, variant: "destructive" });
    }
  };

  const loadImportFile = async (file?: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      setImportText(text);
      setSourceName(current => current || file.name);
      setPreview(null);
    } catch {
      toast({
        title: "File could not be read",
        description: "Choose a UTF-8 JSON or text file.",
        variant: "destructive",
      });
    }
  };

  const commitImport = async () => {
    if (!preview?.verses.length) return;
    if (importMode === "overwrite" &&
        !window.confirm(`Overwrite existing ${version.toUpperCase()} text for matching references?`)) return;
    try {
      const response = await apiRequest("POST", "/api/admin/bible/import/commit", {
        version, verses: preview.verses, mode: importMode,
        sourceName, provenance, license,
      });
      const data = await response.json();
      toast({ title: "Bible import completed", description: `${data.written} verses written.` });
      setPreview(null);
      setImportText("");
      await Promise.all([loadCoverage(), loadVerses(), loadHistory()]);
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    }
  };

  const rollbackImport = async (job: any) => {
    if (!window.confirm(`Roll back this ${String(job.version).toUpperCase()} import and restore its previous text?`)) return;
    try {
      const response = await apiRequest("POST", `/api/admin/bible/import/${job._id}/rollback`);
      const data = await response.json();
      toast({ title: "Import rolled back", description: `${data.restored} verse changes restored.` });
      await Promise.all([loadCoverage(), loadVerses(), loadHistory()]);
    } catch (error: any) {
      toast({ title: "Rollback failed", description: error.message, variant: "destructive" });
    }
  };

  const populated = coverage[version] || 0;
  const percentage = totalCoordinates ? Math.round((populated / totalCoordinates) * 1000) / 10 : 0;

  return (
    <div className="p-6 space-y-6 text-gray-900 dark:text-gray-100">
      <div>
        <h1 className="text-2xl font-bold">Bible Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Find missing translation text, correct individual verses, and safely preview imports before writing them.
        </p>
      </div>

      <Tabs value={version} onValueChange={value => { setVersion(value as typeof version); setPreview(null); }}>
        <TabsList className="flex flex-wrap h-auto">
          {VERSIONS.map(item => <TabsTrigger key={item} value={item}>{item.toUpperCase()}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Database className="w-4 h-4" /> Populated</div>
          <p className="text-2xl font-bold mt-2">{populated.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="w-4 h-4" /> Missing or empty</div>
          <p className="text-2xl font-bold mt-2">{Math.max(0, totalCoordinates - populated).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="w-4 h-4" /> Coverage</div>
          <p className="text-2xl font-bold mt-2">{percentage}%</p>
        </div>
      </div>

      {invalidCoordinates > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {invalidCoordinates.toLocaleString()} non-canonical database coordinates were excluded from coverage and exports.
          They cannot appear in Bible search or HFB projection.
        </div>
      )}

      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2"><Search className="w-5 h-5" /><h2 className="font-semibold">Browse and edit verses</h2></div>
        <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_140px_auto]">
          <Select value={book} onValueChange={value => { setBook(value); setChapter("1"); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BIBLE_BOOKS_LCC.map(item => <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={chapter} onValueChange={setChapter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Array.from({ length: selectedBook.chapters }, (_, index) => String(index + 1)).map(item => <SelectItem key={item} value={item}>Chapter {item}</SelectItem>)}</SelectContent>
          </Select>
          <label className="flex items-center gap-2 px-3 text-sm">
            <input type="checkbox" checked={missingOnly} onChange={event => setMissingOnly(event.target.checked)} />
            Missing only
          </label>
        </div>

        {isLoading ? <p className="text-sm text-muted-foreground">Loading verses…</p> : (
          <div className="space-y-3">
            {verses.map(item => (
              <div key={item.id} className="grid gap-3 md:grid-cols-[110px_1fr_auto] items-start border-t pt-3">
                <strong className="text-sm pt-2">{item.book} {item.chapter}:{item.verse}</strong>
                <Textarea
                  value={editedText[item.id] ?? item.text}
                  placeholder={`Missing ${version.toUpperCase()} text`}
                  onChange={event => setEditedText(current => ({ ...current, [item.id]: event.target.value }))}
                />
                <Button size="sm" onClick={() => saveVerse(item)} disabled={!(editedText[item.id] ?? item.text).trim()}>
                  <Save className="w-4 h-4 mr-1" /> Save
                </Button>
              </div>
            ))}
            {!verses.length && <p className="text-sm text-muted-foreground py-6 text-center">No verses match this filter.</p>}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2"><FileJson className="w-5 h-5" /><h2 className="font-semibold">Text / JSON importer</h2></div>
        <p className="text-sm text-muted-foreground">
          Paste JSON or one verse per line, for example: <code>John 3:16 For God so loved…</code>.
          Preview validates the content and never writes data.
        </p>
        <div>
          <Label htmlFor="bible-import">Source text</Label>
          <Textarea id="bible-import" className="mt-2 min-h-48 font-mono text-xs" value={importText} onChange={event => { setImportText(event.target.value); setPreview(null); }} />
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
          <Upload className="h-4 w-4" />
          Load JSON or text file
          <input
            type="file"
            accept=".json,.txt,application/json,text/plain"
            className="sr-only"
            onChange={event => {
              void loadImportFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={sourceName} onChange={event => setSourceName(event.target.value)} placeholder="Source file or publisher" />
          <Input value={provenance} onChange={event => setProvenance(event.target.value)} placeholder="Provenance / supplied by" />
          <Input value={license} onChange={event => setLicense(event.target.value)} placeholder="Licence or permission reference" />
        </div>
        <Button onClick={previewImport} disabled={!importText.trim()}>Preview import</Button>

        {preview && (
          <div className="rounded-lg border p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <span>Parsed: <strong>{preview.summary.parsed}</strong></span>
              <span>Fillable: <strong>{preview.summary.fillable}</strong></span>
              <span>Existing: <strong>{preview.summary.alreadyPopulated}</strong></span>
              <span>Issues: <strong>{preview.summary.issues}</strong></span>
              <span>Duplicates: <strong>{preview.summary.duplicates}</strong></span>
            </div>
            {preview.issues.length > 0 && (
              <div className="max-h-40 overflow-auto text-xs text-red-600 dark:text-red-400">
                {preview.issues.slice(0, 50).map(issue => <p key={`${issue.line}-${issue.value}`}>Line {issue.line}: {issue.reason} — {issue.value}</p>)}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={importMode} onValueChange={value => setImportMode(value as typeof importMode)}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fill-missing">Fill missing only (safe)</SelectItem>
                  <SelectItem value="overwrite">Overwrite matching verses</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={commitImport} disabled={!preview.verses.length || preview.issues.length > 0}>
                Commit {preview.summary.parsed} parsed verses
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Recent {version.toUpperCase()} imports</h2>
        <div className="space-y-2">
          {history.map(job => (
            <div key={job._id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm">
              <div>
                <strong>{job.sourceName || "Manual import"}</strong>
                <span className="text-muted-foreground"> · {job.mode} · {job.written || 0} written · {new Date(job.createdAt).toLocaleString()}</span>
              </div>
              <Button variant="outline" size="sm" disabled={job.status === "rolled-back"} onClick={() => rollbackImport(job)}>
                {job.status === "rolled-back" ? "Rolled back" : "Rollback"}
              </Button>
            </div>
          ))}
          {!history.length && <p className="text-sm text-muted-foreground">No imports recorded yet.</p>}
        </div>
      </section>
    </div>
  );
}
