/**
 * Query Planner Agent — NL prompt → hh.kz search filters (port of v1 aiSearchPlan),
 * schema-validated, FAILS CLOSED to a deterministic heuristic planner.
 */
import { SearchPlanSchema, type SearchPlan } from "../schemas";
import { generateObject } from "../llm";

const KZ_CITIES = ["almaty", "astana", "nur-sultan", "shymkent", "karaganda", "aktobe", "atyrau",
  "pavlodar", "kostanay", "kyzylorda", "taraz", "semey", "aktau", "kokshetau", "taldykorgan",
  "temirtau", "ust-kamenogorsk", "petropavlovsk"];

const titleCase = (s: string) => s.split(/([\s-])/).map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join("");

/** Deterministic fallback: detect city + remote intent, strip them from the keyword text. */
export function heuristicPlan(prompt: string): SearchPlan {
  const low = prompt.toLowerCase();
  const cityKey = KZ_CITIES.find(c => low.includes(c)) || "";
  const remote = /\bremote\b|\bonline\b|from home|work[- ]from[- ]home|удал[её]н/i.test(prompt);
  let text = prompt;
  if (cityKey) text = text.replace(new RegExp(cityKey, "ig"), " ");
  text = text.replace(/\bremote\b|\bonline\b|from home|\bin\b|\bat\b/ig, " ").replace(/\s+/g, " ").trim();
  return SearchPlanSchema.parse({ text: text || prompt, city: cityKey ? titleCase(cityKey) : "", remote, experience: "", employment: "", salary: null });
}

export async function planSearchAgent(prompt: string): Promise<{ plan: SearchPlan; source: "llm" | "heuristic" }> {
  try {
    const plan = await generateObject(SearchPlanSchema, [
      { role: "system", content: "You convert a job seeker's request into HeadHunter (hh.kz) search filters. Reply with strict JSON only." },
      { role: "user", content:
`Output JSON: text (role + core skills only, NO city/remote words), city (English, one of [Almaty, Astana, Shymkent, Karaganda, Aktobe, Atyrau, Pavlodar, Kostanay, Kyzylorda, Taraz, Semey, Aktau, Kokshetau, Taldykorgan, Temirtau, Ust-Kamenogorsk, Petropavlovsk] or ""), remote (bool), experience ("noExperience"|"between1And3"|"between3And6"|"moreThan6"|""), employment ("full"|"part"|"project"|""), salary (int KZT or null).

Request: """${prompt.slice(0, 700)}"""` },
    ], { maxTokens: 300 });
    return { plan, source: "llm" };
  } catch {
    return { plan: heuristicPlan(prompt), source: "heuristic" }; // FAIL CLOSED
  }
}
