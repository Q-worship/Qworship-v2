import type { LabelledSection, Manuscript, ManuscriptSection, ManuscriptTemplate, TemplateFont } from "./types";

/**
 * Renders a manuscript to a standalone, print-ready HTML document (used for the
 * preview, Print / Save as PDF, and HTML download), laid out by the church's
 * manuscript template. DEFAULT_TEMPLATE reproduces the original "Classic" look.
 */

export interface ManuscriptMeta {
  preacher?: string;
  serviceDate?: string;
}

export const TEMPLATE_FONTS: Record<TemplateFont, { label: string; css: string; google?: string }> = {
  georgia: { label: "Georgia", css: 'Georgia, "Times New Roman", serif' },
  garamond: { label: "EB Garamond", css: '"EB Garamond", Georgia, serif', google: "EB+Garamond:ital,wght@0,400;0,600;1,400" },
  merriweather: { label: "Merriweather", css: "Merriweather, Georgia, serif", google: "Merriweather:ital,wght@0,400;0,700;1,400" },
  lora: { label: "Lora", css: "Lora, Georgia, serif", google: "Lora:ital,wght@0,400;0,600;1,400" },
  playfair: { label: "Playfair Display", css: '"Playfair Display", Georgia, serif', google: "Playfair+Display:ital,wght@0,400;0,700;1,400" },
  inter: { label: "Inter", css: 'Inter, -apple-system, "Segoe UI", sans-serif', google: "Inter:ital,wght@0,400;0,600;0,700;1,400" },
  system: { label: "System sans-serif", css: '-apple-system, "Segoe UI", Roboto, sans-serif' },
};

export const SECTION_NAMES: Record<ManuscriptSection, string> = {
  byline: "Preacher & date",
  mainScripture: "Main scripture",
  summary: "Summary",
  keyPoints: "Key points",
  discussionQuestions: "Discussion questions",
  scriptureReferences: "Scripture references",
};

export const DEFAULT_TEMPLATE: ManuscriptTemplate = {
  churchName: "",
  logoSize: "medium",
  headerAlign: "center",
  headingFont: "georgia",
  bodyFont: "georgia",
  textSize: "medium",
  accentColor: "#7c5cbf",
  footerText: "",
  show: { byline: true, mainScripture: true, summary: true, keyPoints: true, discussionQuestions: true, scriptureReferences: true },
  labels: {
    summary: "",
    keyPoints: "Key Points",
    discussionQuestions: "Reflection & Discussion",
    scriptureReferences: "Scripture References",
  },
};

/** Fill in anything a saved (possibly older) template is missing. */
export function withTemplateDefaults(saved: Partial<ManuscriptTemplate> | null | undefined): ManuscriptTemplate {
  return {
    ...DEFAULT_TEMPLATE,
    ...saved,
    show: { ...DEFAULT_TEMPLATE.show, ...saved?.show },
    labels: { ...DEFAULT_TEMPLATE.labels, ...saved?.labels },
  };
}

const TEXT_SIZES = { small: 15, medium: 17, large: 19 } as const;
const LOGO_HEIGHTS = { small: 40, medium: 64, large: 96 } as const;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "";

