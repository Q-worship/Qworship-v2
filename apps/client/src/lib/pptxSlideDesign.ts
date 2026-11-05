// Turns a PowerPoint slide into canvas-slide elements that keep the original look:
// the slide's real background (colour, gradient or picture, inherited from its
// layout and master), every shape / text box / picture at its authored position,
// fonts, colours, bullets, alignment, tables and the logos or bars that live on the
// layout and master.
//
// The output uses the { elements, canvasBackground } model that SlideCanvasRenderer
// draws everywhere (thumbnails, preview, Live output and OBS/NDI). All geometry is in
// the renderer's 960x540 artboard pixels and is clipped to the slide, because the
// renderer re-frames layouts that stick out of the artboard.

import {
  byLocalName,
  childrenNamed,
  directoryOf,
  firstChild,
  IMAGE_MIME_BY_EXTENSION,
  INVALID_FILE_MESSAGE,
  NS_RELATIONSHIPS,
  parseRelationships,
  parseXml,
  relsPathFor,
  resolvePath,
  type PptxPackage,
} from "./pptxPackage";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./pptxSlideLayout";

// ---- Public types ---------------------------------------------------------------

export interface ImageCrop {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** A picture to be rendered (cropped, flipped, stretched to its box) and uploaded */
export interface ImageNeed {
  key: string;
  part: string;
  crop: ImageCrop;
  flipH: boolean;
  flipV: boolean;
  outWidth: number;
  outHeight: number;
}

export interface DesignNote {
  level: "info" | "warning";
  message: string;
}

export interface SlideDesign {
  slideNumber: number;
  /** Canvas elements; pictures carry `imageKey` until finalizeSlideDesign fills in URLs */
  elements: any[];
  canvasBackground: { type: string; value: string };
  images: ImageNeed[];
  notes: DesignNote[];
}

/** Width of text in canvas px for a given style; injectable so tests need no browser */
export type FidelityMeasurer = (
  text: string,
  fontSize: number,
  bold: boolean,
  italic: boolean,
  fontFamily: string,
) => number;

export const createFidelityMeasurer = (): FidelityMeasurer => {
  const context = document.createElement("canvas").getContext("2d");
  return (text, fontSize, bold, italic, fontFamily) => {
    if (!context) return text.length * fontSize * 0.55;
    context.font = `${italic ? "italic " : ""}${bold ? "700" : "400"} ${fontSize}px ${fontFamily}`;
    return context.measureText(text).width;
  };
};

/** Rough stand-in used for the quick scan done while the file is first opened */
export const estimateMeasurer: FidelityMeasurer = (text, fontSize, bold) =>
  text.length * fontSize * (bold ? 0.58 : 0.53);

// ---- Source model (loaded once, then slides are built synchronously) ------------

interface PartRefs {
  path: string;
  rels: Map<string, { target: string; type: string }>;
}

interface Theme {
  colors: Record<string, string>;
  majorFont: string;
  minorFont: string;
  fillStyles: Element[];
  bgFillStyles: Element[];
  lineStyles: Element[];
}

interface MasterSource extends PartRefs {
  doc: Document;
  theme: Theme;
  clrMap: Record<string, string>;
  spTree: Element | null;
  txStyles: { title: Element | null; body: Element | null; other: Element | null };
  showMasterSp: boolean;
}

interface LayoutSource extends PartRefs {
  doc: Document;
  master: MasterSource;
  spTree: Element | null;
  showMasterSp: boolean;
  clrMapOverride: Record<string, string> | null;
}

export interface SlideSource extends PartRefs {
  /** Position in the original deck (what a slide-number field shows) */
  originalIndex: number;
  doc: Document;
  layout: LayoutSource;
}

export interface PresentationSource {
  slideWidth: number; // EMU
  slideHeight: number; // EMU
  defaultTextStyle: Element | null;
  tableStyles: Map<string, Element>;
  slides: SlideSource[];
}

const EMPTY_THEME: Theme = {
  colors: {},
  majorFont: "Calibri",
  minorFont: "Calibri",
  fillStyles: [],
  bgFillStyles: [],
  lineStyles: [],
};

const SYS_COLORS: Record<string, string> = {
  windowText: "000000",
  window: "ffffff",
};

const parseTheme = (doc: Document): Theme => {
  const colors: Record<string, string> = {};
  const scheme = byLocalName(doc, "clrScheme")[0];
  Array.from(scheme?.children ?? []).forEach((slot) => {
    const color = slot.children[0];
    if (!color) return;
    const value =
      color.localName === "sysClr"
        ? (color.getAttribute("lastClr") ?? SYS_COLORS[color.getAttribute("val") ?? ""])
        : color.getAttribute("val");
    if (value) colors[slot.localName] = value.toLowerCase();
  });

  const fontOf = (scope: string, fallback: string) =>
    firstChild(byLocalName(doc, scope)[0], "latin")?.getAttribute("typeface") || fallback;
  const listOf = (name: string) => {
    const list = byLocalName(doc, name)[0];
    return list ? Array.from(list.children) : [];
  };

  return {
    colors,
    majorFont: fontOf("majorFont", "Calibri"),
    minorFont: fontOf("minorFont", "Calibri"),
    fillStyles: listOf("fillStyleLst"),
    bgFillStyles: listOf("bgFillStyleLst"),
    lineStyles: listOf("lnStyleLst"),
  };
};

const attributesOf = (el: Element | null | undefined): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!el) return result;
  Array.from(el.attributes).forEach((attr) => {
    result[attr.name] = attr.value;
  });
  return result;
};

/** Reads and indexes every part the slides depend on. */
export const loadPresentationSource = async (
  pkg: PptxPackage,
  slidePaths: string[],
): Promise<PresentationSource> => {
  const presentationXml = await pkg.readText("ppt/presentation.xml");
  if (!presentationXml) throw new Error(INVALID_FILE_MESSAGE);
  const presentationDoc = parseXml(presentationXml);

  const size = byLocalName(presentationDoc, "sldSz")[0];
  const slideWidth = Number(size?.getAttribute("cx")) || 9144000;
  const slideHeight = Number(size?.getAttribute("cy")) || 5143500;
  const defaultTextStyle = byLocalName(presentationDoc, "defaultTextStyle")[0] ?? null;

  const readRels = async (path: string) => {
    const xml = await pkg.readText(relsPathFor(path));
    return xml ? parseRelationships(parseXml(xml)) : new Map();
  };

  const tableStylesXml = await pkg.readText("ppt/tableStyles.xml");
  const tableStyles = new Map<string, Element>();
  if (tableStylesXml) {
    byLocalName(parseXml(tableStylesXml), "tblStyle").forEach((style) => {
      const id = style.getAttribute("styleId");
      if (id) tableStyles.set(id, style);
    });
  }

  const masters = new Map<string, MasterSource>();
  const layouts = new Map<string, LayoutSource>();

  const loadMaster = async (path: string): Promise<MasterSource | null> => {
    const cached = masters.get(path);
    if (cached) return cached;
    const xml = await pkg.readText(path);
    if (!xml) return null;
    const doc = parseXml(xml);
    const rels = await readRels(path);

    let theme = EMPTY_THEME;
    for (const rel of rels.values()) {
      if (rel.type.endsWith("/theme")) {
        const themeXml = await pkg.readText(resolvePath(directoryOf(path), rel.target));
        if (themeXml) theme = parseTheme(parseXml(themeXml));
        break;
      }
    }

    const txStyles = byLocalName(doc, "txStyles")[0];
    const master: MasterSource = {
      path,
      rels,
      doc,
      theme,
      clrMap: attributesOf(byLocalName(doc, "clrMap")[0]),
      spTree: byLocalName(doc, "spTree")[0] ?? null,
      txStyles: {
        title: firstChild(txStyles, "titleStyle"),
        body: firstChild(txStyles, "bodyStyle"),
        other: firstChild(txStyles, "otherStyle"),
      },
      showMasterSp: true,
    };
    masters.set(path, master);
    return master;
  };

  const loadLayout = async (path: string): Promise<LayoutSource | null> => {
    const cached = layouts.get(path);
    if (cached) return cached;
    const xml = await pkg.readText(path);
    if (!xml) return null;
    const doc = parseXml(xml);
    const rels = await readRels(path);

    let master: MasterSource | null = null;
    for (const rel of rels.values()) {
      if (rel.type.endsWith("/slideMaster")) {
        master = await loadMaster(resolvePath(directoryOf(path), rel.target));
        break;
      }
    }
    if (!master) return null;

    const root = doc.documentElement;
    const override = byLocalName(doc, "overrideClrMapping")[0];
    const layout: LayoutSource = {
      path,
      rels,
      doc,
      master,
      spTree: byLocalName(doc, "spTree")[0] ?? null,
      showMasterSp: root?.getAttribute("showMasterSp") !== "0",
      clrMapOverride: override ? attributesOf(override) : null,
    };
    layouts.set(path, layout);
    return layout;
  };

  const slides: SlideSource[] = [];
  for (let index = 0; index < slidePaths.length; index++) {
    const path = slidePaths[index];
    const xml = await pkg.readText(path);
    if (!xml) continue;
    const rels = await readRels(path);

    let layout: LayoutSource | null = null;
    for (const rel of rels.values()) {
      if (rel.type.endsWith("/slideLayout")) {
        layout = await loadLayout(resolvePath(directoryOf(path), rel.target));
        break;
      }
    }
    if (!layout) {
      // A slide with no usable layout still renders from its own shapes
      const fallbackMaster: MasterSource = {
        path: "",
        rels: new Map(),
        doc: parseXml("<x/>"),
        theme: EMPTY_THEME,
        clrMap: {},
        spTree: null,
        txStyles: { title: null, body: null, other: null },
        showMasterSp: false,
      };
      layout = {
        path: "",
        rels: new Map(),
        doc: fallbackMaster.doc,
        master: fallbackMaster,
        spTree: null,
        showMasterSp: false,
        clrMapOverride: null,
      };
    }

    slides.push({
      path,
      rels,
      originalIndex: index + 1,
      doc: parseXml(xml),
      layout,
    });
  }

  return { slideWidth, slideHeight, defaultTextStyle, tableStyles, slides };
};

// ---- Colour -----------------------------------------------------------------------

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface ColorContext {
  theme: Theme;
  clrMap: Record<string, string>;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const hexToRgba = (hex: string): Rgba | null => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
};

