/**
 * Tailor Agent — for a chosen vacancy, writes a tailored summary + matches/gaps/
 * suggestions. Port of v1 aiTailor. FAILS CLOSED to the DETERMINISTIC buildExplain
 * (matches/gaps/suggestions) plus a template summary — never blocks on the LLM.
 */
import { z } from "zod";
import { generateObject } from "../llm";
import { scoreVacancy, buildExplain } from "../scoring/fitScore";
import { cap } from "../scoring/lexicons";
import type { Profile, Vacancy } from "../schemas";

const TailorSchema = z.object({
  summary: z.string().default(""),
  matches: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
});
export type Tailored = z.infer<typeof TailorSchema> & { source: "llm" | "heuristic" };

/** Deterministic tailored summary from the Fit Score + explain (the fallback). */
function heuristicTailor(profile: Profile, v: Vacancy): Tailored {
  const a = scoreVacancy(profile, v);
  const ex = buildExplain(profile, v, a);
  const matched = ex.matches.length ? ex.matches : profile.skills.slice(0, 2);
  const gap = ex.gaps[0];
  let summary = `Results-driven candidate strong in ${matched.slice(0, 2).map(cap).join(" and ") || "core skills"}. `;
  summary += `Hands-on experience aligned to ${v.name.toLowerCase()} that maps to ${v.company}'s needs. `;
  if (gap) summary += `Currently building ${cap(gap)} to close the role's gap. `;
  summary += `Brings structured logic, fast iteration and clear communication.`;
  return { summary: summary.trim(), matches: ex.matches, gaps: ex.gaps, suggestions: ex.suggestions, source: "heuristic" };
}

export async function tailorAgent(profile: Profile, vacancy: Vacancy, provider?: string): Promise<Tailored> {
  try {
    const out = await generateObject(TailorSchema, [
      { role: "system", content: "You are a precise career assistant. Reply with JSON only. Never invent skills the candidate does not have." },
      { role: "user", content:
`Return JSON: matches (skills the candidate has that the job needs), gaps (important missing skills), suggestions (2-3 concrete actions), summary (2-3 sentence tailored résumé summary for THIS role weaving in the candidate's real skills + the job's keywords).

Candidate: ${JSON.stringify({ skills: profile.skills, soft: profile.soft, domains: profile.domains, years: profile.years }).slice(0, 2000)}
Vacancy: ${JSON.stringify({ name: vacancy.name, company: vacancy.company, requirements: vacancy.requirements, responsibilities: vacancy.responsibilities }).slice(0, 2000)}` },
    ], { provider, maxTokens: 500 });
    if (out.summary) return { ...out, source: "llm" };
    return heuristicTailor(profile, vacancy);
  } catch {
    return heuristicTailor(profile, vacancy); // FAIL CLOSED
  }
}
