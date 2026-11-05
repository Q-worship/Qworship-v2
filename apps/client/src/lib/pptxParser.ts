// In-browser .pptx reader used by Import Presentation. It lists the slides (for the
// slide picker), scans each one for anything that can't be reproduced exactly (the
// "health check"), and builds the full-fidelity design of a slide on demand.

import {
  byLocalName,
  directoryOf,
  IMAGE_MIME_BY_EXTENSION,
  INVALID_FILE_MESSAGE,
  NS_RELATIONSHIPS,
  openPptxPackage,
  parseRelationships,
  parseXml,
  resolvePath,
  type PptxPackage,
} from "./pptxPackage";
import {
  buildSlideDesign,
  estimateMeasurer,
  loadPresentationSource,
  type DesignNote,
  type FidelityMeasurer,
  type ImageNeed,
  type PresentationSource,
  type SlideDesign,
  type SlideSource,
} from "./pptxSlideDesign";

export type { DesignNote, ImageNeed, SlideDesign } from "./pptxSlideDesign";

export interface SlideHealth {
  /** "ready": reproduced as authored; "notes": reproduced with the caveats listed */
  status: "ready" | "notes" | "simplified";
  notes: DesignNote[];
}

export interface ParsedSlide {
  /** 1-based position in the presentation */
  number: number;
  title: string;
  /** True when the title came from a real title placeholder (not just the first line) */
  hasTitleShape: boolean;
  /** Body paragraphs, excluding the title */
  lines: string[];
  /** Number of pictures placed on the slide itself */
  imageCount: number;
  /** True when the slide has a picture background */
  hasBackground: boolean;
  /** What the import can and can't reproduce for this slide */
  health: SlideHealth;
}

/** A decoded, downscaled picture ready to upload */
export interface SlideImage {
  blob: Blob;
  width: number;
  height: number;
  fileName: string;
}

export interface SlideImages {
  background: SlideImage | null;
  pictures: SlideImage[];
}

export interface ParsedPresentation {
  fileName: string;
  slides: ParsedSlide[];
  /** Builds the slide with its real background, shapes, text and pictures */
  buildDesign: (slideNumber: number, measure: FidelityMeasurer) => SlideDesign;
  /** Renders one picture (cropped, flipped, sized); null when it can't be decoded */
  renderImage: (need: ImageNeed) => Promise<SlideImage | null>;
  /** Plain pictures of a slide, used by the simplified fallback layout */
  loadSlideImages: (slideNumber: number) => Promise<SlideImages>;
}

const MAX_IMAGE_EDGE = 1600;
const TITLE_PLACEHOLDERS = new Set(["title", "ctrTitle"]);
const SKIPPED_PLACEHOLDERS = new Set(["sldNum", "ftr", "dt"]);

const paragraphText = (paragraph: Element): string => {
  let text = "";
  Array.from(paragraph.children).forEach((child) => {
    if (child.localName === "r" || child.localName === "fld") {
      text += byLocalName(child, "t")
        .map((t) => t.textContent ?? "")
        .join("");
    } else if (child.localName === "br") {
      text += "\n";
    }
  });
  return text.trim();
};

const extractSlideText = (doc: Document) => {
  let title = "";
  let hasTitleShape = false;
  const lines: string[] = [];

  byLocalName(doc, "*")
    .filter((el) => el.localName === "sp" || el.localName === "graphicFrame")
    .forEach((shape) => {
      const placeholder = byLocalName(shape, "ph")[0]?.getAttribute("type") ?? "";
      if (SKIPPED_PLACEHOLDERS.has(placeholder)) return;

      const paragraphs = byLocalName(shape, "p")
        .map(paragraphText)
        .filter(Boolean);
      if (paragraphs.length === 0) return;

      if (TITLE_PLACEHOLDERS.has(placeholder) && !title) {
        title = paragraphs.join(" ");
        hasTitleShape = true;
      } else {
        lines.push(...paragraphs);
      }
    });

  if (!title && lines.length > 0) title = lines.shift() as string;
  return { title, hasTitleShape, lines };
};

type PictureKind = "background" | "picture";

