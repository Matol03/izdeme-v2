/**
 * retrieval_query — a short "ideal job description this person is a fit for",
 * embedded with task_type=RETRIEVAL_QUERY and compared against vacancy embeddings.
 *
 * WHY (spec §4 caveat): résumés and job postings are ASYMMETRIC text — raw résumé↔JD
 * cosine under-performs. Turning the profile into a JD-shaped query lifts recall.
 *
 * This is the deterministic fallback builder. Phase 4 adds an LLM-written version
 * (richer), but this keeps the pipeline account-free and testable.
 */
import type { Profile } from "../schemas";
import { cap } from "../scoring/lexicons";

export function buildRetrievalQuery(p: Profile): string {
  const role = p.title || (p.seniority ? `${cap(p.seniority)} professional` : "Professional");
  const level = p.seniority && !/senior|lead/i.test(p.title || "") ? `${cap(p.seniority)} ` : "";
  const skills = p.skills.slice(0, 8).map(cap);
  const domains = p.domains.slice(0, 3).map(cap);

  const parts: string[] = [];
  parts.push(`${level}${role} role`);
  if (skills.length) parts.push(`requiring ${skills.join(", ")}`);
  if (domains.length) parts.push(`in ${domains.join(" / ")}`);
  if (p.years) parts.push(`for someone with ~${p.years} years of experience`);
  const projectHint = p.projects[0] ? ` Responsibilities similar to: ${p.projects[0]}.` : "";

  return `Ideal job: ${parts.join(" ")}.${projectHint}`.replace(/\s+/g, " ").trim();
}