const safeColor = (c: string) => (/^#[0-9a-f]{6}$/i.test(c) ? c : DEFAULT_TEMPLATE.accentColor);

const bylineText = (meta: ManuscriptMeta) => [meta.preacher, formatDate(meta.serviceDate)].filter((s): s is string => !!s);

export function renderManuscriptHtml(m: Manuscript, meta: ManuscriptMeta = {}, t: ManuscriptTemplate = DEFAULT_TEMPLATE): string {
  const accent = safeColor(t.accentColor);
  const heading = TEMPLATE_FONTS[t.headingFont] ?? TEMPLATE_FONTS.georgia;
  const bodyFont = TEMPLATE_FONTS[t.bodyFont] ?? TEMPLATE_FONTS.georgia;
  const googleFamilies = [...new Set([heading.google, bodyFont.google].filter(Boolean))];
  const fontLink = googleFamilies.length
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${googleFamilies.map((f) => `family=${f}`).join("&")}&display=swap">`
    : "";
  const base = TEXT_SIZES[t.textSize] ?? TEXT_SIZES.medium;
  const label = (s: LabelledSection) => escapeHtml(t.labels[s]);

  const byline = t.show.byline ? bylineText(meta).map(escapeHtml).join(" · ") : "";

  const body = m.blocks
    .map((b) => {
      if (b.type === "heading") return `<h2>${escapeHtml(b.text)}</h2>`;
      if (b.type === "quote")
        return `<blockquote><p>${escapeHtml(b.text)}</p>${
          b.reference ? `<cite>${escapeHtml(b.reference)}</cite>` : ""
        }</blockquote>`;
      return `<p>${escapeHtml(b.text)}</p>`;
    })
    .join("\n");

  const list = (items: string[], ordered = false) =>
    `<${ordered ? "ol" : "ul"}>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`;
  const extraHeading = (s: LabelledSection) => (t.labels[s] ? `<h2>${label(s)}</h2>` : "");

  const extras = [
    t.show.keyPoints && m.keyPoints.length ? `${extraHeading("keyPoints")}${list(m.keyPoints)}` : "",
    t.show.discussionQuestions && m.discussionQuestions.length
      ? `${extraHeading("discussionQuestions")}${list(m.discussionQuestions, true)}`
      : "",
    t.show.scriptureReferences && m.scriptureReferences.length
      ? `${extraHeading("scriptureReferences")}<p class="refs">${m.scriptureReferences.map(escapeHtml).join(" · ")}</p>`
      : "",
  ].join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(m.title)}</title>
${fontLink}
<style>
  :root { --accent: ${accent}; }
  @page { margin: 22mm 20mm; }
  body { margin: 0; background: #fff; color: #1f1d24; font: ${base}px/1.7 ${bodyFont.css}; }
  main { max-width: 680px; margin: 0 auto; padding: 48px 24px 64px; }
  header { text-align: ${t.headerAlign}; border-bottom: 1px solid #e4e0ea; padding-bottom: 28px; margin-bottom: 32px; }
  .logo { display: block; max-height: ${LOGO_HEIGHTS[t.logoSize] ?? LOGO_HEIGHTS.medium}px; max-width: 70%; margin: 0 ${t.headerAlign === "center" ? "auto" : "0"} 14px; }
  .church { font: 600 12px/1.4 -apple-system, "Segoe UI", sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); margin-bottom: 10px; }
  h1, h2 { font-family: ${heading.css}; }
  h1 { font-size: ${Math.round(base * 2)}px; line-height: 1.2; margin: 0 0 10px; }
  .byline { color: #6b6575; font: 14px/1.4 -apple-system, "Segoe UI", sans-serif; letter-spacing: .02em; }
  .main-text { margin-top: 14px; font-style: italic; color: color-mix(in srgb, var(--accent) 70%, #1f1d24); }
  .summary { background: color-mix(in srgb, var(--accent) 7%, #fff); border-radius: 8px; padding: 18px 22px; margin: 0 0 32px; }
  .summary h2 { margin-top: 0; }
  .summary p { margin: 0; }
  h2 { font-size: ${Math.round(base * 1.3)}px; margin: 36px 0 8px; color: color-mix(in srgb, var(--accent) 45%, #1f1d24); }
  p { margin: 0 0 16px; }
  blockquote { margin: 20px 0; padding: 4px 0 4px 20px; border-left: 3px solid var(--accent); color: #3d3550; font-style: italic; }
  blockquote p { margin: 0 0 6px; }
  cite { display: block; font: normal 13px/1.4 -apple-system, "Segoe UI", sans-serif; color: var(--accent); letter-spacing: .03em; }
  section.extras { border-top: 1px solid #e4e0ea; margin-top: 40px; padding-top: 8px; }
  li { margin-bottom: 6px; }
  .refs { font: 14px/1.6 -apple-system, "Segoe UI", sans-serif; color: #6b6575; }
  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e4e0ea; text-align: center; font: 13px/1.5 -apple-system, "Segoe UI", sans-serif; color: #6b6575; white-space: pre-line; }
  @media print { main { padding: 0; } .summary { break-inside: avoid; } blockquote, h2 { break-inside: avoid; break-after: avoid; } }
</style>
</head>
<body>
<main>
  <header>
    ${t.logo ? `<img class="logo" src="${escapeHtml(t.logo)}" alt="${escapeHtml(t.churchName || "Logo")}">` : ""}
    ${t.churchName ? `<div class="church">${escapeHtml(t.churchName)}</div>` : ""}
    <h1>${escapeHtml(m.title)}</h1>
    ${byline ? `<div class="byline">${byline}</div>` : ""}
    ${t.show.mainScripture && m.mainScripture ? `<div class="main-text">${escapeHtml(m.mainScripture)}</div>` : ""}
  </header>
  ${t.show.summary && m.summary ? `<div class="summary">${extraHeading("summary")}<p>${escapeHtml(m.summary)}</p></div>` : ""}
  ${body}
  ${extras ? `<section class="extras">${extras}</section>` : ""}
  ${t.footerText.trim() ? `<footer>${escapeHtml(t.footerText.trim())}</footer>` : ""}
</main>
</body>
</html>`;
}

/** Plain-text version for pasting into WhatsApp, email or a church app. */
export function renderManuscriptText(m: Manuscript, meta: ManuscriptMeta = {}, t: ManuscriptTemplate = DEFAULT_TEMPLATE): string {
  const lines: string[] = [];
  if (t.churchName) lines.push(t.churchName);
  lines.push(m.title.toUpperCase());
  const byline = t.show.byline ? bylineText(meta).join(" · ") : "";
  if (byline) lines.push(byline);
  if (t.show.mainScripture && m.mainScripture) lines.push(m.mainScripture);
  if (t.show.summary && m.summary) lines.push("", ...(t.labels.summary ? [t.labels.summary.toUpperCase()] : []), m.summary);
  for (const b of m.blocks) {
    if (b.type === "heading") lines.push("", b.text.toUpperCase());
    else if (b.type === "quote") lines.push("", `"${b.text}"${b.reference ? ` — ${b.reference}` : ""}`);
    else lines.push("", b.text);
  }
  const section = (s: LabelledSection, items: string[]) =>
    lines.push("", ...(t.labels[s] ? [t.labels[s].toUpperCase()] : []), ...items);
  if (t.show.keyPoints && m.keyPoints.length) section("keyPoints", m.keyPoints.map((p) => `• ${p}`));
  if (t.show.discussionQuestions && m.discussionQuestions.length)
    section("discussionQuestions", m.discussionQuestions.map((q, i) => `${i + 1}. ${q}`));
  if (t.show.scriptureReferences && m.scriptureReferences.length) section("scriptureReferences", [m.scriptureReferences.join(" · ")]);
  if (t.footerText.trim()) lines.push("", t.footerText.trim());
  return lines.join("\n");
}