// A blip inside <p:bg> is the slide background; one inside a bullet definition
// (<a:buBlip>) is only a bullet glyph and is not a picture on the slide.
const classifyBlip = (blip: Element): PictureKind | null => {
  let node: Node | null = blip.parentNode;
  while (node) {
    const name = (node as Element).localName;
    if (name === "buBlip") return null;
    if (name === "bg") return "background";
    node = node.parentNode;
  }
  return "picture";
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

const hasTransparency = (canvas: HTMLCanvasElement): boolean => {
  const probe = document.createElement("canvas");
  probe.width = 32;
  probe.height = 32;
  const context = probe.getContext("2d");
  if (!context) return false;
  context.drawImage(canvas, 0, 0, 32, 32);
  const { data } = context.getImageData(0, 0, 32, 32);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) return true;
  }
  return false;
};

interface RenderSpec {
  crop: { l: number; t: number; r: number; b: number };
  flipH: boolean;
  flipV: boolean;
  outWidth: number | null;
  outHeight: number | null;
}

// Draws the wanted part of a picture at the wanted size and re-encodes it (PNG only
// when it has transparency, JPEG otherwise) so uploads stay small. Returns null for
// pictures the browser can't decode.
const renderPicture = async (
  bytes: Uint8Array,
  mime: string,
  baseName: string,
  spec: RenderSpec,
): Promise<SlideImage | null> => {
  try {
    const bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: mime }));
    const sourceX = bitmap.width * spec.crop.l;
    const sourceY = bitmap.height * spec.crop.t;
    const sourceW = Math.max(1, bitmap.width * (1 - spec.crop.l - spec.crop.r));
    const sourceH = Math.max(1, bitmap.height * (1 - spec.crop.t - spec.crop.b));

    let width: number;
    let height: number;
    if (spec.outWidth != null && spec.outHeight != null) {
      // Drawn at the box's own aspect (so it fills the box exactly), but never
      // enlarged beyond the picture's own pixels
      const natural = Math.min(1, Math.max(sourceW / spec.outWidth, sourceH / spec.outHeight));
      width = Math.max(1, Math.round(spec.outWidth * natural));
      height = Math.max(1, Math.round(spec.outHeight * natural));
    } else {
      const edge = Math.min(1, MAX_IMAGE_EDGE / Math.max(sourceW, sourceH));
      width = Math.max(1, Math.round(sourceW * edge));
      height = Math.max(1, Math.round(sourceH * edge));
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.save();
    if (spec.flipH || spec.flipV) {
      context.translate(spec.flipH ? width : 0, spec.flipV ? height : 0);
      context.scale(spec.flipH ? -1 : 1, spec.flipV ? -1 : 1);
    }
    context.drawImage(bitmap, sourceX, sourceY, sourceW, sourceH, 0, 0, width, height);
    context.restore();
    bitmap.close();

    const keepAlpha =
      mime !== "image/jpeg" && mime !== "image/bmp" && hasTransparency(canvas);
    const blob = await canvasToBlob(canvas, keepAlpha ? "image/png" : "image/jpeg", 0.82);
    if (!blob) return null;
    return {
      blob,
      width,
      height,
      fileName: `${baseName}.${keepAlpha ? "png" : "jpg"}`,
    };
  } catch {
    return null;
  }
};

const slidePathsOf = async (pkg: PptxPackage): Promise<string[]> => {
  const presentationXml = await pkg.readText("ppt/presentation.xml");
  if (!presentationXml) throw new Error(INVALID_FILE_MESSAGE);

  // Slide order lives in presentation.xml (sldIdLst) and resolves through its rels
  const presentationRelsXml = await pkg.readText("ppt/_rels/presentation.xml.rels");
  const presentationRels = presentationRelsXml
    ? parseRelationships(parseXml(presentationRelsXml))
    : new Map<string, { target: string; type: string }>();

  let slidePaths = byLocalName(parseXml(presentationXml), "sldId")
    .map((el) => presentationRels.get(el.getAttributeNS(NS_RELATIONSHIPS, "id") ?? "")?.target)
    .filter((target): target is string => Boolean(target))
    .map((target) => resolvePath("ppt", target));

  if (slidePaths.length === 0) {
    slidePaths = pkg
      .names()
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort(
        (a, b) =>
          Number(a.match(/(\d+)\.xml$/)?.[1]) - Number(b.match(/(\d+)\.xml$/)?.[1]),
      );
  }
  return slidePaths;
};

