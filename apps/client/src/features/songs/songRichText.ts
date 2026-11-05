// Inline formatting inside a song section: the editor's rich text is stored as a small,
// sanitised subset of HTML (bold / italic / underline / strike, colour, highlight, font and
// size on spans, line breaks). Everything shown on a screen goes through sanitizeLyricHtml, so
// nothing but that subset can ever reach the live output, whatever was stored.

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

const MAX_HTML_LENGTH = 30000;
const MAX_DEPTH = 25;

// Elements whose content must never be shown at all
const DROP_WITH_CONTENT = new Set([
  "SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "TEMPLATE", "NOSCRIPT",
  "LINK", "META", "HEAD", "TITLE", "FORM", "INPUT", "BUTTON", "TEXTAREA", "SELECT", "VIDEO", "AUDIO", "IMG",
]);

const TAG_RENAME: Record<string, string> = {
  STRONG: "b",
  B: "b",
  EM: "i",
  I: "i",
  U: "u",
  S: "s",
  STRIKE: "s",
  DEL: "s",
  SPAN: "span",
  DIV: "div",
  P: "div",
  FONT: "span",
};

const COLOR =
  /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)|[a-zA-Z]{3,20})$/;
const DECORATION = /^(underline|line-through|none)( (underline|line-through))*$/;

const STYLE_RULES: Record<string, RegExp> = {
  color: COLOR,
  "background-color": COLOR,
  "font-family": /^[\w\s,"'.-]{1,120}$/,
  "font-size": /^\d{1,3}(\.\d{1,4})?(px|em|%|pt|rem)$/,
  "font-weight": /^(bold|normal|[1-9]00)$/,
  "font-style": /^(italic|normal)$/,
  "text-decoration": DECORATION,
  "text-decoration-line": DECORATION,
  "text-align": /^(left|center|right|justify)$/,
  "text-transform": /^(uppercase|lowercase|capitalize|none)$/,
  "letter-spacing": /^-?\d{1,2}(\.\d{1,4})?(px|em)$/,
  "line-height": /^\d{1,2}(\.\d{1,4})?(px|em|%)?$/,
};

const escapeText = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, "<br>");

const escapeAttribute = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const parseHtml = (html: string): Document =>
  new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");

/** Keeps only the style declarations that are on the allow-list and well formed. */
const cleanStyle = (raw: string | null): string => {
  if (!raw) return "";
  const kept: string[] = [];
  raw.split(";").forEach((declaration) => {
    const colon = declaration.indexOf(":");
    if (colon < 0) return;
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).trim();
    const rule = STYLE_RULES[property];
    if (rule && rule.test(value)) kept.push(`${property}: ${value}`);
  });
  return kept.join("; ");
};

/** <font color face> (the browser's older output) becomes the same thing as a style. */
const fontAttributesAsStyle = (el: Element): string => {
  const parts: string[] = [];
  const color = el.getAttribute("color");
  const face = el.getAttribute("face");
  if (color) parts.push(`color: ${color}`);
  if (face) parts.push(`font-family: ${face}`);
  return parts.join("; ");
};

const serialize = (node: Node, depth: number): string => {
  if (depth > MAX_DEPTH) return "";
  if (node.nodeType === TEXT_NODE) return escapeText(node.nodeValue ?? "");
  if (node.nodeType !== ELEMENT_NODE) return "";

  const el = node as Element;
  const tag = el.tagName.toUpperCase();
  if (DROP_WITH_CONTENT.has(tag)) return "";
  if (tag === "BR") return "<br>";

  let inner = "";
  el.childNodes.forEach((child) => {
    inner += serialize(child, depth + 1);
  });

  const name = TAG_RENAME[tag];
  if (!name) return inner; // unknown element: keep its text, drop the element

  const style = cleanStyle(
    [tag === "FONT" ? fontAttributesAsStyle(el) : "", el.getAttribute("style") ?? ""]
      .filter(Boolean)
      .join("; "),
  );
  const attributes = style ? ` style="${escapeAttribute(style)}"` : "";
  return `<${name}${attributes}>${inner}</${name}>`;
};

