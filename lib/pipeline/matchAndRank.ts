/**
 * match_and_rank — the end-to-end matching flow (the body of the Phase-5 background job),
 * built to run fully account-free & deterministically:
 *
 *   prompt ─Planner→ filters
 *   profile ─embed(retrieval_query)→ pgvector/cosine top-40  (semantic RECALL)
 *   each candidate ─scoreVacancy→ deterministic Fit Score     (PRECISION core)
 *   top-15 ─Ranker→ metadata-aware order + reason             (LLM edge, fails closed)
 *
 * With no keys: heuristic planner + offline embeddings + deterministic Fit ordering.
 * With keys: LLM planner/ranker + Gemini embeddings + live hh corpus (later phases).
 */
import type { Profile, Vacancy } from "../schemas";
import { planSearchAgent } from "../agents/planner";
import { rankVacanciesAgent } from "../agents/ranker";
import { embedVacancies, retrieveCandidates, FALLBACK_POOL } from "../ingest/vacancies";
import { fetchCandidates } from "../ingest/hh";
import { scoreVacancy, buildExplain, type FitResult } from "../scoring/fitScore";
import type { SearchPlan } from "../schemas";

export interface MatchResult {
  vacancy: Vacancy;
  recall: number;                 // cosine similarity from retrieval
  fit: FitResult;                 // deterministic Fit Score
  explain: ReturnType<typeof buildExplain>;
  match?: number;                 // LLM 0–100 (only when LLM-ranked)
  reason?: string;
}
export interface MatchAndRankOut {
  plan: SearchPlan;
  planBy: "llm" | "heuristic";
  rankedBy: "llm" | "heuristic";
  source: "hh.kz" | "curated";
  results: MatchResult[];
}

export async function matchAndRank(
  profile: Profile,
  prompt: string,
  opts: { k?: number; top?: number; corpus?: Vacancy[] } = {},
): Promise<MatchAndRankOut> {
  const { plan, source: planBy } = await planSearchAgent(prompt);

  // Corpus: broad live hh.kz candidate fetch (filters relax if too few) → curated fallback.
  let vacancies = opts.corpus;
  let source: "hh.kz" | "curated" = "curated";
  if (!vacancies) {
    const hh = await fetchCandidates(plan);
    if (hh.length) { vacancies = hh; source = "hh.kz"; }
    else vacancies = FALLBACK_POOL;
  }
  const corpus = await embedVacancies(vacancies);

  // 1) semantic recall → top-K
  const retrieved = await retrieveCandidates(profile, corpus, opts.k ?? 40);

  // 2) deterministic Fit Score for each retrieved candidate
  const scored: MatchResult[] = retrieved.map(r => {
    const fit = scoreVacancy(profile, r.item);
    return { vacancy: r.item, recall: r.score, fit, explain: buildExplain(profile, r.item, fit) };
  });

  // 3) shortlist by deterministic Fit, then LLM re-rank (fails closed → keeps Fit order)
  const shortlist = scored.sort((a, b) => b.fit.score - a.fit.score).slice(0, 15);
  const { ranked, source: rankedBy } = await rankVacanciesAgent(prompt, shortlist.map(s => s.vacancy));

  const ordered: MatchResult[] = [];
  const used = new Set<number>();
  for (const r of ranked) {
    const base = shortlist[r.i];
    if (base && !used.has(r.i)) { ordered.push({ ...base, match: r.score, reason: r.reason }); used.add(r.i); }
  }
  shortlist.forEach((s, i) => { if (!used.has(i)) ordered.push(s); }); // append any the ranker omitted

  return { plan, planBy, rankedBy, source, results: ordered.slice(0, opts.top ?? 10) };
}