export const parsePptx = async (file: File): Promise<ParsedPresentation> => {
  const pkg = await openPptxPackage(file);
  const slidePaths = await slidePathsOf(pkg);
  const source: PresentationSource = await loadPresentationSource(pkg, slidePaths);

  interface SlidePictures {
    background: string | null;
    pictures: string[];
  }
  const picturesBySlide = new Map<number, SlidePictures>();
  const sourceBySlide = new Map<number, SlideSource>();
  const slides: ParsedSlide[] = [];

  source.slides.forEach((slideSource) => {
    const { title, hasTitleShape, lines } = extractSlideText(slideSource.doc);

    // Every usable picture on the slide, in document order, each media part once
    const found: SlidePictures = { background: null, pictures: [] };
    for (const blip of byLocalName(slideSource.doc, "blip")) {
      const kind = classifyBlip(blip);
      const rel = slideSource.rels.get(blip.getAttributeNS(NS_RELATIONSHIPS, "embed") ?? "");
      if (!kind || !rel) continue;
      const candidate = resolvePath(directoryOf(slideSource.path), rel.target);
      const extension = candidate.split(".").pop()?.toLowerCase() ?? "";
      if (!IMAGE_MIME_BY_EXTENSION[extension] || !pkg.has(candidate)) continue;

      if (kind === "background") {
        found.background ??= candidate;
      } else if (!found.pictures.includes(candidate)) {
        found.pictures.push(candidate);
      }
    }

    const number = slides.length + 1;
    picturesBySlide.set(number, found);
    sourceBySlide.set(number, slideSource);

    // Health check: a quick design pass shows what can't be reproduced exactly
    let health: SlideHealth;
    try {
      const notes = buildSlideDesign(source, slideSource, estimateMeasurer).notes;
      health = {
        status: notes.some((entry) => entry.level === "warning") ? "notes" : "ready",
        notes,
      };
    } catch (error) {
      console.error(`Could not scan slide ${number}:`, error);
      health = {
        status: "simplified",
        notes: [
          {
            level: "warning",
            message: "This slide's design couldn't be read, so a simplified layout is used",
          },
        ],
      };
    }

    slides.push({
      number,
      title,
      hasTitleShape,
      lines,
      imageCount: found.pictures.length,
      hasBackground: Boolean(found.background),
      health,
    });
  });

  let renderCounter = 0;
  const rendered = new Map<string, Promise<SlideImage | null>>();

  const renderPart = async (
    path: string,
    baseName: string,
    spec: RenderSpec,
  ): Promise<SlideImage | null> => {
    const extension = path.split(".").pop()?.toLowerCase() ?? "";
    const mime = IMAGE_MIME_BY_EXTENSION[extension];
    if (!mime) return null;
    try {
      const bytes = await pkg.readBytes(path);
      return bytes ? await renderPicture(bytes, mime, baseName, spec) : null;
    } catch {
      return null;
    }
  };

  const renderImage = (need: ImageNeed): Promise<SlideImage | null> => {
    const cached = rendered.get(need.key);
    if (cached) return cached;
    renderCounter += 1;
    const pending = renderPart(need.part, `slide-picture-${renderCounter}`, {
      crop: need.crop,
      flipH: need.flipH,
      flipV: need.flipV,
      outWidth: need.outWidth,
      outHeight: need.outHeight,
    });
    rendered.set(need.key, pending);
    return pending;
  };

  const plainSpec: RenderSpec = {
    crop: { l: 0, t: 0, r: 0, b: 0 },
    flipH: false,
    flipV: false,
    outWidth: null,
    outHeight: null,
  };

  const loadSlideImages = async (slideNumber: number): Promise<SlideImages> => {
    const found = picturesBySlide.get(slideNumber);
    if (!found) return { background: null, pictures: [] };

    const background = found.background
      ? await renderPart(found.background, `slide-${slideNumber}-background`, plainSpec)
      : null;
    const pictures: SlideImage[] = [];
    for (let i = 0; i < found.pictures.length; i++) {
      const decoded = await renderPart(
        found.pictures[i],
        `slide-${slideNumber}-picture-${i + 1}`,
        plainSpec,
      );
      if (decoded) pictures.push(decoded);
    }
    return { background, pictures };
  };

  const buildDesign = (slideNumber: number, measure: FidelityMeasurer): SlideDesign => {
    const slideSource = sourceBySlide.get(slideNumber);
    if (!slideSource) throw new Error(`Slide ${slideNumber} was not found`);
    return buildSlideDesign(source, slideSource, measure);
  };

  return { fileName: file.name, slides, buildDesign, renderImage, loadSlideImages };
};
