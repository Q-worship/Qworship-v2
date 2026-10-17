/**
 * Compare manuscript generation across providers/models on a transcript.
 *
 *   npx tsx src/scripts/test-sermon-manuscript.ts [transcript.txt] [outDir] [provider:model ...]
 *
 * Defaults to the bundled sample transcript and the default model of each
 * provider. Writes one Markdown file per run to outDir and prints the stats.
 */
import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { generateManuscript, blocksToText } from "../modules/sermons/manuscript.service.js";
import type { ManuscriptProvider } from "../modules/sermons/sermon.model.js";

const here = dirname(fileURLToPath(import.meta.url));
const [transcriptArg, outArg, ...targets] = process.argv.slice(2);
const transcriptPath = transcriptArg || join(here, "../modules/sermons/fixtures/sample-sermon-transcript.txt");
const outDir = outArg || "manuscript-test-output";

const runs = (targets.length ? targets : ["openai", "groq"]).map((t) => {
  const [provider, ...model] = t.split(":");
  return { provider: provider as ManuscriptProvider, model: model.join(":") || undefined };
});

const transcript = readFileSync(transcriptPath, "utf8");
mkdirSync(outDir, { recursive: true });

for (const run of runs) {
  const label = `${run.provider}:${run.model ?? "default"}`;
  try {
    // Small chunks so even the sample transcript exercises the chunk seams.
    const draft = await generateManuscript(transcript, { ...run, chunkWords: 600 });
    const m = draft.manuscript;
    const md = [
      `# ${m.title}`,
      `_${draft.provider} / ${draft.model} — ${draft.stats.latencyMs}ms, ${draft.stats.chunks} chunks, retention ${draft.stats.retention}_`,
      `**Summary:** ${m.summary}`,
      m.mainScripture ? `**Main text:** ${m.mainScripture}` : "",
      `**Scripture:** ${m.scriptureReferences.join(", ")}`,
      blocksToText(m.blocks),
      `## Key points\n${m.keyPoints.map((p) => `- ${p}`).join("\n")}`,
      `## Discussion questions\n${m.discussionQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    const file = join(outDir, `${draft.provider}-${draft.model.replace(/[^a-z0-9.-]/gi, "_")}.md`);
    writeFileSync(file, md);
    console.log(`✔ ${label} → ${draft.model}`, draft.stats, file);
  } catch (err: any) {
    console.error(`✘ ${label}: ${err?.status ?? ""} ${err?.message ?? err}`);
  }
}
