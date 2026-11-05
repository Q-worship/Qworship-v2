// Turns an imported PowerPoint slide into canvas-slide content (the same
// { elements, canvasBackground } model SlideCanvasRenderer draws everywhere:
// thumbnails, preview, live output and OBS). The renderer neither clips nor
// shrinks text, so every box is sized here so the text sits fully inside the
// 960x540 artboard, centered.

import type { ParsedSlide } from "@/lib/pptxParser";

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

export interface PlacedImage {
  url: string;
  width: number;
  height: number;
}

export interface SlideMedia {
  background: string | null;
  pictures: PlacedImage[];
}

export type TextMeasurer = (
  text: string,
  fontSize: number,
  bold: boolean,
) => number;

const MARGIN_X = 56;
const MARGIN_Y = 36;
const GAP = 16;
const LINE_HEIGHT = 1.2;
const PARAGRAPH_GAP = 0.3; // as a fraction of the font size
// The renderer does its own wrapping, so measure against a slightly narrower box
// than the real one: the browser then never needs more lines than computed here.
const WRAP_WIDTH_FACTOR = 0.9;
const FONT_STEP = 2;
const MAX_PICTURE_COLUMNS = 4;

export const createTextMeasurer = (): TextMeasurer => {
  const context = document.createElement("canvas").getContext("2d");
  return (text, fontSize, bold) => {
    if (!context) return text.length * fontSize * 0.6;
    context.font = `${bold ? "700" : "400"} ${fontSize}px Inter, Arial, sans-serif`;
    return context.measureText(text).width;
  };
};

interface WrappedLine {
  text: string;
  /** True when this line carries on a word that was broken across lines */
  continuesWord: boolean;
}

const wrapParagraph = (
  text: string,
  maxWidth: number,
  fontSize: number,
  bold: boolean,
  measure: TextMeasurer,
): WrappedLine[] => {
  const fits = (value: string) => measure(value, fontSize, bold) <= maxWidth;
  const lines: WrappedLine[] = [];
  let current = "";
  let currentContinues = false;

  const flush = () => {
    if (current) lines.push({ text: current, continuesWord: currentContinues });
    current = "";
    currentContinues = false;
  };

  // A single word wider than a whole line is broken, as overflow-wrap would
  const breakLongWord = (word: string) => {
    let chunk = "";
    let chunkContinues = false;
    for (const char of word) {
      if (chunk && !fits(chunk + char)) {
        lines.push({ text: chunk, continuesWord: chunkContinues });
        chunk = char;
        chunkContinues = true;
      } else {
        chunk += char;
      }
    }
    current = chunk;
    currentContinues = chunkContinues;
  };

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }
    flush();
    if (fits(word)) current = word;
    else breakLongWord(word);
  }
  flush();
  return lines.length > 0 ? lines : [{ text: "", continuesWord: false }];
};

// Re-joins wrapped lines; pieces of a broken word are glued back without a space
const joinLines = (lines: WrappedLine[]): string =>
  lines
    .map((line, index) =>
      index === 0 ? line.text : `${line.continuesWord ? "" : " "}${line.text}`,
    )
    .join("");

interface FittedParagraph {
  text: string;
  height: number;
}

interface FittedBlock {
  fontSize: number;
  paragraphs: FittedParagraph[];
  /** Total height including the gaps between paragraphs */
  height: number;
}

const blockHeight = (lineCounts: number[], fontSize: number): number =>
  lineCounts.reduce((sum, count) => sum + count * fontSize * LINE_HEIGHT, 0) +
  Math.max(0, lineCounts.length - 1) * fontSize * PARAGRAPH_GAP;

const ellipsize = (
  line: string,
  maxWidth: number,
  fontSize: number,
  bold: boolean,
  measure: TextMeasurer,
): string => {
  let value = line.replace(/[\s.,;:!?-]+$/, "");
  while (value && measure(`${value}…`, fontSize, bold) > maxWidth) {
    const words = value.split(" ");
    value = words.length > 1 ? words.slice(0, -1).join(" ") : value.slice(0, -1);
  }
  return `${value}…`;
};

// Picks the largest font size (down to minSize) at which every paragraph fits in
// maxHeight. Text that still doesn't fit at minSize is cut with an ellipsis rather
// than being allowed to spill outside the frame.
const fitBlock = (
  paragraphs: string[],
  maxWidth: number,
  maxHeight: number,
  options: { maxSize: number; minSize: number; bold: boolean },
  measure: TextMeasurer,
): FittedBlock => {
  const { maxSize, minSize, bold } = options;
  const wrapWidth = maxWidth * WRAP_WIDTH_FACTOR;
  const wrapAt = (size: number) =>
    paragraphs.map((p) => wrapParagraph(p, wrapWidth, size, bold, measure));

  const finish = (wrapped: WrappedLine[][], size: number): FittedBlock => ({
    fontSize: size,
    paragraphs: wrapped.map((lines) => ({
      text: joinLines(lines),
      height: lines.length * size * LINE_HEIGHT,
    })),
    height: blockHeight(
      wrapped.map((lines) => lines.length),
      size,
    ),
  });

  for (let size = maxSize; size >= minSize; size -= FONT_STEP) {
    const wrapped = wrapAt(size);
    if (
      blockHeight(
        wrapped.map((lines) => lines.length),
        size,
      ) <= maxHeight
    ) {
      return finish(wrapped, size);
    }
  }

  const wrapped = wrapAt(minSize);
  const kept: WrappedLine[][] = [];
  let used = 0;
  let truncated = false;
  outer: for (const lines of wrapped) {
    const keptLines: WrappedLine[] = [];
    for (const line of lines) {
      const gap = kept.length > 0 && keptLines.length === 0 ? minSize * PARAGRAPH_GAP : 0;
      const next = used + gap + minSize * LINE_HEIGHT;
      if (next > maxHeight && (kept.length > 0 || keptLines.length > 0)) {
        truncated = true;
        if (keptLines.length > 0) kept.push(keptLines);
        break outer;
      }
      used = next;
      keptLines.push(line);
    }
    kept.push(keptLines);
  }

  if (truncated && kept.length > 0) {
    const last = kept[kept.length - 1];
    const lastLine = last[last.length - 1];
    last[last.length - 1] = {
      ...lastLine,
      text: ellipsize(lastLine.text, wrapWidth, minSize, bold, measure),
    };
  }
  return finish(kept, minSize);
};

