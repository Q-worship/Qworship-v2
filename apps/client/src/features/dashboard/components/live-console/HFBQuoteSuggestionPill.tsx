import { useEffect, useState } from "react";
import { Check, X, BookOpenText, ScanSearch } from "lucide-react";
import { useHFBStore } from "../../hooks/useHFBStore";
import { PILL_TTL_MS } from "../../hooks/useHFBQuoteMode";

/**
 * HFBQuoteSuggestionPill — QUOTE MODE (trial)
 *
 * The single suggestion pill shown above the Detected Verses list while HFB
 * is in Quote sub-mode. Nothing here projects directly: Confirm hands off to
 * useHFBQuoteMode.confirmSuggestion, which routes through the normal
 * bible_match path.
 *
 * Keyboard: Enter confirms, Esc dismisses — only while a pill is showing and
 * focus is not in an editable field.
 */

const STALE_AFTER_MS = 20_000;

interface Props {
  onConfirm: () => void;
  onDismiss: () => void;
}

export function HFBQuoteSuggestionPill({ onConfirm, onDismiss }: Props) {
  const pill = useHFBStore((s) => s.hfbSuggestedVerse);
  const activeVersion = useHFBStore((s) => s.hfbVersion);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!pill) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [pill]);

  useEffect(() => {
    if (!pill) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pill, onConfirm, onDismiss]);

  if (!pill) {
    return (
      <p className="text-[10px] text-gray-700 italic px-1">
        Listening for quoted scripture…
      </p>
    );
  }

  const age = now - pill.lastSeenAt;
  const stale = age > STALE_AFTER_MS;
  const secondsLeft = Math.max(0, Math.ceil((PILL_TTL_MS - age) / 1000));
  const pct = Math.round(pill.confidence * 100);
  const matchedUpper = pill.matchedVersion.toUpperCase();
  const crossVersion = matchedUpper !== activeVersion.toUpperCase();

  return (
    <div
      className={`px-2.5 py-2 rounded-lg border border-dashed transition-all ${
        stale
          ? "border-gray-800 bg-[#0d0d1a] opacity-50"
          : "border-[#0DCC85]/50 bg-[#0DCC85]/10"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {pill.origin === "read-along" ? (
            <BookOpenText className="w-3 h-3 text-[#0DCC85] shrink-0" />
          ) : (
            <ScanSearch className="w-3 h-3 text-[#0DCC85] shrink-0" />
          )}
          <span className="text-[8px] font-bold uppercase tracking-wider text-[#0DCC85]/80 shrink-0">
            {pill.origin === "read-along" ? "Read-along" : "Quoted?"}
          </span>
          <span className="text-[11px] font-bold text-emerald-100 truncate">{pill.reference}</span>
        </div>
        <span className="text-[8px] font-semibold text-[#0DCC85]/60 shrink-0">
          {crossVersion ? `${matchedUpper} ▸ ${activeVersion.toUpperCase()}` : matchedUpper}
        </span>
      </div>

      <div className="h-1 rounded-full bg-gray-800 overflow-hidden mb-1">
        <div
          className="h-full bg-[#0DCC85] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-[10px] text-gray-400 leading-snug line-clamp-2">
        <span className="text-[#0DCC85]/90">“{pill.matchedText}”</span>
      </p>

      <div className="mt-1.5 flex items-center gap-1.5">
        <button
          onClick={onConfirm}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-[#0DCC85]/20 text-emerald-100 border border-[#0DCC85]/40 hover:bg-[#0DCC85]/30 transition-all"
          title="Project this verse (Enter)"
        >
          <Check className="w-2.5 h-2.5" />
          Project
        </button>
        <button
          onClick={onDismiss}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
          title="Dismiss (Esc)"
        >
          <X className="w-2.5 h-2.5" />
          Dismiss
        </button>
        <span
          className={`text-[9px] font-semibold tabular-nums ${secondsLeft <= 10 ? "text-red-400" : "text-gray-500"}`}
          title="Auto-dismisses when this reaches zero"
        >
          {secondsLeft}s
        </span>
        <span className="ml-auto flex items-baseline gap-1" title="How closely the spoken words match this verse">
          <span className="text-[8px] font-semibold uppercase tracking-wider text-gray-500">Confidence</span>
          <span className="text-[12px] font-extrabold tabular-nums text-[#0DCC85]">{pct}%</span>
        </span>
      </div>
    </div>
  );
}
