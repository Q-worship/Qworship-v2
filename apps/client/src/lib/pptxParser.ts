// Minimal in-browser .pptx reader. A .pptx is a ZIP of XML parts, so we read the
// ZIP central directory ourselves and inflate entries with the native
// DecompressionStream instead of pulling in a dependency.

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
  /** Decodes the slide's pictures (downscaled); pictures that can't be decoded are skipped */
  loadSlideImages: (slideNumber: number) => Promise<SlideImages>;
}

interface ZipEntry {
  method: number;
  compressedSize: number;
  localOffset: number;
}

const NS_RELATIONSHIPS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
};

const MAX_IMAGE_EDGE = 1600;
const TITLE_PLACEHOLDERS = new Set(["title", "ctrTitle"]);
const SKIPPED_PLACEHOLDERS = new Set(["sldNum", "ftr", "dt"]);

const LEGACY_PPT_MESSAGE =
  "Legacy .ppt files can't be read in the browser. Open it in PowerPoint, choose Save As → .pptx, and import that file instead.";
const INVALID_FILE_MESSAGE =
  "This doesn't look like a valid PowerPoint file. Please choose a .pptx file.";

const readZipEntries = (buffer: ArrayBuffer): Map<string, ZipEntry> => {
  const view = new DataView(buffer);

  // End-of-central-directory record: 22 bytes plus an optional comment (max 64KB)
  let eocd = -1;
  const lowest = Math.max(0, buffer.byteLength - 22 - 0xffff);
  for (let i = buffer.byteLength - 22; i >= lowest; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(INVALID_FILE_MESSAGE);

  const entryCount = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map<string, ZipEntry>();

  for (let n = 0; n < entryCount; n++) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break;
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const name = decoder.decode(new Uint8Array(buffer, cursor + 46, nameLength));
    entries.set(name, {
      method: view.getUint16(cursor + 10, true),
      compressedSize: view.getUint32(cursor + 20, true),
      localOffset: view.getUint32(cursor + 42, true),
    });
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
};

const inflateEntry = async (
  buffer: ArrayBuffer,
  entry: ZipEntry,
): Promise<Uint8Array> => {
  const view = new DataView(buffer);
  const nameLength = view.getUint16(entry.localOffset + 26, true);
  const extraLength = view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const raw = new Uint8Array(buffer, start, entry.compressedSize);

  if (entry.method === 0) return raw;
  if (entry.method !== 8) throw new Error(INVALID_FILE_MESSAGE);
  if (typeof DecompressionStream === "undefined") {
    throw new Error(
      "Your browser is too old to read PowerPoint files. Please update it and try again.",
    );
  }

  const stream = new Blob([raw])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const parseXml = (xml: string): Document =>
  new DOMParser().parseFromString(xml, "application/xml");

const byLocalName = (root: Document | Element, name: string): Element[] =>
  Array.from(root.getElementsByTagNameNS("*", name));

const parseRelationships = (doc: Document): Map<string, string> => {
  const relationships = new Map<string, string>();
  byLocalName(doc, "Relationship").forEach((rel) => {
    const id = rel.getAttribute("Id");
    const target = rel.getAttribute("Target");
    if (id && target) relationships.set(id, target);
  });
  return relationships;
};

const resolvePath = (baseDir: string, target: string): string => {
  if (target.startsWith("/")) return target.slice(1);
  const parts = baseDir.split("/").filter(Boolean);
  target.split("/").forEach((segment) => {
    if (segment === "..") parts.pop();
    else if (segment !== ".") parts.push(segment);
  });
  return parts.join("/");
};

const directoryOf = (path: string): string =>
  path.slice(0, Math.max(0, path.lastIndexOf("/")));

const relsPathFor = (partPath: string): string => {
  const slash = partPath.lastIndexOf("/");
  return `${partPath.slice(0, slash)}/_rels/${partPath.slice(slash + 1)}.rels`;
};

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

// Downscales a picture and re-encodes it (PNG only when it has transparency, JPEG
// otherwise) so uploads stay small. Returns null for pictures the browser can't decode.
const decodeSlideImage = async (
  bytes: Uint8Array,
  mime: string,
  baseName: string,
): Promise<SlideImage | null> => {
  try {
    const bitmap = await createImageBitmap(
      new Blob([bytes as BlobPart], { type: mime }),
    );
    const scale = Math.min(
      1,
      MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const keepAlpha =
      mime !== "image/jpeg" && mime !== "image/bmp" && hasTransparency(canvas);
    const blob = await canvasToBlob(
      canvas,
      keepAlpha ? "image/png" : "image/jpeg",
      0.85,
    );
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

export const parsePptx = async (file: File): Promise<ParsedPresentation> => {
  const buffer = await file.arrayBuffer();
  const header = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));

  // Legacy binary .ppt files are OLE2 containers, not ZIPs
  if (
    header[0] === 0xd0 &&
    header[1] === 0xcf &&
    header[2] === 0x11 &&
    header[3] === 0xe0
  ) {
    throw new Error(LEGACY_PPT_MESSAGE);
  }
  if (header[0] !== 0x50 || header[1] !== 0x4b) {
    throw new Error(INVALID_FILE_MESSAGE);
  }

  const entries = readZipEntries(buffer);

  const readText = async (path: string): Promise<string | null> => {
    const entry = entries.get(path);
    if (!entry) return null;
    return new TextDecoder().decode(await inflateEntry(buffer, entry));
  };

  const presentationXml = await readText("ppt/presentation.xml");
  if (!presentationXml) throw new Error(INVALID_FILE_MESSAGE);

  // Slide order lives in presentation.xml (sldIdLst) and resolves through its rels
  const presentationRelsXml = await readText("ppt/_rels/presentation.xml.rels");
  const presentationRels = presentationRelsXml
    ? parseRelationships(parseXml(presentationRelsXml))
    : new Map<string, string>();

  let slidePaths = byLocalName(parseXml(presentationXml), "sldId")
    .map((el) => presentationRels.get(el.getAttributeNS(NS_RELATIONSHIPS, "id") ?? ""))
    .filter((target): target is string => Boolean(target))
    .map((target) => resolvePath("ppt", target));

  if (slidePaths.length === 0) {
    slidePaths = Array.from(entries.keys())
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort(
        (a, b) =>
          Number(a.match(/(\d+)\.xml$/)?.[1]) -
          Number(b.match(/(\d+)\.xml$/)?.[1]),
      );
  }

  interface SlidePictures {
    background: string | null;
    pictures: string[];
  }
  const picturesBySlide = new Map<number, SlidePictures>();
  const slides: ParsedSlide[] = [];

  for (let index = 0; index < slidePaths.length; index++) {
    const slidePath = slidePaths[index];
    const slideXml = await readText(slidePath);
    if (!slideXml) continue;

    const slideDoc = parseXml(slideXml);
    const { title, hasTitleShape, lines } = extractSlideText(slideDoc);

    const relsXml = await readText(relsPathFor(slidePath));
    const rels = relsXml
      ? parseRelationships(parseXml(relsXml))
      : new Map<string, string>();

    // Every usable picture on the slide, in document order, each media part once
    const found: SlidePictures = { background: null, pictures: [] };
    for (const blip of byLocalName(slideDoc, "blip")) {
      const kind = classifyBlip(blip);
      const target = rels.get(blip.getAttributeNS(NS_RELATIONSHIPS, "embed") ?? "");
      if (!kind || !target) continue;
      const candidate = resolvePath(directoryOf(slidePath), target);
      const extension = candidate.split(".").pop()?.toLowerCase() ?? "";
      if (!IMAGE_MIME_BY_EXTENSION[extension] || !entries.has(candidate)) continue;

      if (kind === "background") {
        found.background ??= candidate;
      } else if (!found.pictures.includes(candidate)) {
        found.pictures.push(candidate);
      }
    }

    const number = slides.length + 1;
    picturesBySlide.set(number, found);
    slides.push({
      number,
      title,
      hasTitleShape,
      lines,
      imageCount: found.pictures.length,
      hasBackground: Boolean(found.background),
    });
  }

  const decodePart = async (
    path: string,
    baseName: string,
  ): Promise<SlideImage | null> => {
    const entry = entries.get(path);
    if (!entry) return null;
    const extension = path.split(".").pop()?.toLowerCase() ?? "";
    try {
      return await decodeSlideImage(
        await inflateEntry(buffer, entry),
        IMAGE_MIME_BY_EXTENSION[extension],
        baseName,
      );
    } catch {
      return null;
    }
  };

  const loadSlideImages = async (slideNumber: number): Promise<SlideImages> => {
    const found = picturesBySlide.get(slideNumber);
    if (!found) return { background: null, pictures: [] };

    const background = found.background
      ? await decodePart(found.background, `slide-${slideNumber}-background`)
      : null;
    const pictures: SlideImage[] = [];
    for (let i = 0; i < found.pictures.length; i++) {
      const decoded = await decodePart(
        found.pictures[i],
        `slide-${slideNumber}-picture-${i + 1}`,
      );
      if (decoded) pictures.push(decoded);
    }
    return { background, pictures };
  };

  return { fileName: file.name, slides, loadSlideImages };
};