const round = (value: number) => Math.round(value * 100) / 100;

const baseElement = (id: string, layerName: string) => ({
  id,
  layerName,
  rotation: 0,
  opacity: 100,
  locked: false,
  hidden: false,
});

const toParagraphs = (values: string[]): string[] =>
  values
    .flatMap((value) => value.split("\n"))
    .map((value) => value.trim())
    .filter(Boolean);

export const buildSlideCanvas = (
  slide: ParsedSlide,
  media: SlideMedia,
  measure: TextMeasurer,
) => {
  const elements: any[] = [];
  const areaLeft = MARGIN_X;
  const areaTop = MARGIN_Y;
  const areaWidth = CANVAS_WIDTH - MARGIN_X * 2;
  const areaHeight = CANVAS_HEIGHT - MARGIN_Y * 2;

  // Without a real title placeholder the first line is just a label, so all text
  // is treated as one evenly sized block instead of a headline over small print.
  const titleParagraphs = slide.hasTitleShape ? toParagraphs([slide.title]) : [];
  const bodyParagraphs = toParagraphs(
    slide.hasTitleShape ? slide.lines : [slide.title, ...slide.lines],
  );
  const hasText = titleParagraphs.length + bodyParagraphs.length > 0;
  const { pictures } = media;

  let textTop = areaTop;
  let textHeight = areaHeight;

  if (pictures.length > 0) {
    const pictureAreaHeight = hasText ? Math.round(areaHeight * 0.5) : areaHeight;
    const columns = Math.min(pictures.length, MAX_PICTURE_COLUMNS);
    const rows = Math.ceil(pictures.length / columns);
    const cellWidth = (areaWidth - GAP * (columns - 1)) / columns;
    const cellHeight = (pictureAreaHeight - GAP * (rows - 1)) / rows;

    pictures.forEach((picture, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      // Sized to the picture's own aspect ratio so the renderer's cover fit never crops it
      const scale = Math.min(cellWidth / picture.width, cellHeight / picture.height);
      const width = picture.width * scale;
      const height = picture.height * scale;
      elements.push({
        ...baseElement(`imp-picture-${index + 1}`, `Picture ${index + 1}`),
        type: "image",
        x: round(areaLeft + column * (cellWidth + GAP) + (cellWidth - width) / 2),
        y: round(areaTop + row * (cellHeight + GAP) + (cellHeight - height) / 2),
        width: round(width),
        height: round(height),
        content: picture.url,
      });
    });

    if (hasText) {
      textTop = areaTop + pictureAreaHeight + GAP;
      textHeight = areaHeight - pictureAreaHeight - GAP;
    }
  }

  if (hasText) {
    const hasBoth = titleParagraphs.length > 0 && bodyParagraphs.length > 0;
    const blockGap = hasBoth ? 20 : 0;

    const title =
      titleParagraphs.length > 0
        ? fitBlock(
            titleParagraphs,
            areaWidth,
            hasBoth ? textHeight * 0.38 : textHeight,
            { maxSize: hasBoth ? 52 : 64, minSize: 22, bold: true },
            measure,
          )
        : null;
    const body =
      bodyParagraphs.length > 0
        ? fitBlock(
            bodyParagraphs,
            areaWidth,
            textHeight - (title ? title.height + blockGap : 0),
            {
              maxSize: titleParagraphs.length > 0 ? 34 : pictures.length > 0 ? 40 : 48,
              minSize: 14,
              bold: false,
            },
            measure,
          )
        : null;

    const totalHeight = (title?.height ?? 0) + (title && body ? blockGap : 0) + (body?.height ?? 0);
    let y = textTop + (textHeight - totalHeight) / 2;

    const place = (block: FittedBlock, kind: "Title" | "Body", bold: boolean) => {
      block.paragraphs.forEach((paragraph, index) => {
        elements.push({
          ...baseElement(
            `imp-${kind.toLowerCase()}-${index + 1}`,
            block.paragraphs.length > 1 ? `${kind} ${index + 1}` : kind,
          ),
          type: "text",
          x: areaLeft,
          y: round(y),
          width: areaWidth,
          height: round(paragraph.height),
          content: paragraph.text,
          color: "#ffffff",
          fontSize: block.fontSize,
          fontFamily: "Inter",
          fontWeight: bold ? "Bold" : "Normal",
          lineHeight: LINE_HEIGHT,
          letterSpacing: 0,
          textAlign: "center",
          alignVertical: "middle",
          textSizing: "Box",
          textWrap: "Multi-line",
          dropShadow: true,
          stroke: false,
        });
        y += paragraph.height + block.fontSize * PARAGRAPH_GAP;
      });
    };

    if (title) place(title, "Title", true);
    if (title && body) y += blockGap - title.fontSize * PARAGRAPH_GAP;
    if (body) place(body, "Body", false);
  }

  return {
    elements,
    canvasBackground: media.background
      ? { type: "image", value: media.background }
      : { type: "transparent", value: "" },
  };
};