export const rgbaToCss = ({ r, g, b, a }: Rgba): string => {
  const h = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");
  return a >= 0.999
    ? `#${h(r)}${h(g)}${h(b)}`
    : `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.round(clamp(a) * 1000) / 1000})`;
};

const rgbToHsl = ({ r, g, b }: Rgba) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
  }
  return { h, s, l };
};

const hslToRgb = (h: number, s: number, l: number, a: number): Rgba => {
  const hue = (p: number, q: number, t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255, a };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue(p, q, h + 1 / 3) * 255,
    g: hue(p, q, h) * 255,
    b: hue(p, q, h - 1 / 3) * 255,
    a,
  };
};

const PRESET_COLORS: Record<string, string> = {
  black: "000000",
  white: "ffffff",
  red: "ff0000",
  green: "008000",
  blue: "0000ff",
  yellow: "ffff00",
  gray: "808080",
  grey: "808080",
  orange: "ffa500",
  purple: "800080",
  cyan: "00ffff",
  magenta: "ff00ff",
};

const percent = (el: Element) => (Number(el.getAttribute("val")) || 0) / 100000;

const toLinear = (channel: number): number => {
  const c = clamp(channel / 255);
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const toSrgb = (linear: number): number => {
  const l = clamp(linear);
  return (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055) * 255;
};

const applyColorTransforms = (base: Rgba, colorEl: Element): Rgba => {
  let color = { ...base };
  Array.from(colorEl.children).forEach((transform) => {
    const amount = percent(transform);
    switch (transform.localName) {
      case "alpha":
        color.a = clamp(amount);
        break;
      case "alphaMod":
        color.a = clamp(color.a * amount);
        break;
      case "alphaOff":
        color.a = clamp(color.a + amount);
        break;
      case "lumMod":
      case "lumOff":
      case "lum":
      case "satMod":
      case "satOff":
      case "sat":
      case "hueMod":
      case "hueOff":
      case "hue": {
        const hsl = rgbToHsl(color);
        let { h, s, l } = hsl;
        if (transform.localName === "lumMod") l *= amount;
        else if (transform.localName === "lumOff") l += amount;
        else if (transform.localName === "lum") l = amount;
        else if (transform.localName === "satMod") s *= amount;
        else if (transform.localName === "satOff") s += amount;
        else if (transform.localName === "sat") s = amount;
        else if (transform.localName === "hueMod") h = (h * amount) % 1;
        else if (transform.localName === "hueOff") {
          h = (((h + (Number(transform.getAttribute("val")) || 0) / 21600000) % 1) + 1) % 1;
        } else if (transform.localName === "hue") {
          h = (Number(transform.getAttribute("val")) || 0) / 21600000;
        }
        color = hslToRgb(h, clamp(s), clamp(l), color.a);
        break;
      }
      // PowerPoint mixes tints and shades in linear light (not plain sRGB), which is
      // what makes e.g. the Office blue at "shade 50%" come out as #2F528F
      case "tint":
        color = {
          r: toSrgb(toLinear(color.r) * amount + (1 - amount)),
          g: toSrgb(toLinear(color.g) * amount + (1 - amount)),
          b: toSrgb(toLinear(color.b) * amount + (1 - amount)),
          a: color.a,
        };
        break;
      case "shade":
        color = {
          r: toSrgb(toLinear(color.r) * amount),
          g: toSrgb(toLinear(color.g) * amount),
          b: toSrgb(toLinear(color.b) * amount),
          a: color.a,
        };
        break;
      case "gray": {
        const gray = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
        color = { r: gray, g: gray, b: gray, a: color.a };
        break;
      }
      case "inv":
        color = { r: 255 - color.r, g: 255 - color.g, b: 255 - color.b, a: color.a };
        break;
      default:
        break;
    }
  });
  return color;
};

const COLOR_ELEMENTS = new Set(["srgbClr", "schemeClr", "sysClr", "prstClr", "scrgbClr", "hslClr"]);

const resolveColorElement = (
  colorEl: Element,
  ctx: ColorContext,
  placeholderColor: Rgba | null,
): Rgba | null => {
  let base: Rgba | null = null;
  const val = colorEl.getAttribute("val") ?? "";

  switch (colorEl.localName) {
    case "srgbClr":
      base = hexToRgba(val);
      break;
    case "sysClr":
      base = hexToRgba(colorEl.getAttribute("lastClr") ?? SYS_COLORS[val] ?? "");
      break;
    case "prstClr":
      base = hexToRgba(PRESET_COLORS[val] ?? "");
      break;
    case "scrgbClr": {
      const channel = (name: string) =>
        Math.round(clamp((Number(colorEl.getAttribute(name)) || 0) / 100000) * 255);
      base = { r: channel("r"), g: channel("g"), b: channel("b"), a: 1 };
      break;
    }
    case "hslClr":
      base = hslToRgb(
        (Number(colorEl.getAttribute("hue")) || 0) / 21600000,
        (Number(colorEl.getAttribute("sat")) || 0) / 100000,
        (Number(colorEl.getAttribute("lum")) || 0) / 100000,
        1,
      );
      break;
    case "schemeClr": {
      if (val === "phClr") {
        base = placeholderColor ? { ...placeholderColor } : null;
      } else {
        const slot = ctx.clrMap[val] ?? val;
        const hex = ctx.theme.colors[slot] ?? ctx.theme.colors[val];
        base = hex ? hexToRgba(hex) : null;
      }
      break;
    }
    default:
      return null;
  }

  return base ? applyColorTransforms(base, colorEl) : null;
};

/** The colour inside a fill-like container (a:solidFill, a:gs, a:ln/solidFill ...). */
const colorOf = (
  container: Element | null | undefined,
  ctx: ColorContext,
  placeholderColor: Rgba | null = null,
): Rgba | null => {
  if (!container) return null;
  const colorEl = Array.from(container.children).find((child) =>
    COLOR_ELEMENTS.has(child.localName),
  );
  return colorEl ? resolveColorElement(colorEl, ctx, placeholderColor) : null;
};

// ---- Fills ------------------------------------------------------------------------

type DesignFill =
  | { type: "none" }
  | { type: "solid"; color: Rgba }
  | { type: "gradient"; css: string; fallback: Rgba }
  | { type: "image"; part: string; crop: ImageCrop; alpha: number };

const FILL_ELEMENTS = new Set(["noFill", "solidFill", "gradFill", "blipFill", "pattFill"]);

const readCrop = (blipFill: Element | null): ImageCrop => {
  const src = firstChild(blipFill, "srcRect");
  const read = (name: string) => clamp((Number(src?.getAttribute(name)) || 0) / 100000, 0, 0.95);
  return { l: read("l"), t: read("t"), r: read("r"), b: read("b") };
};

const gradientFill = (
  gradFill: Element,
  ctx: ColorContext,
  placeholderColor: Rgba | null,
): DesignFill => {
  const stops = childrenNamed(firstChild(gradFill, "gsLst"), "gs")
    .map((stop) => ({
      pos: clamp((Number(stop.getAttribute("pos")) || 0) / 100000),
      color: colorOf(stop, ctx, placeholderColor),
    }))
    .filter((stop): stop is { pos: number; color: Rgba } => Boolean(stop.color))
    .sort((a, b) => a.pos - b.pos);
  if (stops.length === 0) return { type: "none" };

  const average = stops.reduce(
    (sum, stop) => ({
      r: sum.r + stop.color.r / stops.length,
      g: sum.g + stop.color.g / stops.length,
      b: sum.b + stop.color.b / stops.length,
      a: sum.a + stop.color.a / stops.length,
    }),
    { r: 0, g: 0, b: 0, a: 0 },
  );
  if (stops.length === 1) return { type: "solid", color: stops[0].color };

  const list = stops
    .map((stop) => `${rgbaToCss(stop.color)} ${Math.round(stop.pos * 1000) / 10}%`)
    .join(", ");
  const path = firstChild(gradFill, "path");
  if (path) {
    return { type: "gradient", css: `radial-gradient(circle at 50% 50%, ${list})`, fallback: average };
  }
  const angle = (Number(firstChild(gradFill, "lin")?.getAttribute("ang")) || 0) / 60000;
  // DrawingML angles run clockwise from "left to right"; CSS from "bottom to top"
  const css = `linear-gradient(${Math.round(((angle + 90) % 360) * 10) / 10}deg, ${list})`;
  return { type: "gradient", css, fallback: average };
};

const parseFillElement = (
  fillEl: Element,
  ctx: ColorContext,
  part: PartRefs | null,
  placeholderColor: Rgba | null,
): DesignFill | null => {
  switch (fillEl.localName) {
    case "noFill":
      return { type: "none" };
    case "solidFill": {
      const color = colorOf(fillEl, ctx, placeholderColor);
      return color ? { type: "solid", color } : null;
    }
    case "pattFill": {
      const color = colorOf(firstChild(fillEl, "fgClr"), ctx, placeholderColor);
      return color ? { type: "solid", color } : null;
    }
    case "gradFill":
      return gradientFill(fillEl, ctx, placeholderColor);
    case "blipFill": {
      const blip = firstChild(fillEl, "blip");
      const rel = part?.rels.get(blip?.getAttributeNS(NS_RELATIONSHIPS, "embed") ?? "");
      if (!part || !rel) return null;
      const target = resolvePath(directoryOf(part.path), rel.target);
      const alpha = percentOf(firstChild(blip, "alphaModFix"), "amt", 1);
      return { type: "image", part: target, crop: readCrop(fillEl), alpha };
    }
    default:
      return null;
  }
};

const percentOf = (el: Element | null | undefined, attr: string, fallback: number): number => {
  const raw = el?.getAttribute(attr);
  return raw == null ? fallback : clamp(Number(raw) / 100000);
};

/** First explicit fill among the children of a container such as a:spPr. */
const fillOfContainer = (
  container: Element | null | undefined,
  ctx: ColorContext,
  part: PartRefs | null,
  placeholderColor: Rgba | null = null,
): DesignFill | null => {
  if (!container) return null;
  const fillEl = Array.from(container.children).find((child) => FILL_ELEMENTS.has(child.localName));
  return fillEl ? parseFillElement(fillEl, ctx, part, placeholderColor) : null;
};

/** A background fill: <p:bgPr> carries it directly, <p:bgRef> points into the theme. */
const backgroundFillOf = (
  bg: Element | null,
  theme: Theme,
  ctx: ColorContext,
  part: PartRefs,
): DesignFill | null => {
  if (!bg) return null;
  const bgPr = firstChild(bg, "bgPr");
  if (bgPr) return fillOfContainer(bgPr, ctx, part);

  const bgRef = firstChild(bg, "bgRef");
  if (!bgRef) return null;
  const index = Number(bgRef.getAttribute("idx")) || 0;
  const placeholderColor = colorOf(bgRef, ctx);
  const styleEl = index >= 1001 ? theme.bgFillStyles[index - 1001] : theme.fillStyles[index - 1];
  return styleEl ? parseFillElement(styleEl, ctx, null, placeholderColor) : null;
};

// ---- Fonts ------------------------------------------------------------------------

const SANS_FALLBACK = "Inter, Arial, Helvetica, sans-serif";
const SERIF_FALLBACK = 'Georgia, "Times New Roman", serif';

const KNOWN_FONTS: Record<string, string> = {
  calibri: `Calibri, Carlito, "Segoe UI", ${SANS_FALLBACK}`,
  "calibri light": `"Calibri Light", Calibri, Carlito, "Segoe UI", ${SANS_FALLBACK}`,
  arial: "Arial, Helvetica, sans-serif",
  "arial black": '"Arial Black", Arial, Helvetica, sans-serif',
  "arial narrow": '"Arial Narrow", Arial, Helvetica, sans-serif',
  helvetica: "Helvetica, Arial, sans-serif",
  verdana: "Verdana, Geneva, sans-serif",
  tahoma: "Tahoma, Geneva, sans-serif",
  "trebuchet ms": '"Trebuchet MS", Helvetica, sans-serif',
  "segoe ui": `"Segoe UI", ${SANS_FALLBACK}`,
  "century gothic": `"Century Gothic", ${SANS_FALLBACK}`,
  impact: "Impact, Haettenschweiler, sans-serif",
  "comic sans ms": '"Comic Sans MS", cursive, sans-serif',
  georgia: SERIF_FALLBACK,
  "times new roman": '"Times New Roman", Times, serif',
  cambria: `Cambria, ${SERIF_FALLBACK}`,
  garamond: `Garamond, ${SERIF_FALLBACK}`,
  "palatino linotype": `"Palatino Linotype", Palatino, ${SERIF_FALLBACK}`,
  "book antiqua": `"Book Antiqua", Palatino, ${SERIF_FALLBACK}`,
  "courier new": '"Courier New", Courier, monospace',
  consolas: "Consolas, Menlo, monospace",
  inter: SANS_FALLBACK,
};

const SERIF_HINT = /serif(?!.*sans)|roman|garamond|palatino|bookman|schoolbook|minion|baskerville|caslon|didot|cambria|georgia|times/i;

/** Installed-font fallbacks so an unknown PowerPoint font still reads like it. */
export const fontStackFor = (typeface: string): string => {
  const known = KNOWN_FONTS[typeface.trim().toLowerCase()];
  if (known) return known;
  const quoted = /\s/.test(typeface) ? `"${typeface}"` : typeface;
  return `${quoted}, ${SERIF_HINT.test(typeface) ? SERIF_FALLBACK : SANS_FALLBACK}`;
};

const isKnownFont = (typeface: string) => typeface.trim().toLowerCase() in KNOWN_FONTS;

const WINGDINGS_BULLETS: Record<string, string> = {
  "§": "▪",
  Ø: "➢",
  ü: "✓",
  q: "❑",
  l: "●",
  n: "■",
  u: "◆",
  v: "❖",
  p: "■",
  á: "◆",
  "": "•",
};

// ---- Geometry ---------------------------------------------------------------------

interface Affine {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
}

const IDENTITY: Affine = { sx: 1, sy: 1, tx: 0, ty: 0 };

interface Xfrm {
  x: number;
  y: number;
  cx: number;
  cy: number;
  rot: number; // degrees
  flipH: boolean;
  flipV: boolean;
  chOff?: { x: number; y: number };
  chExt?: { cx: number; cy: number };
}

const readXfrm = (xfrm: Element | null | undefined): Xfrm | null => {
  if (!xfrm) return null;
  const off = firstChild(xfrm, "off");
  const ext = firstChild(xfrm, "ext");
  if (!off || !ext) return null;
  const chOff = firstChild(xfrm, "chOff");
  const chExt = firstChild(xfrm, "chExt");
  return {
    x: Number(off.getAttribute("x")) || 0,
    y: Number(off.getAttribute("y")) || 0,
    cx: Number(ext.getAttribute("cx")) || 0,
    cy: Number(ext.getAttribute("cy")) || 0,
    rot: (Number(xfrm.getAttribute("rot")) || 0) / 60000,
    flipH: xfrm.getAttribute("flipH") === "1" || xfrm.getAttribute("flipH") === "true",
    flipV: xfrm.getAttribute("flipV") === "1" || xfrm.getAttribute("flipV") === "true",
    chOff: chOff
      ? { x: Number(chOff.getAttribute("x")) || 0, y: Number(chOff.getAttribute("y")) || 0 }
      : undefined,
    chExt: chExt
      ? { cx: Number(chExt.getAttribute("cx")) || 0, cy: Number(chExt.getAttribute("cy")) || 0 }
      : undefined,
  };
};

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const POLYGONS: Record<string, string> = {
  triangle: "polygon(50% 0%, 0% 100%, 100% 100%)",
  rtTriangle: "polygon(0% 0%, 0% 100%, 100% 100%)",
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  hexagon: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
  pentagon: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
  parallelogram: "polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)",
  trapezoid: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
  rightArrow: "polygon(0% 25%, 60% 25%, 60% 0%, 100% 50%, 60% 100%, 60% 75%, 0% 75%)",
  leftArrow: "polygon(100% 25%, 40% 25%, 40% 0%, 0% 50%, 40% 100%, 40% 75%, 100% 75%)",
  upArrow: "polygon(25% 100%, 25% 40%, 0% 40%, 50% 0%, 100% 40%, 75% 40%, 75% 100%)",
  downArrow: "polygon(25% 0%, 75% 0%, 75% 60%, 100% 60%, 50% 100%, 0% 60%, 25% 60%)",
  chevron: "polygon(0% 0%, 70% 0%, 100% 50%, 70% 100%, 0% 100%, 30% 50%)",
  homePlate: "polygon(0% 0%, 75% 0%, 100% 50%, 75% 100%, 0% 100%)",
  plus: "polygon(33% 0%, 67% 0%, 67% 33%, 100% 33%, 100% 67%, 67% 67%, 67% 100%, 33% 100%, 33% 67%, 0% 67%, 0% 33%, 33% 33%)",
  star5:
    "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
};

const ROUNDED_RECTS = new Set([
  "roundRect",
  "round1Rect",
  "round2SameRect",
  "round2DiagRect",
  "snipRoundRect",
]);
const PLAIN_RECTS = new Set([
  "rect",
  "flowChartProcess",
  "flowChartAlternateProcess",
  "snip1Rect",
  "snip2SameRect",
  "snip2DiagRect",
  "frame",
  "bevel",
  "plaque",
  "foldedCorner",
  "textBox",
]);
const LINE_PRESETS = new Set([
  "line",
  "straightConnector1",
  "bentConnector2",
  "bentConnector3",
  "curvedConnector3",
]);

// ---- Text styling -----------------------------------------------------------------

interface RunSpec {
  text: string;
  color: string;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  letterSpacing: number;
  upper: boolean;
}

interface ParaSpec {
  align: "left" | "center" | "right" | "justify";
  lineHeight: number;
  spaceBefore: number;
  spaceAfter: number;
  marginLeft: number;
  indent: number;
  bullet: string | null;
  runs: RunSpec[];
}

const ALIGN: Record<string, ParaSpec["align"]> = {
  l: "left",
  ctr: "center",
  r: "right",
  just: "justify",
  dist: "justify",
  justLow: "justify",
};

const BASE_LINE_HEIGHT = 1.2;

const attrFrom = (chain: (Element | null)[], name: string): string | null => {
  for (const el of chain) {
    const value = el?.getAttribute(name);
    if (value != null) return value;
  }
  return null;
};

const childFrom = (chain: (Element | null)[], name: string): Element | null => {
  for (const el of chain) {
    const child = firstChild(el, name);
    if (child) return child;
  }
  return null;
};

const flag = (value: string | null, fallback: boolean) =>
  value == null ? fallback : value === "1" || value === "true";

const toRoman = (value: number): string => {
  const table: [number, string][] = [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let rest = value;
  let out = "";
  for (const [amount, symbol] of table) {
    while (rest >= amount) {
      out += symbol;
      rest -= amount;
    }
  }
  return out;
};

const toAlpha = (value: number): string => {
  let rest = value;
  let out = "";
  while (rest > 0) {
    const digit = (rest - 1) % 26;
    out = String.fromCharCode(97 + digit) + out;
    rest = Math.floor((rest - 1) / 26);
  }
  return out || "a";
};

const autoNumberLabel = (type: string, value: number): string => {
  const suffix = type.endsWith("ParenR") ? ")" : type.endsWith("ParenBoth") ? ")" : type.endsWith("Period") ? "." : "";
  const prefix = type.endsWith("ParenBoth") ? "(" : "";
  let body: string;
  if (type.startsWith("alphaUc")) body = toAlpha(value).toUpperCase();
  else if (type.startsWith("alphaLc")) body = toAlpha(value);
  else if (type.startsWith("romanUc")) body = toRoman(value).toUpperCase();
  else if (type.startsWith("romanLc")) body = toRoman(value);
  else body = String(value);
  return `${prefix}${body}${suffix}`;
};

// ---- Placeholder inheritance ------------------------------------------------------

interface PlaceholderInfo {
  type: string;
  idx: string | null;
}

const readPlaceholder = (shape: Element): PlaceholderInfo | null => {
  const ph = byLocalName(shape, "ph")[0];
  if (!ph) return null;
  return { type: ph.getAttribute("type") ?? "", idx: ph.getAttribute("idx") };
};

const normalizePlaceholderType = (type: string): string => {
  switch (type) {
    case "ctrTitle":
    case "title":
      return "title";
    case "dt":
    case "ftr":
    case "sldNum":
      return type;
    default:
      return "body"; // body, subTitle, obj, tbl, chart, pic, media ...
  }
};

const findPlaceholderShape = (
  spTree: Element | null,
  ph: PlaceholderInfo,
): Element | null => {
  if (!spTree) return null;
  const candidates = childrenNamed(spTree, "sp").filter((sp) => readPlaceholder(sp));
  if (ph.idx != null) {
    const byIdx = candidates.find((sp) => readPlaceholder(sp)?.idx === ph.idx);
    if (byIdx) return byIdx;
  }
  const wanted = normalizePlaceholderType(ph.type);
  return (
    candidates.find((sp) => {
      const info = readPlaceholder(sp);
      return info != null && normalizePlaceholderType(info.type) === wanted;
    }) ?? null
  );
};

const spPrOf = (shape: Element | null): Element | null => firstChild(shape, "spPr");
const txBodyOf = (shape: Element | null): Element | null => firstChild(shape, "txBody");
const cNvPrOf = (shape: Element): Element | null => {
  const nv = Array.from(shape.children).find((child) => child.localName.startsWith("nv"));
  return firstChild(nv, "cNvPr");
};

// ---- The builder ------------------------------------------------------------------

type ShapeSource = "slide" | "layout" | "master";

interface BuildState {
  source: PresentationSource;
  slide: SlideSource;
  measure: FidelityMeasurer;
  k: number; // EMU -> canvas px
  offsetX: number;
  offsetY: number;
  pxPerPt: number;
  frame: Box; // the slide rectangle inside the artboard
  elements: any[];
  needs: Map<string, ImageNeed>;
  notes: DesignNote[];
  noteKeys: Set<string>;
  sequence: number;
  unknownFonts: Set<string>;
  slideNumberText: string;
}

const note = (state: BuildState, level: DesignNote["level"], message: string) => {
  const key = `${level}:${message}`;
  if (state.noteKeys.has(key)) return;
  state.noteKeys.add(key);
  state.notes.push({ level, message });
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const toBox = (xf: Xfrm, affine: Affine, state: BuildState): Box => ({
  x: (xf.x * affine.sx + affine.tx) * state.k + state.offsetX,
  y: (xf.y * affine.sy + affine.ty) * state.k + state.offsetY,
  w: xf.cx * affine.sx * state.k,
  h: xf.cy * affine.sy * state.k,
});

const intersect = (a: Box, b: Box): Box | null => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  return right - x > 0.5 && bottom - y > 0.5 ? { x, y, w: right - x, h: bottom - y } : null;
};

const baseElement = (state: BuildState, layerName: string, box: Box, rotation: number) => ({
  id: `imp-${++state.sequence}`,
  layerName,
  x: round2(box.x),
  y: round2(box.y),
  width: round2(box.w),
  height: round2(box.h),
  rotation: round2(rotation),
  opacity: 100,
  locked: false,
  hidden: false,
});

const MAX_IMAGE_EDGE = 1920;

/** Registers a picture to be rendered at the box's aspect, and returns its key. */
const needImage = (
  state: BuildState,
  part: string,
  crop: ImageCrop,
  flipH: boolean,
  flipV: boolean,
  box: Box,
): string => {
  // Rendered at 2x the artboard size so it stays sharp on a 1080p output
  const scale = Math.min(2, MAX_IMAGE_EDGE / Math.max(box.w, box.h));
  const outWidth = Math.max(2, Math.round(box.w * scale));
  const outHeight = Math.max(2, Math.round(box.h * scale));
  const key = [
    part,
    [crop.l, crop.t, crop.r, crop.b].map((v) => v.toFixed(4)).join(","),
    flipH ? "h" : "",
    flipV ? "v" : "",
    `${outWidth}x${outHeight}`,
  ].join("|");
  if (!state.needs.has(key)) {
    state.needs.set(key, { key, part, crop, flipH, flipV, outWidth, outHeight });
  }
  return key;
};

/** Narrows an image's box to the visible slide area, trimming the picture to match. */
const clipImageToFrame = (
  box: Box,
  crop: ImageCrop,
  frame: Box,
): { box: Box; crop: ImageCrop } | null => {
  const visible = intersect(box, frame);
  if (!visible) return null;
  if (visible.x === box.x && visible.y === box.y && visible.w === box.w && visible.h === box.h) {
    return { box, crop };
  }
  const spanX = 1 - crop.l - crop.r;
  const spanY = 1 - crop.t - crop.b;
  return {
    box: visible,
    crop: {
      l: crop.l + spanX * ((visible.x - box.x) / box.w),
      r: crop.r + spanX * ((box.x + box.w - (visible.x + visible.w)) / box.w),
      t: crop.t + spanY * ((visible.y - box.y) / box.h),
      b: crop.b + spanY * ((box.y + box.h - (visible.y + visible.h)) / box.h),
    },
  };
};

interface TextLayerContext {
  color: ColorContext;
  part: PartRefs;
  source: ShapeSource;
  affine: Affine;
}

const colorContextFor = (slide: SlideSource): ColorContext => {
  const slideOverride = byLocalName(slide.doc, "overrideClrMapping")[0];
  return {
    theme: slide.layout.master.theme,
    clrMap: slideOverride
      ? attributesOf(slideOverride)
      : (slide.layout.clrMapOverride ?? slide.layout.master.clrMap),
  };
};

const partFor = (slide: SlideSource, source: ShapeSource): PartRefs => {
  if (source === "slide") return slide;
  if (source === "layout") return slide.layout;
  return slide.layout.master;
};

interface StyleRefs {
  fillRef: Element | null;
  lnRef: Element | null;
  fontRef: Element | null;
}

const styleRefsOf = (shape: Element): StyleRefs => {
  const style = firstChild(shape, "style");
  return {
    fillRef: firstChild(style, "fillRef"),
    lnRef: firstChild(style, "lnRef"),
    fontRef: firstChild(style, "fontRef"),
  };
};

interface Outline {
  width: number; // px
  color: Rgba;
}

const outlineOf = (
  spPr: Element | null,
  refs: StyleRefs,
  ctx: ColorContext,
  state: BuildState,
  inherited: Element[],
): Outline | null => {
  const chain = [spPr, ...inherited].map((el) => firstChild(el, "ln"));
  const ln = chain.find((el) => el != null) ?? null;
  const explicit = ln?.getAttribute("w");
  const lineFill = chain.map((el) => (el ? fillOfContainer(el, ctx, null) : null)).find((f) => f != null);

  let color: Rgba | null = null;
  let widthEmu: number | null = explicit != null ? Number(explicit) : null;

  if (lineFill) {
    if (lineFill.type === "none") return null;
    if (lineFill.type === "solid") color = lineFill.color;
  } else if (refs.lnRef && Number(refs.lnRef.getAttribute("idx")) > 0) {
    const index = Number(refs.lnRef.getAttribute("idx"));
    const themeLine = ctx.theme.lineStyles[index - 1];
    const phColor = colorOf(refs.lnRef, ctx);
    const themeFill = themeLine ? fillOfContainer(themeLine, ctx, null, phColor) : null;
    color = themeFill && themeFill.type === "solid" ? themeFill.color : phColor;
    if (widthEmu == null) widthEmu = Number(themeLine?.getAttribute("w")) || 12700;
  }

  if (!color) return null;
  const width = (widthEmu ?? 12700) * state.k;
  return width > 0.05 ? { width: Math.max(0.5, width), color } : null;
};

const fillForShape = (
  spPr: Element | null,
  inheritedPrs: Element[],
  refs: StyleRefs,
  ctx: ColorContext,
  part: PartRefs,
  inheritedParts: PartRefs[],
): DesignFill | null => {
  const own = fillOfContainer(spPr, ctx, part);
  if (own) return own;
  for (let i = 0; i < inheritedPrs.length; i++) {
    const inherited = fillOfContainer(inheritedPrs[i], ctx, inheritedParts[i] ?? part);
    if (inherited) return inherited;
  }
  if (refs.fillRef) {
    const index = Number(refs.fillRef.getAttribute("idx")) || 0;
    if (index > 0) {
      const phColor = colorOf(refs.fillRef, ctx);
      const styleEl = ctx.theme.fillStyles[index - 1];
      if (styleEl) return parseFillElement(styleEl, ctx, null, phColor);
    }
  }
  return null;
};

interface ResolvedShape {
  xfrm: Xfrm | null;
  layoutSp: Element | null;
  masterSp: Element | null;
  ph: PlaceholderInfo | null;
}

const resolveShape = (
  shape: Element,
  source: ShapeSource,
  slide: SlideSource,
  ownXfrm: Xfrm | null,
): ResolvedShape => {
  const ph = source === "slide" ? readPlaceholder(shape) : null;
  let layoutSp: Element | null = null;
  let masterSp: Element | null = null;
  if (ph) {
    layoutSp = findPlaceholderShape(slide.layout.spTree, ph);
    masterSp = findPlaceholderShape(
      slide.layout.master.spTree,
      layoutSp ? (readPlaceholder(layoutSp) ?? ph) : ph,
    );
  }
  const xfrm =
    ownXfrm ??
    readXfrm(firstChild(spPrOf(layoutSp), "xfrm")) ??
    readXfrm(firstChild(spPrOf(masterSp), "xfrm"));
  return { xfrm, layoutSp, masterSp, ph };
};

// ---- Text -------------------------------------------------------------------------

interface TextBuildInput {
  txBody: Element;
  box: Box; // shape box in px
  rotation: number;
  ctx: ColorContext;
  chains: {
    lst: (Element | null)[]; // lstStyle elements, highest priority first
    defaults: (Element | null)[]; // master txStyles / presentation defaults
  };
  bodyPrChain: (Element | null)[];
  fontRefColor: Rgba | null;
  layerName: string;
  /** Table cells carry their margins and anchor on a:tcPr instead of a:bodyPr (EMU) */
  cellBody?: { l: number; t: number; r: number; b: number; anchor: string };
}

const buildTextElement = (state: BuildState, input: TextBuildInput): any | null => {
  const { txBody, ctx, chains } = input;
  const bodyPrAttr = (name: string) => attrFrom(input.bodyPrChain, name);
  const autofit = childFrom(input.bodyPrChain, "normAutofit");
  const fontScale = autofit ? percentOf(autofit, "fontScale", 1) : 1;
  const lineReduction = autofit ? percentOf(autofit, "lnSpcReduction", 0) : 0;
  const spAutoFit = Boolean(childFrom(input.bodyPrChain, "spAutoFit"));

  const inset = (name: string, fallback: number) => {
    const raw = bodyPrAttr(name);
    return (raw != null ? Number(raw) : fallback) * state.k;
  };
  const insets = input.cellBody
    ? {
        l: input.cellBody.l * state.k,
        t: input.cellBody.t * state.k,
        r: input.cellBody.r * state.k,
        b: input.cellBody.b * state.k,
      }
    : {
        l: inset("lIns", 91440),
        t: inset("tIns", 45720),
        r: inset("rIns", 91440),
        b: inset("bIns", 45720),
      };

  const vert = bodyPrAttr("vert");
  if (vert && vert !== "horz") {
    note(state, "warning", "Vertical text is shown horizontally");
  }

  const wrapNone = bodyPrAttr("wrap") === "none";
  const anchor = input.cellBody?.anchor ?? bodyPrAttr("anchor") ?? "t";

  const paragraphs: ParaSpec[] = [];
  // Running auto-number per list level. A deeper level never breaks its parent's count;
  // a plain paragraph, or a different numbering style, restarts that level.
  const autoState: ({ type: string; value: number } | null)[] = [];

  const paraElements = childrenNamed(txBody, "p");
  paraElements.forEach((p) => {
    const pPr = firstChild(p, "pPr");
    const level = Math.min(8, Math.max(0, Number(pPr?.getAttribute("lvl")) || 0));
    const levelName = `lvl${level + 1}pPr`;
    const levelEls = [...chains.lst, ...chains.defaults].map((style) => firstChild(style, levelName));
    const paraChain = [pPr, ...levelEls];

    const runDefaults = [
      firstChild(pPr, "defRPr"),
      ...levelEls.map((el) => firstChild(el, "defRPr")),
    ];
    const explicitDefaults = [
      firstChild(pPr, "defRPr"),
      ...chains.lst.map((style) => firstChild(firstChild(style, levelName), "defRPr")),
    ];
    const baseDefaults = chains.defaults.map((style) => firstChild(firstChild(style, levelName), "defRPr"));

    const marL = Number(attrFrom(paraChain, "marL")) || 0;
    const indent = Number(attrFrom(paraChain, "indent")) || 0;
    const algn = attrFrom(paraChain, "algn") ?? "l";

    // Runs
    const runs: RunSpec[] = [];
    const endProps = firstChild(p, "endParaRPr");
    const runStyle = (rPr: Element | null): Omit<RunSpec, "text"> => {
      const runChain = [rPr, ...runDefaults];
      const sizeRaw = attrFrom(runChain, "sz");
      const size = (sizeRaw != null ? Number(sizeRaw) / 100 : 18) * state.pxPerPt * fontScale;

      const explicitColor = colorOf(childFrom([rPr, ...explicitDefaults], "solidFill"), ctx);
      const isLink = Boolean(firstChild(rPr, "hlinkClick"));
      const linkColor = isLink ? hexToRgba(ctx.theme.colors.hlink ?? "") : null;
      const color =
        explicitColor ??
        linkColor ??
        input.fontRefColor ??
        colorOf(childFrom(baseDefaults, "solidFill"), ctx) ??
        hexToRgba(ctx.theme.colors[ctx.clrMap.tx1 ?? "dk1"] ?? "000000");

      const latin = childFrom(runChain, "latin")?.getAttribute("typeface");
      let typeface = latin || ctx.theme.minorFont;
      if (typeface === "+mj-lt") typeface = ctx.theme.majorFont;
      else if (typeface === "+mn-lt") typeface = ctx.theme.minorFont;
      if (!isKnownFont(typeface)) state.unknownFonts.add(typeface);

      const underline = attrFrom(runChain, "u");
      const strike = attrFrom(runChain, "strike");
      const spacing = Number(attrFrom(runChain, "spc")) || 0;
      return {
        color: color ? rgbaToCss(color) : "#000000",
        fontSize: round2(Math.max(1, size)),
        fontFamily: fontStackFor(typeface),
        bold: flag(attrFrom(runChain, "b"), false),
        italic: flag(attrFrom(runChain, "i"), false),
        underline: isLink || Boolean(underline && underline !== "none"),
        strike: Boolean(strike && strike !== "noStrike"),
        letterSpacing: round2((spacing / 100) * state.pxPerPt),
        upper: attrFrom(runChain, "cap") === "all",
      };
    };

    Array.from(p.children).forEach((child) => {
      if (child.localName === "r" || child.localName === "fld") {
        const rPr = firstChild(child, "rPr");
        let text = byLocalName(child, "t")
          .map((t) => t.textContent ?? "")
          .join("");
        if (child.localName === "fld" && /slidenum/i.test(child.getAttribute("type") ?? "")) {
          text = state.slideNumberText;
        }
        if (text) runs.push({ text, ...runStyle(rPr) });
      } else if (child.localName === "br") {
        const rPr = firstChild(child, "rPr");
        runs.push({ text: "\n", ...runStyle(rPr) });
      }
    });

    const hasText = runs.some((run) => run.text.trim().length > 0);
    if (runs.length === 0) {
      // Empty paragraph: keep its height using the paragraph-end formatting
      runs.push({ text: "", ...runStyle(endProps) });
    }
    const maxSize = Math.max(...runs.map((run) => run.fontSize));

    // Line and paragraph spacing
    const spacingOf = (name: string): { pts?: number; pct?: number } | null => {
      const el = childFrom(paraChain, name);
      const pts = firstChild(el, "spcPts");
      if (pts) return { pts: (Number(pts.getAttribute("val")) || 0) / 100 };
      const pct = firstChild(el, "spcPct");
      if (pct) return { pct: percent(pct) };
      return null;
    };
    const lineSpacing = spacingOf("lnSpc");
    let lineHeight = BASE_LINE_HEIGHT;
    if (lineSpacing?.pct != null) {
      lineHeight = BASE_LINE_HEIGHT * lineSpacing.pct;
    } else if (lineSpacing?.pts != null) {
      lineHeight = (lineSpacing.pts * state.pxPerPt) / maxSize;
    }
    lineHeight = Math.max(0.7, lineHeight * (1 - lineReduction));

    const gap = (name: string) => {
      const spec = spacingOf(name);
      if (spec?.pts != null) return spec.pts * state.pxPerPt * fontScale;
      if (spec?.pct != null) return spec.pct * maxSize * BASE_LINE_HEIGHT;
      return 0;
    };

    // Bullets
    let bullet: string | null = null;
    autoState.length = Math.min(autoState.length, level + 1);
    if (hasText && !childFrom(paraChain, "buNone")) {
      const auto = childFrom(paraChain, "buAutoNum");
      const char = childFrom(paraChain, "buChar");
      if (auto) {
        const type = auto.getAttribute("type") ?? "arabicPeriod";
        const startAt = Number(auto.getAttribute("startAt")) || 1;
        const previous = autoState[level];
        const value = previous && previous.type === type ? previous.value + 1 : startAt;
        autoState[level] = { type, value };
        bullet = autoNumberLabel(type, value);
      } else {
        autoState[level] = null;
        if (char) {
          const raw = char.getAttribute("char") ?? "•";
          const font = childFrom(paraChain, "buFont")?.getAttribute("typeface") ?? "";
          bullet = /wingdings|symbol/i.test(font) ? (WINGDINGS_BULLETS[raw] ?? "•") : raw;
        }
      }
    } else {
      autoState[level] = null;
    }

    paragraphs.push({
      align: ALIGN[algn] ?? "left",
      lineHeight: round2(lineHeight),
      spaceBefore: round2(gap("spcBef")),
      spaceAfter: round2(gap("spcAft")),
      marginLeft: round2(marL * state.k),
      indent: round2(indent * state.k),
      bullet,
      runs,
    });
  });

  const plain = paragraphs.map((para) => para.runs.map((run) => run.text).join("")).join("\n");
  if (!plain.trim()) return null;

  // Text area inside the shape
  const available: Box = {
    x: input.box.x + insets.l,
    y: input.box.y + insets.t,
    w: Math.max(1, input.box.w - insets.l - insets.r),
    h: Math.max(1, input.box.h - insets.t - insets.b),
  };

  // Keep every word inside the frame. Boxes set to "shrink text on overflow" must fit
  // their own height (PowerPoint stores the scale, but our fonts can be wider); other
  // boxes may spill past their box as authored, but never past the slide edge.
  const fits = (blockHeight: number) => {
    if (autofit) return blockHeight <= available.h + 0.5;
    const top =
      anchor === "ctr"
        ? available.y + (available.h - blockHeight) / 2
        : anchor === "b"
          ? available.y + available.h - blockHeight
          : available.y;
    return top >= state.frame.y - 0.5 && top + blockHeight <= state.frame.y + state.frame.h + 0.5;
  };

  let currentHeight = measureParagraphs(state, paragraphs, available.w, wrapNone);
  let shrunk = false;
  for (let attempt = 0; attempt < 16 && !fits(currentHeight); attempt++) {
    scaleParagraphs(paragraphs, 0.94);
    shrunk = true;
    currentHeight = measureParagraphs(state, paragraphs, available.w, wrapNone);
  }
  if (shrunk) {
    note(state, "info", "Some text was made slightly smaller to stay inside the slide");
    if (!fits(currentHeight)) {
      note(state, "warning", "Some text is too long to fit and may run past its box");
    }
  }

  const first = paragraphs[0].runs[0];
  const clipped = intersect(available, state.frame);
  const textBox = clipped ?? available;
  const rich = paragraphs.map((para) => ({
    align: para.align,
    lineHeight: para.lineHeight,
    spaceBefore: para.spaceBefore,
    spaceAfter: para.spaceAfter,
    marginLeft: para.marginLeft,
    indent: para.indent,
    bullet: para.bullet,
    runs: para.runs.map((run) => ({ ...run })),
  }));

  return {
    ...baseElement(state, input.layerName, textBox, input.rotation),
    type: "text",
    content: plain,
    color: first.color,
    fontSize: first.fontSize,
    fontFamily: first.fontFamily,
    fontWeight: first.bold ? "Bold" : "Normal",
    lineHeight: paragraphs[0].lineHeight,
    letterSpacing: first.letterSpacing,
    textAlign: paragraphs[0].align,
    alignVertical: anchor === "ctr" ? "middle" : anchor === "b" ? "bottom" : "top",
    textSizing: "Box",
    textWrap: wrapNone ? "No-wrap" : "Multi-line",
    noWrap: wrapNone,
    dropShadow: false,
    stroke: false,
    richText: rich,
  };
};

const scaleParagraphs = (paragraphs: ParaSpec[], factor: number) => {
  paragraphs.forEach((para) => {
    para.spaceBefore = round2(para.spaceBefore * factor);
    para.spaceAfter = round2(para.spaceAfter * factor);
    para.runs.forEach((run) => {
      run.fontSize = round2(Math.max(4, run.fontSize * factor));
      run.letterSpacing = round2(run.letterSpacing * factor);
    });
  });
};

const measureParagraphs = (
  state: BuildState,
  paragraphs: ParaSpec[],
  width: number,
  noWrap: boolean,
): number => {
  let total = 0;
  paragraphs.forEach((para, index) => {
    const maxSize = Math.max(...para.runs.map((run) => run.fontSize));
    const text = para.runs.map((run) => run.text).join("");
    // The longest run stands in for the paragraph's style when measuring
    const sample = para.runs.reduce((a, b) => (b.text.length > a.text.length ? b : a), para.runs[0]);
    const usable = Math.max(10, (width - para.marginLeft) * 0.96);
    const measure = (value: string) =>
      state.measure(value, sample.fontSize, sample.bold, sample.italic, sample.fontFamily) +
      sample.letterSpacing * value.length;

    let lines = 0;
    text.split("\n").forEach((segment) => {
      if (noWrap || !segment.trim()) {
        lines += 1;
        return;
      }
      let current = "";
      let count = 1;
      segment.split(/\s+/).filter(Boolean).forEach((word) => {
        const candidate = current ? `${current} ${word}` : word;
        if (measure(candidate) <= usable || !current) {
          current = candidate;
          // A single over-long word wraps inside the box by characters
          if (!candidate.includes(" ") && measure(candidate) > usable) {
            count += Math.floor(measure(candidate) / usable);
          }
        } else {
          count += 1;
          current = word;
        }
      });
      lines += count;
    });

    total += lines * maxSize * para.lineHeight + para.spaceAfter;
    if (index > 0) total += para.spaceBefore;
  });
  return total;
};

// ---- Shapes -----------------------------------------------------------------------

interface DrawContext {
  source: ShapeSource;
  affine: Affine;
  ctx: ColorContext;
}

const emitFillShape = (
  state: BuildState,
  layerName: string,
  box: Box,
  rotation: number,
  fill: DesignFill | null,
  outline: Outline | null,
  geometry: { preset: string; radius: number },
) => {
  const visibleFill = fill && fill.type !== "none" ? fill : null;
  if (!visibleFill && !outline) return;

  const clipped = intersect(box, state.frame);
  if (!clipped) return;

  const common: Record<string, unknown> = {};
  if (geometry.preset === "ellipse" || geometry.preset === "flowChartConnector") {
    common.borderRadius = "50%";
  } else if (ROUNDED_RECTS.has(geometry.preset)) {
    common.borderRadius = round2(Math.min(geometry.radius, Math.min(clipped.w, clipped.h) / 2));
  } else if (POLYGONS[geometry.preset]) {
    common.clipPath = POLYGONS[geometry.preset];
  }

  if (visibleFill?.type === "image") {
    // Picture-filled shape: drawn as a picture so every viewer shows it
    const trimmed = clipImageToFrame(box, visibleFill.crop, state.frame);
    if (!trimmed) return;
    const key = needImage(state, visibleFill.part, trimmed.crop, false, false, trimmed.box);
    state.elements.push({
      ...baseElement(state, layerName, trimmed.box, rotation),
      opacity: Math.round(visibleFill.alpha * 100),
      type: "image",
      content: "",
      imageKey: key,
      ...common,
    });
    return;
  }

  const element: Record<string, unknown> = {
    ...baseElement(state, layerName, clipped, rotation),
    type: "rect",
    color: "transparent",
    ...common,
  };
  if (visibleFill?.type === "solid") {
    element.color = rgbaToCss(visibleFill.color);
  } else if (visibleFill?.type === "gradient") {
    element.color = rgbaToCss(visibleFill.fallback);
    element.gradient = visibleFill.css;
  }
  if (outline) {
    element.borderColor = rgbaToCss(outline.color);
    element.borderWidth = round2(outline.width);
  }
  state.elements.push(element);
};

const geometryOf = (
  spPr: Element | null,
  box: Box,
  state: BuildState,
): { preset: string; radius: number; custom: boolean } => {
  const prst = firstChild(spPr, "prstGeom");
  if (prst) {
    const preset = prst.getAttribute("prst") ?? "rect";
    const adj = childrenNamed(firstChild(prst, "avLst"), "gd").find(
      (gd) => gd.getAttribute("name") === "adj" || gd.getAttribute("name") === "adj1",
    );
    const adjValue = Number(/val\s+(-?\d+)/.exec(adj?.getAttribute("fmla") ?? "")?.[1]);
    const ratio = Number.isFinite(adjValue) ? clamp(adjValue / 100000, 0, 0.5) : 0.16667;
    return { preset, radius: Math.min(box.w, box.h) * ratio, custom: false };
  }
  if (firstChild(spPr, "custGeom")) {
    note(state, "warning", "A freeform shape was simplified to its outline box");
    return { preset: "rect", radius: 0, custom: true };
  }
  return { preset: "rect", radius: 0, custom: false };
};

const drawShape = (shape: Element, draw: DrawContext, state: BuildState) => {
  const cNvPr = cNvPrOf(shape);
  if (cNvPr?.getAttribute("hidden") === "1") return;

  const placeholder = readPlaceholder(shape);
  // Layout/master placeholders are only prompts; they never show on a slide
  if (draw.source !== "slide" && placeholder) return;

  const spPr = spPrOf(shape);
  const ownXfrm = readXfrm(firstChild(spPr, "xfrm"));
  const resolved = resolveShape(shape, draw.source, state.slide, ownXfrm);
  if (!resolved.xfrm) return;

  const part = partFor(state.slide, draw.source);
  const xf = resolved.xfrm;
  // A placeholder that inherits its position is in slide space already
  const affine = ownXfrm ? draw.affine : IDENTITY;
  const box = toBox(xf, affine, state);
  const name = cNvPr?.getAttribute("name") || "Shape";
  const refs = styleRefsOf(shape);

  const inheritedPrs = [spPrOf(resolved.layoutSp), spPrOf(resolved.masterSp)].filter(
    (el): el is Element => el != null,
  );
  const inheritedParts: PartRefs[] = [];
  if (spPrOf(resolved.layoutSp)) inheritedParts.push(state.slide.layout);
  if (spPrOf(resolved.masterSp)) inheritedParts.push(state.slide.layout.master);

  const geometry = geometryOf(spPr ?? spPrOf(resolved.layoutSp) ?? spPrOf(resolved.masterSp), box, state);
  const fill = fillForShape(spPr, inheritedPrs, refs, draw.ctx, part, inheritedParts);
  const outline = outlineOf(spPr, refs, draw.ctx, state, inheritedPrs);

  if (LINE_PRESETS.has(geometry.preset)) {
    // Straight horizontal / vertical lines become thin bars
    const stroke = outline ?? (fill && fill.type === "solid" ? { width: 1, color: fill.color } : null);
    if (stroke) {
      const thickness = Math.max(1, stroke.width);
      if (box.h < 1.5) {
        emitFillShape(
          state,
          name,
          { x: box.x, y: box.y - thickness / 2, w: box.w, h: thickness },
          0,
          { type: "solid", color: stroke.color },
          null,
          { preset: "rect", radius: 0 },
        );
      } else if (box.w < 1.5) {
        emitFillShape(
          state,
          name,
          { x: box.x - thickness / 2, y: box.y, w: thickness, h: box.h },
          0,
          { type: "solid", color: stroke.color },
          null,
          { preset: "rect", radius: 0 },
        );
      } else {
        note(state, "warning", "A diagonal line or connector was left out");
      }
    }
    return;
  }

  const supported =
    PLAIN_RECTS.has(geometry.preset) ||
    ROUNDED_RECTS.has(geometry.preset) ||
    geometry.preset === "ellipse" ||
    geometry.preset === "flowChartConnector" ||
    Boolean(POLYGONS[geometry.preset]);
  if (!supported && !geometry.custom) {
    note(state, "warning", `The “${geometry.preset}” shape was simplified to a box`);
  }

  emitFillShape(state, name, box, xf.rot, fill, outline, geometry);

  // Text
  const txBody = txBodyOf(shape);
  if (!txBody) return;

  const phType = placeholder?.type ?? "";
  const txStyles = state.slide.layout.master.txStyles;
  const styleFor = (): Element | null => {
    if (!placeholder) return txStyles.other;
    const type = normalizePlaceholderType(phType);
    if (type === "title") return txStyles.title;
    if (type === "body") return txStyles.body;
    return txStyles.other;
  };
  const lst = (el: Element | null) => firstChild(txBodyOf(el), "lstStyle");
  const fontRefColor = refs.fontRef ? colorOf(refs.fontRef, draw.ctx) : null;

  const text = buildTextElement(state, {
    txBody,
    box,
    rotation: xf.rot,
    ctx: draw.ctx,
    chains: {
      lst: [firstChild(txBody, "lstStyle"), lst(resolved.layoutSp), lst(resolved.masterSp)],
      defaults: [styleFor(), state.source.defaultTextStyle],
    },
    bodyPrChain: [
      firstChild(txBody, "bodyPr"),
      firstChild(txBodyOf(resolved.layoutSp), "bodyPr"),
      firstChild(txBodyOf(resolved.masterSp), "bodyPr"),
    ],
    fontRefColor,
    layerName: name,
  });
  if (text) state.elements.push(text);
};

const drawPicture = (pic: Element, draw: DrawContext, state: BuildState) => {
  const cNvPr = cNvPrOf(pic);
  if (cNvPr?.getAttribute("hidden") === "1") return;
  const spPr = spPrOf(pic);
  const xf = readXfrm(firstChild(spPr, "xfrm"));
  if (!xf) return;

  const blipFill = firstChild(pic, "blipFill");
  const blip = firstChild(blipFill, "blip");
  const part = partFor(state.slide, draw.source);
  const rel = part.rels.get(blip?.getAttributeNS(NS_RELATIONSHIPS, "embed") ?? "");
  const name = cNvPr?.getAttribute("name") || "Picture";

  if (byLocalName(pic, "videoFile").length > 0 || byLocalName(pic, "audioFile").length > 0) {
    note(state, "warning", "Video or audio isn't imported; its preview picture is shown");
  }
  if (!rel) {
    note(state, "warning", `Picture “${name}” could not be found in the file`);
    return;
  }
  const target = resolvePath(directoryOf(part.path), rel.target);
  const extension = target.split(".").pop()?.toLowerCase() ?? "";
  if (!IMAGE_MIME_BY_EXTENSION[extension]) {
    note(
      state,
      "warning",
      `A .${extension || "unknown"} picture can't be shown in the browser and was left out`,
    );
    return;
  }

  const box = toBox(xf, draw.affine, state);
  const trimmed = clipImageToFrame(box, readCrop(blipFill), state.frame);
  if (!trimmed) return;

  const geometry = geometryOf(spPr, trimmed.box, state);
  const key = needImage(state, target, trimmed.crop, xf.flipH, xf.flipV, trimmed.box);
  const shapeStyle: Record<string, unknown> = {};
  if (geometry.preset === "ellipse") shapeStyle.borderRadius = "50%";
  else if (ROUNDED_RECTS.has(geometry.preset)) {
    shapeStyle.borderRadius = round2(Math.min(geometry.radius, Math.min(trimmed.box.w, trimmed.box.h) / 2));
  } else if (POLYGONS[geometry.preset]) shapeStyle.clipPath = POLYGONS[geometry.preset];

  state.elements.push({
    ...baseElement(state, name, trimmed.box, xf.rot),
    opacity: Math.round(percentOf(firstChild(blip, "alphaModFix"), "amt", 1) * 100),
    type: "image",
    content: "",
    imageKey: key,
    ...shapeStyle,
  });
};

// ---- Tables -----------------------------------------------------------------------

interface BorderEdge {
  width: number;
  color: Rgba;
}

const edgeWidth = (ln: Element, state: BuildState): number =>
  Math.max(1, (Number(ln.getAttribute("w")) || 12700) * state.k);

/** One edge of a table-style part: undefined = not specified, null = no line. */
const styleEdge = (
  part: Element | null,
  key: string,
  ctx: ColorContext,
  state: BuildState,
): BorderEdge | null | undefined => {
  const ln = firstChild(firstChild(firstChild(firstChild(part, "tcStyle"), "tcBdr"), key), "ln");
  if (!ln) return undefined;
  const fill = fillOfContainer(ln, ctx, null);
  if (!fill) return undefined;
  return fill.type === "solid" ? { width: edgeWidth(ln, state), color: fill.color } : null;
};

// "Medium Style 2" in each accent colour is PowerPoint's default table look
const MEDIUM_STYLE_2_ACCENT: Record<string, string> = {
  "{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}": "accent1",
  "{21E4AEA4-8DFA-4A89-87EB-49C32662AFE0}": "accent2",
  "{F5AB1C69-6EDB-4FF4-983F-18BD219EF322}": "accent3",
  "{00A15C55-8517-42AA-B614-E9B94910E393}": "accent4",
  "{7DF18680-E054-41AD-8BC1-D1AEF772440D}": "accent5",
  "{93296810-A885-4BE3-A3E7-6D5BEEA58F35}": "accent6",
};

const builtInTableStyle = (styleId: string): Element | null => {
  const accent = MEDIUM_STYLE_2_ACCENT[styleId];
  if (!accent) return null;
  const line = '<a:ln w="12700" cmpd="sng"><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:ln>';
  const fill = (tint: string) =>
    `<a:fill><a:solidFill><a:schemeClr val="${accent}">${tint}</a:schemeClr></a:solidFill></a:fill>`;
  const xml =
    '<a:tblStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" styleId="builtin">' +
    '<a:wholeTbl><a:tcTxStyle><a:schemeClr val="dk1"/></a:tcTxStyle><a:tcStyle><a:tcBdr>' +
    `<a:left>${line}</a:left><a:right>${line}</a:right><a:top>${line}</a:top><a:bottom>${line}</a:bottom>` +
    `<a:insideH>${line}</a:insideH><a:insideV>${line}</a:insideV></a:tcBdr>${fill('<a:tint val="20000"/>')}</a:tcStyle></a:wholeTbl>` +
    `<a:band1H><a:tcStyle><a:tcBdr/>${fill('<a:tint val="40000"/>')}</a:tcStyle></a:band1H>` +
    "<a:band2H><a:tcStyle><a:tcBdr/></a:tcStyle></a:band2H>" +
    `<a:firstCol><a:tcTxStyle b="on"><a:schemeClr val="lt1"/></a:tcTxStyle><a:tcStyle><a:tcBdr/>${fill("")}</a:tcStyle></a:firstCol>` +
    '<a:firstRow><a:tcTxStyle b="on"><a:schemeClr val="lt1"/></a:tcTxStyle><a:tcStyle><a:tcBdr><a:bottom>' +
    '<a:ln w="38100" cmpd="sng"><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:ln></a:bottom></a:tcBdr>' +
    `${fill("")}</a:tcStyle></a:firstRow></a:tblStyle>`;
  return byLocalName(parseXml(xml), "tblStyle")[0] ?? null;
};

const drawTable = (frame: Element, tbl: Element, xf: Xfrm, draw: DrawContext, state: BuildState) => {
  const grid = childrenNamed(firstChild(tbl, "tblGrid"), "gridCol").map(
    (col) => (Number(col.getAttribute("w")) || 0) * draw.affine.sx * state.k,
  );
  const rows = childrenNamed(tbl, "tr");
  if (grid.length === 0 || rows.length === 0) return;

  const origin = toBox(xf, draw.affine, state);
  const tblPr = firstChild(tbl, "tblPr");
  const styleId = firstChild(tblPr, "tableStyleId")?.textContent?.trim() ?? "";
  // PowerPoint's built-in styles are usually not stored in the file, only referenced
  const style =
    state.source.tableStyles.get(styleId) ?? builtInTableStyle(styleId.toUpperCase());
  const borders: { box: Box; color: Rgba }[] = [];
  const hasFirstRow = flag(tblPr?.getAttribute("firstRow") ?? null, false);
  const hasBandRow = flag(tblPr?.getAttribute("bandRow") ?? null, false);
  const hasFirstCol = flag(tblPr?.getAttribute("firstCol") ?? null, false);

  const stylePart = (name: string) => firstChild(style, name);
  const styleFill = (part: Element | null): DesignFill | null =>
    fillOfContainer(firstChild(firstChild(part, "tcStyle"), "fill"), draw.ctx, state.slide);
  const styleTextColor = (part: Element | null) => {
    const txStyle = firstChild(part, "tcTxStyle");
    return {
      color: colorOf(txStyle, draw.ctx) ?? colorOf(firstChild(txStyle, "fontRef"), draw.ctx),
      bold: txStyle?.getAttribute("b") === "on",
    };
  };

  let top = origin.y;
  const columnX: number[] = [];
  grid.reduce((x, width) => {
    columnX.push(x);
    return x + width;
  }, origin.x);

  rows.forEach((tr, rowIndex) => {
    const rowHeight = (Number(tr.getAttribute("h")) || 0) * draw.affine.sy * state.k;
    const cells = childrenNamed(tr, "tc");
    let col = 0;
    cells.forEach((tc) => {
      const span = Math.max(1, Number(tc.getAttribute("gridSpan")) || 1);
      const merged = tc.getAttribute("hMerge") === "1" || tc.getAttribute("vMerge") === "1";
      const startCol = col;
      col += 1;
      if (merged) return;

      const rowSpan = Math.max(1, Number(tc.getAttribute("rowSpan")) || 1);
      let width = 0;
      for (let i = 0; i < span; i++) width += grid[startCol + i] ?? 0;
      let height = rowHeight;
      for (let i = 1; i < rowSpan; i++) {
        height += (Number(rows[rowIndex + i]?.getAttribute("h")) || 0) * draw.affine.sy * state.k;
      }
      const cellBox: Box = { x: columnX[startCol] ?? origin.x, y: top, w: width, h: height };

      const tcPr = firstChild(tc, "tcPr");
      const isHeader = hasFirstRow && rowIndex === 0;
      const bandPart = hasBandRow
        ? (rowIndex - (hasFirstRow ? 1 : 0)) % 2 === 0
          ? stylePart("band1H")
          : stylePart("band2H")
        : null;
      const partOrder = [
        isHeader ? stylePart("firstRow") : null,
        hasFirstCol && startCol === 0 ? stylePart("firstCol") : null,
        bandPart,
        stylePart("wholeTbl"),
      ];
      const cellFill =
        fillOfContainer(tcPr, draw.ctx, state.slide) ??
        partOrder.map(styleFill).find((f) => f != null) ??
        null;
      emitFillShape(state, "Table cell", cellBox, 0, cellFill, null, { preset: "rect", radius: 0 });

      // Cell borders: the cell's own lines win over the table style's. Each shared edge
      // is drawn once (by the cell on its left / top), and after every fill below.
      const edgeKeys = {
        left: startCol === 0 ? "left" : "insideV",
        top: rowIndex === 0 ? "top" : "insideH",
        right: startCol + span >= grid.length ? "right" : null,
        bottom: rowIndex + rowSpan >= rows.length ? "bottom" : null,
      } as const;
      (
        [
          ["lnL", "left"],
          ["lnR", "right"],
          ["lnT", "top"],
          ["lnB", "bottom"],
        ] as const
      ).forEach(([tag, side]) => {
        const explicit = firstChild(tcPr, tag);
        let edge: BorderEdge | null | undefined;
        if (explicit) {
          const lineFill = fillOfContainer(explicit, draw.ctx, null);
          edge = lineFill?.type === "solid"
            ? { width: edgeWidth(explicit, state), color: lineFill.color }
            : lineFill
              ? null
              : undefined;
        }
        if (edge === undefined && side === "bottom" && isHeader) {
          edge = styleEdge(stylePart("firstRow"), "bottom", draw.ctx, state);
        }
        const key = edgeKeys[side];
        if (edge === undefined && key) {
          for (const part of partOrder) {
            edge = styleEdge(part, key, draw.ctx, state);
            if (edge !== undefined) break;
          }
        }
        if (!edge) return;
        const t = edge.width;
        const bar: Record<string, Box> = {
          left: { x: cellBox.x - t / 2, y: cellBox.y, w: t, h: cellBox.h },
          right: { x: cellBox.x + cellBox.w - t / 2, y: cellBox.y, w: t, h: cellBox.h },
          top: { x: cellBox.x, y: cellBox.y - t / 2, w: cellBox.w, h: t },
          bottom: { x: cellBox.x, y: cellBox.y + cellBox.h - t / 2, w: cellBox.w, h: t },
        };
        borders.push({ box: bar[side], color: edge.color });
      });

      const txBody = firstChild(tc, "txBody");
      if (!txBody) return;
      const textStyle = partOrder.map(styleTextColor).find((entry) => entry.color) ?? null;
      const bold =
        (isHeader && styleTextColor(stylePart("firstRow")).bold) ||
        (hasFirstCol && startCol === 0 && styleTextColor(stylePart("firstCol")).bold);
      const cellText = buildTextElement(state, {
        txBody,
        box: cellBox,
        rotation: 0,
        ctx: draw.ctx,
        chains: {
          lst: [firstChild(txBody, "lstStyle")],
          defaults: [state.slide.layout.master.txStyles.other, state.source.defaultTextStyle],
        },
        bodyPrChain: [],
        fontRefColor: textStyle?.color ?? null,
        layerName: "Table text",
        cellBody: {
          l: Number(tcPr?.getAttribute("marL") ?? 91440),
          r: Number(tcPr?.getAttribute("marR") ?? 91440),
          t: Number(tcPr?.getAttribute("marT") ?? 45720),
          b: Number(tcPr?.getAttribute("marB") ?? 45720),
          anchor: tcPr?.getAttribute("anchor") ?? "t",
        },
      });
      if (cellText) {
        if (bold) {
          cellText.fontWeight = "Bold";
          cellText.richText.forEach((para: ParaSpec) =>
            para.runs.forEach((run) => {
              run.bold = true;
            }),
          );
        }
        state.elements.push(cellText);
      }
    });
    top += rowHeight;
  });

  borders.forEach(({ box, color }) =>
    emitFillShape(state, "Table border", box, 0, { type: "solid", color }, null, {
      preset: "rect",
      radius: 0,
    }),
  );
};

// ---- Traversal --------------------------------------------------------------------

const traverse = (container: Element, draw: DrawContext, state: BuildState) => {
  Array.from(container.children).forEach((child) => {
    switch (child.localName) {
      case "sp":
        drawShape(child, draw, state);
        break;
      case "cxnSp":
        drawShape(child, draw, state);
        break;
      case "pic":
        drawPicture(child, draw, state);
        break;
      case "grpSp": {
        const xf = readXfrm(firstChild(firstChild(child, "grpSpPr"), "xfrm"));
        if (!xf) {
          traverse(child, draw, state);
          break;
        }
        const chOff = xf.chOff ?? { x: xf.x, y: xf.y };
        const chExt = xf.chExt ?? { cx: xf.cx, cy: xf.cy };
        const scaleX = chExt.cx ? xf.cx / chExt.cx : 1;
        const scaleY = chExt.cy ? xf.cy / chExt.cy : 1;
        // child -> group space -> parent space
        const local: Affine = {
          sx: scaleX,
          sy: scaleY,
          tx: xf.x - chOff.x * scaleX,
          ty: xf.y - chOff.y * scaleY,
        };
        const combined: Affine = {
          sx: local.sx * draw.affine.sx,
          sy: local.sy * draw.affine.sy,
          tx: local.tx * draw.affine.sx + draw.affine.tx,
          ty: local.ty * draw.affine.sy + draw.affine.ty,
        };
        if (xf.rot) note(state, "info", "A rotated group was drawn unrotated");
        traverse(child, { ...draw, affine: combined }, state);
        break;
      }
      case "graphicFrame": {
        const cNvPr = cNvPrOf(child);
        if (cNvPr?.getAttribute("hidden") === "1") break;
        const xf = readXfrm(firstChild(child, "xfrm"));
        const data = firstChild(firstChild(child, "graphic"), "graphicData");
        const uri = data?.getAttribute("uri") ?? "";
        const tbl = firstChild(data, "tbl");
        if (tbl && xf) {
          drawTable(child, tbl, xf, draw, state);
        } else if (uri.endsWith("/chart")) {
          note(state, "warning", "A chart can't be imported and was left out");
        } else if (uri.endsWith("/diagram")) {
          note(state, "warning", "SmartArt can't be imported and was left out");
        } else {
          note(state, "warning", "An embedded object can't be imported and was left out");
        }
        break;
      }
      case "AlternateContent": {
        const fallback = firstChild(child, "Fallback");
        const choice = firstChild(child, "Choice");
        const chosen = fallback ?? choice;
        if (chosen) traverse(chosen, draw, state);
        break;
      }
      default:
        break;
    }
  });
};

// ---- Entry point ------------------------------------------------------------------

export const SLIDE_BOX_16_9 = CANVAS_WIDTH / CANVAS_HEIGHT;

export const buildSlideDesign = (
  source: PresentationSource,
  slide: SlideSource,
  measure: FidelityMeasurer,
): SlideDesign => {
  const k = Math.min(CANVAS_WIDTH / source.slideWidth, CANVAS_HEIGHT / source.slideHeight);
  const frameW = source.slideWidth * k;
  const frameH = source.slideHeight * k;
  const offsetX = (CANVAS_WIDTH - frameW) / 2;
  const offsetY = (CANVAS_HEIGHT - frameH) / 2;
  const frame: Box = { x: offsetX, y: offsetY, w: frameW, h: frameH };

  const state: BuildState = {
    source,
    slide,
    measure,
    k,
    offsetX,
    offsetY,
    pxPerPt: 12700 * k,
    frame,
    elements: [],
    needs: new Map(),
    notes: [],
    noteKeys: new Set(),
    sequence: 0,
    unknownFonts: new Set(),
    slideNumberText: String(slide.originalIndex),
  };

  const colorCtx = colorContextFor(slide);
  const theme = slide.layout.master.theme;
  const fullFrameIsCanvas = Math.abs(frameW - CANVAS_WIDTH) < 0.5 && Math.abs(frameH - CANVAS_HEIGHT) < 0.5;

  if (!fullFrameIsCanvas) {
    note(state, "info", "This deck isn't 16:9, so each slide is shown with bars to keep its shape");
  }

  // Background: slide, else layout, else master
  const slideBg = firstChild(byLocalName(slide.doc, "cSld")[0], "bg");
  const layoutBg = firstChild(byLocalName(slide.layout.doc, "cSld")[0], "bg");
  const masterBg = firstChild(byLocalName(slide.layout.master.doc, "cSld")[0], "bg");
  const background =
    backgroundFillOf(slideBg, theme, colorCtx, slide) ??
    backgroundFillOf(layoutBg, theme, colorCtx, slide.layout) ??
    backgroundFillOf(masterBg, theme, colorCtx, slide.layout.master) ??
    ({ type: "solid", color: { r: 255, g: 255, b: 255, a: 1 } } as DesignFill);

  let canvasBackground: { type: string; value: string } = { type: "color", value: "#ffffff" };
  if (background.type === "solid") {
    canvasBackground = { type: "color", value: rgbaToCss({ ...background.color, a: 1 }) };
  } else if (background.type === "gradient") {
    canvasBackground = { type: "color", value: rgbaToCss({ ...background.fallback, a: 1 }) };
    state.elements.push({
      ...baseElement(state, "Background", frame, 0),
      type: "rect",
      color: rgbaToCss({ ...background.fallback, a: 1 }),
      gradient: background.css,
    });
  } else if (background.type === "image") {
    const key = needImage(state, background.part, background.crop, false, false, frame);
    canvasBackground = { type: "color", value: "#000000" };
    state.elements.push({
      ...baseElement(state, "Background picture", frame, 0),
      type: "image",
      content: "",
      imageKey: key,
    });
  }

  const slideRoot = slide.doc.documentElement;
  const showMasterShapes = slideRoot?.getAttribute("showMasterSp") !== "0";
  const layers: { tree: Element | null; source: ShapeSource }[] = [];
  if (showMasterShapes && slide.layout.showMasterSp) {
    layers.push({ tree: slide.layout.master.spTree, source: "master" });
  }
  if (showMasterShapes) layers.push({ tree: slide.layout.spTree, source: "layout" });
  layers.push({ tree: byLocalName(slide.doc, "spTree")[0] ?? null, source: "slide" });

  layers.forEach(({ tree, source: layerSource }) => {
    if (!tree) return;
    traverse(tree, { source: layerSource, affine: IDENTITY, ctx: colorCtx }, state);
  });

  if (state.unknownFonts.size > 0) {
    const names = Array.from(state.unknownFonts).slice(0, 3).join(", ");
    note(
      state,
      "info",
      `Uses ${names}${state.unknownFonts.size > 3 ? " and others" : ""}. If a font isn't installed on this computer, a similar one is used`,
    );
  }

  return {
    slideNumber: slide.originalIndex,
    elements: state.elements,
    canvasBackground,
    images: Array.from(state.needs.values()),
    notes: state.notes,
  };
};

/** Fills in uploaded picture URLs, dropping (and reporting) pictures that failed. */
export const finalizeSlideDesign = (
  design: SlideDesign,
  urlByKey: Map<string, string>,
): { elements: any[]; canvasBackground: { type: string; value: string }; notes: DesignNote[] } => {
  const notes = [...design.notes];
  let missing = 0;
  const elements = design.elements.flatMap((element) => {
    if (element.type !== "image") return [element];
    const url = urlByKey.get(element.imageKey);
    if (!url) {
      missing += 1;
      return [];
    }
    const { imageKey: _imageKey, ...rest } = element;
    return [{ ...rest, content: url }];
  });
  if (missing > 0) {
    notes.push({
      level: "warning",
      message: `${missing} ${missing === 1 ? "picture" : "pictures"} could not be imported`,
    });
  }
  return { elements, canvasBackground: design.canvasBackground, notes };
};
