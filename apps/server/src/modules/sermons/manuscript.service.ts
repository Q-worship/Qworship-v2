import OpenAI from "openai";
import type {
  Manuscript,
  ManuscriptBlock,
  ManuscriptProvider,
  ManuscriptStyle,
  IManuscriptDraft,
} from "./sermon.model.js";
import { countWords } from "./sermon.recorder.js";

/**
 * Turns a raw live transcript into a clean, structured sermon manuscript.
 *
 * Pipeline:
 *   1. Split the transcript into ~CHUNK_WORDS chunks on sentence boundaries.
 *   2. Edit each chunk in parallel into blocks (heading / paragraph / quote).
 *      Each chunk sees the tail of the previous one so headings and sentences
 *      carry across the seam.
 *   3. One metadata pass over the cleaned text: title, summary, key points,
 *      discussion questions, scripture references.
 *
 * Both providers speak the OpenAI chat-completions protocol, so Groq is just a
 * different baseURL.
 */

const CHUNK_WORDS = 1400;
const CONTEXT_WORDS = 120;
const CHUNK_CONCURRENCY = 3;

const PROVIDERS: Record<
  ManuscriptProvider,
  { apiKey: () => string | undefined; baseURL?: string; defaultModel: () => string }
> = {
  openai: {
    apiKey: () => process.env.OPENAI_API_KEY,
    defaultModel: () => process.env.SERMON_OPENAI_MODEL || "gpt-5.5",
  },
  groq: {
    apiKey: () => process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
    defaultModel: () => process.env.SERMON_GROQ_MODEL || "openai/gpt-oss-120b",
  },
};

export interface GenerateOptions {
  provider: ManuscriptProvider;
  model?: string;
  style?: ManuscriptStyle;
  /** References detected live by hands-free Bible, used as hints. */
  detectedReferences?: string[];
  /** Override chunk size (tests use small chunks to exercise the seams). */
  chunkWords?: number;
}

export type GeneratedDraft = Omit<IManuscriptDraft, "_id" | "createdAt">;

const clients = new Map<ManuscriptProvider, OpenAI>();
function getClient(provider: ManuscriptProvider): OpenAI {
  const existing = clients.get(provider);
  if (existing) return existing;
  const config = PROVIDERS[provider];
  const apiKey = config.apiKey();
  if (!apiKey) throw new Error(`${provider.toUpperCase()}_API_KEY is not configured`);
  const client = new OpenAI({ apiKey, baseURL: config.baseURL });
  clients.set(provider, client);
  return client;
}

// ── Prompts ──────────────────────────────────────────────────────────────────

const STYLE_RULES: Record<ManuscriptStyle, string> = {
  readable: `- Remove filler words (um, uh, you know, like, I mean), stutters, false starts and repeated words.
- Remove call-and-response and crowd prompts that do not read well in print ("can I get an amen", "say it with me", "turn to your neighbour and say..."), unless they carry the point being made.
- Merge broken fragments into complete, grammatical sentences.
- The transcript comes from a live projection system, so it can contain short spoken commands to the screen operator or voice control ("show me John 3:16", "next verse", "go back", "move", "NIV"). Remove these when they stand alone as instructions. Keep the scripture they point to only if the preacher actually reads or discusses it, and keep invitations to the congregation ("turn with me to John 3:16").`,
  verbatim: `- Remove only filler sounds (um, uh, er), stutters, accidental word repeats, and standalone commands to the projection system ("next verse", "go back", "show me John 3:16" said to the operator).
- Keep everything else as spoken, including call-and-response and crowd prompts.`,
};

