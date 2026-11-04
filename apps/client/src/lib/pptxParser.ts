// Minimal in-browser .pptx reader. A .pptx is a ZIP of XML parts, so we read the
// ZIP central directory ourselves and inflate entries with the native
// DecompressionStream instead of pulling in a dependency.

export interface ParsedSlide {
  /** 1-based position in the presentation */
  number: number;
  title: string;
  /** Body paragraphs, excluding the title */
  lines: string[];
  hasImage: boolean;
}

export interface ParsedPresentation {
  fileName: string;
  slides: ParsedSlide[];
  /** Resolves a data URL (downscaled) for the slide's first embedded picture */
  loadSlideImage: (slideNumber: number) => Promise<string | null>;
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
      } else {
        lines.push(...paragraphs);
      }
    });

  if (!title && lines.length > 0) title = lines.shift() as string;
  return { title, lines };
};

const bytesToDataUrl = async (
  bytes: Uint8Array,
  mime: string,
): Promise<string> => {
  const blob = new Blob([bytes as BlobPart], { type: mime });

  // Downscale so large slide pictures don't bloat the saved presentation
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(
      1,
      MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
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

  const imagePathBySlide = new Map<number, string>();
  const slides: ParsedSlide[] = [];

  for (let index = 0; index < slidePaths.length; index++) {
    const slidePath = slidePaths[index];
    const slideXml = await readText(slidePath);
    if (!slideXml) continue;

    const slideDoc = parseXml(slideXml);
    const { title, lines } = extractSlideText(slideDoc);

    const relsXml = await readText(relsPathFor(slidePath));
    const rels = relsXml
      ? parseRelationships(parseXml(relsXml))
      : new Map<string, string>();

    let imagePath: string | null = null;
    for (const blip of byLocalName(slideDoc, "blip")) {
      const target = rels.get(blip.getAttributeNS(NS_RELATIONSHIPS, "embed") ?? "");
      if (!target) continue;
      const candidate = resolvePath(directoryOf(slidePath), target);
      const extension = candidate.split(".").pop()?.toLowerCase() ?? "";
      if (IMAGE_MIME_BY_EXTENSION[extension] && entries.has(candidate)) {
        imagePath = candidate;
        break;
      }
    }

    const number = slides.length + 1;
    if (imagePath) imagePathBySlide.set(number, imagePath);
    slides.push({ number, title, lines, hasImage: Boolean(imagePath) });
  }

  const loadSlideImage = async (slideNumber: number): Promise<string | null> => {
    const path = imagePathBySlide.get(slideNumber);
    const entry = path ? entries.get(path) : undefined;
    if (!path || !entry) return null;
    const extension = path.split(".").pop()?.toLowerCase() ?? "";
    try {
      return await bytesToDataUrl(
        await inflateEntry(buffer, entry),
        IMAGE_MIME_BY_EXTENSION[extension],
      );
    } catch {
      return null;
    }
  };

  return { fileName: file.name, slides, loadSlideImage };
};
