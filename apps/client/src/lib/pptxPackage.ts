// Minimal in-browser .pptx container reader. A .pptx is a ZIP of XML parts, so the
// ZIP central directory is read here and entries are inflated with the native
// DecompressionStream instead of pulling in a dependency.

export const LEGACY_PPT_MESSAGE =
  "Legacy .ppt files can't be read in the browser. Open it in PowerPoint, choose Save As → .pptx, and import that file instead.";
export const INVALID_FILE_MESSAGE =
  "This doesn't look like a valid PowerPoint file. Please choose a .pptx file.";

export interface PptxPackage {
  has(path: string): boolean;
  names(): string[];
  readText(path: string): Promise<string | null>;
  readBytes(path: string): Promise<Uint8Array | null>;
}

interface ZipEntry {
  method: number;
  compressedSize: number;
  localOffset: number;
}

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

  const stream = new Blob([raw as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

/** Opens a .pptx file as a read-only package of named parts. */
export const openPptxPackage = async (file: File): Promise<PptxPackage> => {
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
  const decoder = new TextDecoder();

  return {
    has: (path) => entries.has(path),
    names: () => Array.from(entries.keys()),
    readBytes: async (path) => {
      const entry = entries.get(path);
      return entry ? inflateEntry(buffer, entry) : null;
    },
    readText: async (path) => {
      const entry = entries.get(path);
      return entry ? decoder.decode(await inflateEntry(buffer, entry)) : null;
    },
  };
};

// ---- Shared OPC helpers -------------------------------------------------------

export const NS_RELATIONSHIPS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export const parseXml = (xml: string): Document =>
  new DOMParser().parseFromString(xml, "application/xml");

export const byLocalName = (root: Document | Element, name: string): Element[] =>
  Array.from(root.getElementsByTagNameNS("*", name));

/** Direct element children with the given local name. */
export const childrenNamed = (parent: Element | null | undefined, name: string): Element[] =>
  parent ? Array.from(parent.children).filter((child) => child.localName === name) : [];

export const firstChild = (
  parent: Element | null | undefined,
  name: string,
): Element | null => childrenNamed(parent, name)[0] ?? null;

export const parseRelationships = (
  doc: Document,
): Map<string, { target: string; type: string }> => {
  const relationships = new Map<string, { target: string; type: string }>();
  byLocalName(doc, "Relationship").forEach((rel) => {
    const id = rel.getAttribute("Id");
    const target = rel.getAttribute("Target");
    if (id && target) {
      relationships.set(id, { target, type: rel.getAttribute("Type") ?? "" });
    }
  });
  return relationships;
};

export const resolvePath = (baseDir: string, target: string): string => {
  if (target.startsWith("/")) return target.slice(1);
  const parts = baseDir.split("/").filter(Boolean);
  target.split("/").forEach((segment) => {
    if (segment === "..") parts.pop();
    else if (segment !== ".") parts.push(segment);
  });
  return parts.join("/");
};

export const directoryOf = (path: string): string =>
  path.slice(0, Math.max(0, path.lastIndexOf("/")));

export const relsPathFor = (partPath: string): string => {
  const slash = partPath.lastIndexOf("/");
  return `${partPath.slice(0, slash)}/_rels/${partPath.slice(slash + 1)}.rels`;
};

export const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
};