const cleanSystemPrompt = (style: ManuscriptStyle) => `You are a careful copy editor preparing a church sermon manuscript for the congregation to read. You receive one section of a live speech-to-text transcript.

Your job is to EDIT, not rewrite:
- Keep the preacher's own words, voice, first-person perspective, illustrations, stories and humour.
- NEVER add ideas, facts, scripture, theology or conclusions the preacher did not say. Never summarise.
- NEVER change the meaning of a theological statement.
${STYLE_RULES[style]}
- Fix punctuation, capitalisation and obvious transcription errors, especially Bible book names and names of biblical people and places (e.g. "Phillipians" -> "Philippians", "Jona" -> "Jonah").
- Write references in standard form, e.g. "John 3:16" instead of "John chapter three verse sixteen".
- Split the text into readable paragraphs of 2-5 sentences.
- Add a short heading (2-6 words) only where the preacher clearly moves to a new point. Do not add a heading at the very start unless the section clearly begins a new point.
- When the preacher reads scripture aloud, put ONLY the words of the Bible verse in a "quote" block, with its reference if it is known. The preacher's own explanation before or after the verse always goes in a paragraph, never inside the quote.
- Every scripture reference anywhere in the text must use standard form ("1 Peter 5:7", not "One Peter five seven").

Return JSON only:
{"blocks":[{"type":"heading","text":"..."},{"type":"paragraph","text":"..."},{"type":"quote","text":"...","reference":"John 3:16"}]}`;

const METADATA_SYSTEM_PROMPT = `You prepare the front matter for a sermon manuscript that will be sent to church members. You receive the full edited manuscript.

Base everything strictly on the manuscript. Do not invent content.

Return JSON only:
{
  "title": "a short sermon title (use the preacher's own title if they state one)",
  "summary": "2-3 sentence summary in plain language",
  "mainScripture": "the main text the sermon is built on, e.g. 'Romans 8:28-39', or empty string",
  "scriptureReferences": ["every scripture reference quoted or cited, in order of first appearance, standard form"],
  "keyPoints": ["3-6 key points, one sentence each"],
  "discussionQuestions": ["3-5 open questions for small groups or personal reflection"]
}`;

// ── Helpers ──────────────────────────────────────────────────────────────────

export function chunkTranscript(text: string, maxWords = CHUNK_WORDS): string[] {
  // Live transcripts can be light on punctuation, so cap any "sentence" at
  // SENTENCE_MAX_WORDS to keep chunks near maxWords.
  const SENTENCE_MAX_WORDS = 60;
  const sentences = (text.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]*\s*/g) ?? []).flatMap((s) => {
    const words = s.trim().split(" ");
    if (words.length <= SENTENCE_MAX_WORDS) return [s];
    const parts: string[] = [];
    for (let i = 0; i < words.length; i += SENTENCE_MAX_WORDS) {
      parts.push(words.slice(i, i + SENTENCE_MAX_WORDS).join(" ") + " ");
    }
    return parts;
  });
  const chunks: string[] = [];
  let current: string[] = [];
  let words = 0;
  for (const sentence of sentences) {
    const sentenceWords = countWords(sentence);
    if (words + sentenceWords > maxWords && current.length > 0) {
      chunks.push(current.join("").trim());
      current = [];
      words = 0;
    }
    current.push(sentence);
    words += sentenceWords;
  }
  if (current.length) chunks.push(current.join("").trim());
  return chunks;
}

function parseJson<T>(raw: string | null | undefined): T {
  if (!raw) throw new Error("Empty response from model");
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(cleaned) as T;
}

async function completeJson<T>(
  provider: ManuscriptProvider,
  model: string,
  system: string,
  user: string
): Promise<T> {
  const client = getClient(provider);
  const isReasoningModel = /^(gpt-5|o\d)/.test(model) && !model.includes("chat");
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        ...(isReasoningModel ? { reasoning_effort: "low" as const } : { temperature: 0.2 }),
      });
      return parseJson<T>(response.choices[0]?.message?.content);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    })
  );
  return results;
}

function sanitizeBlocks(input: unknown): ManuscriptBlock[] {
  const blocks = (input as { blocks?: unknown[] })?.blocks;
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap((b: any): ManuscriptBlock[] => {
    const text = typeof b?.text === "string" ? b.text.trim() : "";
    if (!text) return [];
    if (b.type === "heading") return [{ type: "heading", text }];
    if (b.type === "quote") {
      const reference = typeof b.reference === "string" && b.reference.trim() ? b.reference.trim() : undefined;
      return [{ type: "quote", text, ...(reference ? { reference } : {}) }];
    }
    return [{ type: "paragraph", text }];
  });
}

