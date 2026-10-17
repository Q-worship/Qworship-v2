import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useHFBStore } from "../../hooks/useHFBStore";
import { parseHFBReference } from "../../lib/hfbFastReferenceParser";

interface Props {
  /** Project a verse of the chapter now loaded in the HFB store. */
  onProject: (verseNumber: number, text: string) => void;
}

/**
 * Typed reference search for the Hands-Free Bible stage, so the operator can
 * jump to a passage without saying it. Full references ("John 3:16") parse
 * locally and load instantly; anything else ("Jn 3:16", "1 cor 13") goes
 * through the same /bible/search the On-screen Bible uses.
 */
export function HFBReferenceSearch({ onProject }: Props) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = async (text: string, version: string) => {
    const local = parseHFBReference(text);
    if (local) return { book: local.book, chapter: local.chapter, verse: local.verse };
    const { data } = await apiClient.get(
      `/bible/search?reference=${encodeURIComponent(text)}&version=${version.toLowerCase()}`,
    );
    const passage = data?.success ? data.passage : null;
    if (!passage?.book || !passage.verses?.length) return null;
    return { book: String(passage.book).trim(), chapter: Number(passage.chapter), verse: Number(passage.verses[0].number) };
  };

  const search = async () => {
    const text = query.trim();
    if (!text) {
      setError("Enter a reference, e.g. John 3:16");
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const { hfbVersion, fetchHFBChapter } = useHFBStore.getState();
      const ref = await resolve(text, hfbVersion);
      if (!ref) {
        setError("Scripture not found.");
        return;
      }
      await fetchHFBChapter(ref.book, ref.chapter, hfbVersion, ref.verse);
      const verse = useHFBStore.getState().hfbChapterVerses.find((v) => Number(v.number) === ref.verse);
      if (!verse) {
        setError(`${ref.book} ${ref.chapter}:${ref.verse} isn't available in ${hfbVersion}.`);
        return;
      }
      onProject(ref.verse, verse.text);
    } catch {
      setError("Error searching the Bible. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="mb-2">
      <div className="flex overflow-hidden rounded-lg border border-[#2d2d4a] focus-within:border-cyan-700">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Enter Reference: John 3:16"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
            className="w-full bg-[#0d0d1a] py-2 pl-8 pr-2 text-xs text-white placeholder-gray-600 focus:outline-none"
          />
        </div>
        <button
          onClick={search}
          disabled={isSearching}
          title="Search and project"
          className="flex w-10 shrink-0 items-center justify-center bg-cyan-700 text-white transition-colors hover:bg-cyan-600 disabled:opacity-50"
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