/** Reduces any HTML to the allowed subset; unsafe or oversized input degrades to plain text. */
export const sanitizeLyricHtml = (html: string | null | undefined): string => {
  if (!html) return "";
  const body = parseHtml(String(html)).body;
  let out = "";
  body.childNodes.forEach((child) => {
    out += serialize(child, 0);
  });
  if (out.length > MAX_HTML_LENGTH) return escapeText(body.textContent ?? "").slice(0, MAX_HTML_LENGTH);
  return out;
};

const BLOCK_TAGS = new Set(["DIV", "P", "LI"]);

/** The text of lyric HTML with one line per line break / block, as the editor shows it. */
export const lyricHtmlToPlain = (html: string | null | undefined): string => {
  if (!html) return "";
  const body = parseHtml(String(html)).body;
  const lines: string[] = [];
  let current = "";
  const flush = () => {
    lines.push(current);
    current = "";
  };
  const walk = (parent: Node) => {
    parent.childNodes.forEach((child) => {
      if (child.nodeType === TEXT_NODE) {
        current += child.nodeValue ?? "";
      } else if (child.nodeType === ELEMENT_NODE) {
        const tag = (child as Element).tagName.toUpperCase();
        if (tag === "BR") {
          flush();
        } else if (BLOCK_TAGS.has(tag)) {
          if (current !== "") flush();
          walk(child);
          if (current !== "") flush();
        } else if (!DROP_WITH_CONTENT.has(tag)) {
          walk(child);
        }
      }
    });
  };
  walk(body);
  if (current !== "") flush();
  return lines.join("\n");
};

/** Plain text as lyric HTML (lines separated by line breaks). */
export const plainToLyricHtml = (text: string): string => escapeText(text);

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/** True when the HTML still says what `content` says (so the formatting still belongs to it). */
export const htmlMatchesContent = (html: string, content: string): boolean =>
  squash(lyricHtmlToPlain(html)) === squash(content);

/** True when the HTML carries inline formatting (not just lines of plain text). */
export const hasInlineFormatting = (html: string | null | undefined): boolean =>
  !!html && /<(span|b|i|u|s)[\s>]/.test(html);

/**
 * The inline formatting to show for a song section, or undefined when there is none, it no
 * longer matches the section's text, or it is not worth carrying.
 */
export const lyricHtmlForSection = (
  song: { sectionHtml?: Record<string, string> } | null | undefined,
  sectionName: string,
  content: string,
): string | undefined => {
  const stored = song?.sectionHtml?.[sectionName];
  if (typeof stored !== "string" || !stored) return undefined;
  const clean = sanitizeLyricHtml(stored);
  return hasInlineFormatting(clean) && htmlMatchesContent(clean, content) ? clean : undefined;
};

/**
 * After the browser applied its largest built-in font size ("7") to a selection as a marker,
 * replaces the marker with the size actually wanted (a percent of the section's size). Sizes
 * inside an already-sized span are divided by it, so sizes never compound, and spans inside
 * the newly sized text lose their own size.
 */
export const applyInlineFontSize = (root: HTMLElement, percent: number): void => {
  const markers = Array.from(root.querySelectorAll<HTMLElement>('font[size="7"], [style*="xxx-large"]'));
  markers.forEach((marker) => {
    let factor = 1;
    for (let ancestor = marker.parentElement; ancestor && ancestor !== root; ancestor = ancestor.parentElement) {
      const match = /font-size:\s*([\d.]+)em/.exec(ancestor.getAttribute("style") ?? "");
      if (match) factor *= parseFloat(match[1]);
    }
    const em = Math.round((percent / 100 / factor) * 1000) / 1000;

    let target = marker;
    if (marker.tagName === "FONT") {
      const span = marker.ownerDocument.createElement("span");
      while (marker.firstChild) span.appendChild(marker.firstChild);
      marker.replaceWith(span);
      target = span;
    }
    target.style.fontSize = `${em}em`;
    target.querySelectorAll<HTMLElement>('[style*="font-size"]').forEach((inner) => {
      inner.style.removeProperty("font-size");
    });
  });
};