/**
 * Drop exact duplicates and references already covered by a wider range in
 * the same chapter ("Philippians 4:6" when "Philippians 4:4-7" is listed).
 */
export function dedupeReferences(refs: string[]): string[] {
  const parse = (r: string) => {
    const m = r.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
    return m ? { chapter: `${m[1].toLowerCase()} ${m[2]}`, start: +m[3], end: +(m[4] ?? m[3]) } : null;
  };
  const seen = new Set<string>();
  const unique = refs.filter((r) => {
    const key = r.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.filter((r, i) => {
    const a = parse(r);
    if (!a) return true;
    return !unique.some((other, j) => {
      if (i === j) return false;
      const b = parse(other);
      return !!b && b.chapter === a.chapter && b.start <= a.start && b.end >= a.end && (b.end - b.start) > (a.end - a.start);
    });
  });
}

const stringList = (v: unknown) =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && !!s.trim()).map((s) => s.trim()) : [];

export const blocksToText = (blocks: ManuscriptBlock[]) =>
  blocks
    .map((b) =>
      b.type === "heading" ? `## ${b.text}` : b.type === "quote" ? `> ${b.text}${b.reference ? ` (${b.reference})` : ""}` : b.text
    )
    .join("\n\n");

// ── Main entry ───────────────────────────────────────────────────────────────

export async function generateManuscript(transcript: string, options: GenerateOptions): Promise<GeneratedDraft> {
  const { provider, style = "readable", detectedReferences = [] } = options;
  const model = options.model || PROVIDERS[provider].defaultModel();
  const startedAt = Date.now();

  const chunks = chunkTranscript(transcript, options.chunkWords);
  if (chunks.length === 0) throw new Error("Transcript is empty");

  const referenceHint = detectedReferences.length
    ? `Scripture references detected live during the sermon (may help with quote blocks): ${[...new Set(detectedReferences)].join(", ")}\n\n`
    : "";

  const chunkBlocks = await mapWithConcurrency(chunks, CHUNK_CONCURRENCY, async (chunk, i) => {
    const previousTail = i > 0 ? chunks[i - 1].split(" ").slice(-CONTEXT_WORDS).join(" ") : "";
    const user =
      referenceHint +
      (previousTail
        ? `Context: the previous section ended with (do NOT include this in your output):\n"""${previousTail}"""\n\n`
        : "") +
      `Section ${i + 1} of ${chunks.length}. Edit this section:\n"""${chunk}"""`;
    const result = await completeJson<unknown>(provider, model, cleanSystemPrompt(style), user);
    return sanitizeBlocks(result);
  });

  const blocks = chunkBlocks.flat();
  if (blocks.length === 0) throw new Error("Model returned no manuscript content");

  const cleanedText = blocksToText(blocks);
  const meta = await completeJson<Record<string, unknown>>(provider, model, METADATA_SYSTEM_PROMPT, cleanedText);

  const manuscript: Manuscript = {
    title: typeof meta.title === "string" && meta.title.trim() ? meta.title.trim() : "Untitled Sermon",
    summary: typeof meta.summary === "string" ? meta.summary.trim() : "",
    mainScripture: typeof meta.mainScripture === "string" && meta.mainScripture.trim() ? meta.mainScripture.trim() : undefined,
    scriptureReferences: dedupeReferences(stringList(meta.scriptureReferences)),
    blocks,
    keyPoints: stringList(meta.keyPoints),
    discussionQuestions: stringList(meta.discussionQuestions),
  };

  const inputWords = countWords(transcript);
  const outputWords = blocks.reduce((sum, b) => sum + countWords(b.text), 0);

  return {
    provider,
    model,
    style,
    manuscript,
    stats: {
      inputWords,
      outputWords,
      retention: inputWords ? Math.round((outputWords / inputWords) * 100) / 100 : 0,
      latencyMs: Date.now() - startedAt,
      chunks: chunks.length,
    },
  };
}
