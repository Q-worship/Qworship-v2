import React, { useLayoutEffect, useRef } from "react";
import { lyricStyleToCss, type LyricStyle } from "./songFormatting";
import {
  hasInlineFormatting,
  lyricHtmlToPlain,
  sanitizeLyricHtml,
} from "./songRichText";

export interface LyricEditorValue {
  /** Inline formatting as sanitised HTML; undefined when the text is just plain lines */
  html: string | undefined;
  /** The text, one line per line break */
  plain: string;
}

/** Reads what is in an editor box: sanitised HTML (if it has formatting) and the plain text. */
export const readLyricEditor = (el: HTMLElement): LyricEditorValue => {
  const clean = sanitizeLyricHtml(el.innerHTML);
  return {
    html: hasInlineFormatting(clean) ? clean : undefined,
    plain: lyricHtmlToPlain(clean),
  };
};

interface LyricEditorProps {
  /** What to show when the box first appears (sanitised HTML). Changing it later does nothing;
   *  remount the box (change its `key`) to load something else. */
  initialHtml: string;
  /** The section's base style, shown as it will look on screen */
  style?: LyricStyle;
  placeholder: string;
  onChange: (value: LyricEditorValue) => void;
  onFocus: () => void;
  registerEditor: (el: HTMLDivElement | null) => void;
}

/**
 * A lyric box you edit as it will look: type, select words or lines and format them. Text
 * is edited by the browser itself and read back through the sanitiser, so only the allowed
 * formatting ever gets saved. Pasted text is always plain.
 */
export const LyricEditor: React.FC<LyricEditorProps> = ({
  initialHtml,
  style,
  placeholder,
  onChange,
  onFocus,
  registerEditor,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // The browser owns the box's content while it is being edited, so the initial content is
  // written once instead of being re-rendered by React (which would reset the caret)
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.innerHTML = initialHtml;
    registerEditor(el);
    return () => registerEditor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const value = readLyricEditor(el);
    // A box emptied with the keyboard keeps a stray <br>; clear it so the placeholder returns
    if (value.plain === "" && el.innerHTML !== "") el.innerHTML = "";
    onChange(value);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      spellCheck={false}
      data-placeholder={placeholder}
      onInput={emit}
      onFocus={onFocus}
      onPaste={(event) => {
        // Formatting from other programs is not wanted; paste the words only
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      }}
      className="min-h-[6rem] w-full text-sm text-white outline-none whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
      style={lyricStyleToCss(style)}
    />
  );
};
