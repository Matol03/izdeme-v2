/**
 * Parser Agent — LLM résumé parsing, schema-validated, FAILS CLOSED to the
 * deterministic heuristic parser (Phase 4 acceptance: a malformed LLM response never
 * surfaces broken JSON — it silently degrades to the Phase-3 heuristic path).
 */
import { ProfileSchema, type Profile } from "../schemas";
import { generateObject } from "../llm";
import { parseResume } from "../parser/heuristic";

const SYSTEM = "You are an expert résumé parser. Extract ONLY information explicitly present in the résumé. Never invent skills, employers, or dates. Reply with strict JSON only.";

export async function parseResumeAgent(text: string): Promise<{ profile: Profile; source: "llm" | "heuristic" }> {
  try {
    const profile = await generateObject(ProfileSchema, [
      { role: "system", content: SYSTEM },
      { role: "user", content:
`Return JSON with keys: name, title, seniority ("junior"|"middle"|"senior"|""), years (integer, EXCLUDING education dates), skills[] (lowercase, normalize aliases e.g. js->javascript), soft[], domains[], projects[] (short strings), education (string), languages[], certifications[].

Résumé:
"""${text.slice(0, 9000)}"""` },
    ], { maxTokens: 1200 });
    // Guard against an empty/hallucinated parse — prefer the heuristic if the LLM found nothing.
    if (profile.skills.length || profile.name) return { profile, source: "llm" };
    return { profile: parseResume(text), source: "heuristic" };
  } catch {
    return { profile: parseResume(text), source: "heuristic" }; // FAIL CLOSED
  }
}
