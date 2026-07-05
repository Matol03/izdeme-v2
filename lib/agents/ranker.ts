/**
 * Ranker Agent — scores a SHORTLIST (already retrieved + Fit-scored) 0–100 against the
 * prompt using ALL metadata (role/skills, city, remote, seniority, salary), with a
 * one-line reason. Port of v1 aiRankVacancies. FAILS CLOSED: on any error it keeps the
 * input order (which the pipeline has pre-sorted by deterministic Fit Score).
 *
 * Key optimization vs v1: it ranks only the ~15 retrieved candidates, not a fresh dump.
 */
import { z } from "zod";
import { generateObject } from "../llm";
import type { Vacancy } from "../schemas";

const RankSchema = z.object({
  ranked: z.array(z.object({ i: z.number(), score: z.number(), reason: z.string().default("") })).default([]),
});

export interface Ranked { i: number; score?: number; reason?: string }

export async function rankVacanciesAgent(
  prompt: string,
  items: Vacancy[],
  provider?: string,
): Promise<{ ranked: Ranked[]; source: "llm" | "heuristic" }> {
  const compact = items.slice(0, 40).map((v, i) => ({
    i, title: v.name, company: v.company, city: v.area,
    schedule: v.schedule || "", experience: v.experience || "",
    salary: v.salary ? `${v.salary[0] ?? ""}-${v.salary[1] ?? ""} ${v.salary[2] ?? ""}`.trim() : "n/a",
    req: (v.requirements || "").slice(0, 130),
  }));
  try {
    const out = await generateObject(RankSchema, [
      { role: "system", content: "You are a vacancy-matching engine. Score how well each vacancy matches the request, weighing ALL metadata: role/skills, city, remote vs on-site, seniority/experience, salary. Reply with strict JSON only." },
      { role: "user", content:
`Request: """${prompt.slice(0, 700)}"""

Vacancies: ${JSON.stringify(compact)}

Return {"ranked":[{"i":<index>,"score":<0-100>,"reason":"<max 9 words>"}]} sorted best first, only score>=45.` },
    ], { provider, maxTokens: 1400 });
    if (out.ranked.length) return { ranked: out.ranked, source: "llm" };
    return { ranked: items.map((_, i) => ({ i })), source: "heuristic" };
  } catch {
    return { ranked: items.map((_, i) => ({ i })), source: "heuristic" }; // FAIL CLOSED → keep Fit order
  }
}
