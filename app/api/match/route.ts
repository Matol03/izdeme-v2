import { parseResumeAgent } from "@/lib/agents/parser";
import { matchAndRank } from "@/lib/pipeline/matchAndRank";
import { parseResume } from "@/lib/parser/heuristic";
import { buildRetrievalQuery } from "@/lib/profile/retrievalQuery";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { resumeText?, prompt? } → { profile, plan, source, rankedBy, results[] } */
export async function POST(req: Request) {
  try {
    const { resumeText = "", prompt = "" } = await req.json();

    // Parse résumé (LLM agent → heuristic fallback) if provided.
    const profile = String(resumeText).trim()
      ? (await parseResumeAgent(String(resumeText))).profile
      : parseResume("");

    // Search query: the user's prompt, else derived from the parsed profile.
    const query =
      String(prompt).trim() ||
      profile.title ||
      profile.skills.slice(0, 4).join(" ") ||
      buildRetrievalQuery(profile) ||
      "developer";

    const out = await matchAndRank(profile, query, { top: 10 });
    return Response.json({ profile, query, ...out });
  } catch (e: any) {
    return Response.json({ error: e?.message || "match failed" }, { status: 500 });
  }
}
