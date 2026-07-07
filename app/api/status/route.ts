import { llmStatus } from "@/lib/llm";
import { hhConfigured } from "@/lib/ingest/hh";

export const runtime = "nodejs";

/** GET → which real backends are live (LLM providers, embeddings, hh corpus). */
export async function GET() {
  return Response.json({
    ...llmStatus(),
    embeddings: !!process.env.GEMINI_API_KEY, // real semantic (Gemini) vs offline fallback
    hh: hhConfigured(),                         // live hh.kz corpus vs curated
  });
}
