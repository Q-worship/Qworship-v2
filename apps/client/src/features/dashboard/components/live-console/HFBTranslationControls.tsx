import { useMemo, useState, useEffect } from "react";
import { ChevronDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  BIBLE_TRANSLATIONS,
  type BibleVersionCode,
} from "../../data/bibleTranslations";
import { useHFBStore } from "../../hooks/useHFBStore";
import { useBibleProjectionStore } from "@/stores/useBibleProjectionStore";

interface HFBTranslationControlsProps {
  liveWindow?: Window | null;
  activeVersion?: string;
  onVersionSelect?: (version: BibleVersionCode) => void | Promise<void>;
  accent?: "cyan" | "purple";
}

export function HFBTranslationControls({
  liveWindow,
  activeVersion,
  onVersionSelect,
  accent = "cyan",
}: HFBTranslationControlsProps) {
  const { toast } = useToast();
  const hfbStore = useHFBStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [draftPinned, setDraftPinned] = useState<BibleVersionCode[]>(hfbStore.hfbPinnedVersions);
  const [saving, setSaving] = useState(false);
  const activeCode = (activeVersion || hfbStore.hfbVersion).toLowerCase() as BibleVersionCode;

  const pinned = useMemo(
    () => hfbStore.hfbPinnedVersions
      .map(code => BIBLE_TRANSLATIONS.find(item => item.code === code))
      .filter(Boolean),
    [hfbStore.hfbPinnedVersions],
  );
  const moreTranslations = useMemo(
    () => BIBLE_TRANSLATIONS.filter(item => !hfbStore.hfbPinnedVersions.includes(item.code)),
    [hfbStore.hfbPinnedVersions],
  );

  useEffect(() => {
    if (preferencesOpen) setDraftPinned(hfbStore.hfbPinnedVersions);
  }, [preferencesOpen, hfbStore.hfbPinnedVersions]);

  useEffect(() => {
    void hfbStore.loadHfbPreferences();
  }, [hfbStore.loadHfbPreferences]);

  const selectVersion = async (version: BibleVersionCode) => {
    setMoreOpen(false);
    if (onVersionSelect) {
      await onVersionSelect(version);
      return;
    }

    const abbreviation = version.toUpperCase();
    const stateBefore = useHFBStore.getState();
    const shouldReproject = Boolean(
      stateBefore.hfbCurrentProjected &&
      stateBefore.hfbBookName &&
      stateBefore.hfbChapter &&
      stateBefore.hfbActiveVerseNum,
    );
    stateBefore.setHfbVersion(abbreviation);

    if (!stateBefore.hfbBookName || !stateBefore.hfbChapter) return;
    await stateBefore.fetchHFBChapter(
      stateBefore.hfbBookName,
      stateBefore.hfbChapter,
      abbreviation,
      stateBefore.hfbActiveVerseNum ?? undefined,
    );

    if (!shouldReproject || stateBefore.hfbActiveVerseNum === null) return;
    const stateAfter = useHFBStore.getState();
    const verse = stateAfter.hfbChapterVerses.find(
      item => item.number === stateAfter.hfbActiveVerseNum,
    );
    if (!verse?.text?.trim()) {
      toast({
        title: `${abbreviation} text unavailable`,
        description: `This translation has no text for ${stateAfter.hfbBookName} ${stateAfter.hfbChapter}:${stateAfter.hfbActiveVerseNum}.`,
        variant: "destructive",
      });
      return;
    }
    const reference = `${stateAfter.hfbBookName} ${stateAfter.hfbChapter}:${verse.number}`;
    stateAfter.setHfbCurrentProjected({ reference, text: verse.text, version: abbreviation });
    useBibleProjectionStore.getState().setVerse({
      book: stateAfter.hfbBookName,
      chapter: stateAfter.hfbChapter,
      verse: verse.number,
      text: verse.text,
      version: abbreviation,
      [version]: verse.text,
    }, reference, abbreviation);
    if (liveWindow && !liveWindow.closed) {
      liveWindow.postMessage({
        type: "BIBLE_VERSE_DISPLAY",
        data: {
          book: stateAfter.hfbBookName,
          chapter: stateAfter.hfbChapter,
          verse: verse.number,
          text: verse.text,
          version: abbreviation,
          reference,
        },
      }, window.location.origin);
    }
  };

  const toggleDraft = (code: BibleVersionCode) => {
    setDraftPinned(current => {
      if (current.includes(code)) return current.filter(item => item !== code);
      if (current.length >= 6) return current;
      return [...current, code];
    });
  };

  const savePreferences = async () => {
    if (!draftPinned.length || draftPinned.length > 6) return;
    setSaving(true);
    try {
      await hfbStore.saveHfbPreferences(draftPinned);
      setPreferencesOpen(false);
      toast({ title: "Bible preferences saved" });
    } catch (error: any) {
      toast({
        title: "Preferences were not saved",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {pinned.map(item => item && (
          <button
            key={item.code}
            onClick={() => void selectVersion(item.code)}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded transition-all tracking-wide ${
              activeCode === item.code ? "text-white" : "text-gray-300 hover:brightness-110"
            }`}
            style={activeCode === item.code
              ? accent === "cyan"
                ? { background: "#0e7490", boxShadow: "0 0 8px rgba(14,116,144,0.5)" }
                : { background: "#6366f1", boxShadow: "0 0 8px rgba(99,102,241,0.5)" }
              : { background: "#0d1020", border: "1px solid rgba(255,255,255,0.08)" }}
            title={item.displayName}
          >
            {item.abbreviation}
          </button>
        ))}

        <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={`h-[30px] min-w-[76px] px-3 rounded flex items-center justify-center gap-1 text-[10px] font-bold tracking-wide ${
                !hfbStore.hfbPinnedVersions.includes(activeCode)
                  ? accent === "cyan" ? "bg-cyan-800 text-white" : "bg-indigo-600 text-white"
                  : "bg-[#0d1020] text-purple-200 border border-white/10"
              }`}
            >
              {!hfbStore.hfbPinnedVersions.includes(activeCode)
                ? activeCode.toUpperCase()
                : "MORE"}
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            collisionPadding={16}
            className="z-[310] w-[340px] max-w-[calc(100vw-32px)] rounded-xl border-purple-700/40 bg-[#21143d] p-0 text-white shadow-2xl overflow-hidden"
          >
              <div className="px-4 py-3 border-b border-white/10">
                <h3 className="text-sm font-bold text-white">More Translations</h3>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {moreTranslations.map(item => (
                  <DropdownMenuItem
                    key={item.code}
                    onSelect={() => void selectVersion(item.code)}
                    className={`w-full flex cursor-pointer items-center gap-3 rounded-lg p-2 text-left focus:bg-white/5 focus:text-white ${
                      activeCode === item.code ? "bg-cyan-950/50" : ""
                    }`}
                  >
                    <span className="w-24 shrink-0 py-2 rounded-md bg-[#100326] text-center text-xs font-bold text-purple-200">
                      {item.abbreviation}
                    </span>
                    <span className="min-w-0 text-xs leading-snug text-purple-100/70">{item.displayName}</span>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuItem
                onSelect={() => {
                  setMoreOpen(false);
                  window.setTimeout(() => setPreferencesOpen(true), 0);
                }}
                className="w-full cursor-pointer rounded-none px-4 py-3 border-t border-white/10 flex items-center gap-2 text-sm font-semibold text-white focus:bg-white/5 focus:text-white"
              >
                <Settings className="w-4 h-4" /> Set Preferences
              </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <DialogContent
          overlayClassName="z-[320]"
          className="z-[321] max-w-2xl border-purple-700/40 bg-[#2a194b] text-white p-0 overflow-hidden"
        >
          <DialogHeader className="px-6 py-5 border-b border-white/10">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-200" /> Set Bible Preferences
            </DialogTitle>
            <DialogDescription className="text-purple-100/60">
              Choose up to 6 Bible translations to pin in the top bar.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-2">
            <p className="mb-4 text-xs font-semibold text-purple-100/80">
              {draftPinned.length} of 6 selected
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[430px] overflow-y-auto pr-1">
              {BIBLE_TRANSLATIONS.map(item => {
                const checked = draftPinned.includes(item.code);
                const disabled = !checked && draftPinned.length >= 6;
                return (
                  <div
                    key={item.code}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-disabled={disabled}
                    onClick={() => { if (!disabled) toggleDraft(item.code); }}
                    onKeyDown={event => {
                      if (!disabled && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        toggleDraft(item.code);
                      }
                    }}
                    className={`flex items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors ${
                      checked
                        ? "border-purple-500 bg-[#16052f]"
                        : "border-transparent bg-[#160b31] hover:border-purple-700/60"
                    } ${disabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <Switch checked={checked} disabled={disabled} tabIndex={-1} />
                    <strong className="w-16 text-xs text-purple-100">{item.abbreviation}</strong>
                    <span className="text-[11px] text-purple-100/55">{item.displayName}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="px-6 py-5 border-t border-white/10">
            <Button variant="outline" onClick={() => setPreferencesOpen(false)} className="border-white/20 bg-transparent text-white">
              Cancel
            </Button>
            <Button onClick={() => void savePreferences()} disabled={!draftPinned.length || saving} className="bg-purple-500 hover:bg-purple-400">
              {saving ? "Saving…" : "Save Preferences"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
