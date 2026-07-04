/**
 * Deterministic Fit Score — Hard 40% / Experience 30% / Soft 30%.
 * THE differentiator. Ported VERBATIM from IzdeMe v1 (index.html) and pinned by
 * unit tests. An LLM must never redecide this (see spec §7 "do NOT change").
 */
import { HARD_SKILLS, SOFT_SKILLS, DOMAINS, matchLexicon, cap } from "./lexicons";
import type { Profile, Vacancy } from "../schemas";

export interface FitResult {
  score: number;
  breakdown: { hard: number; exp: number; soft: number };
  matches: string[];
  gaps: string[];
  softGaps: string[];
  vp: { hard: string[]; soft: string[]; domains: string[]; text: string };
}

/** Extract the vacancy's required hard/soft/domain terms from its text. */
export function vacancyProfile(v: Vacancy) {
  const blob = `${v.name} ${v.requirements || ""} ${v.responsibilities || ""} ${v.description || ""}`;
  return {
    hard: matchLexicon(blob, HARD_SKILLS),
    soft: matchLexicon(blob, SOFT_SKILLS),
    domains: matchLexicon(blob, DOMAINS),
    text: blob.toLowerCase(),
  };
}

/** hh "experience" label → required seniority level (0..3). */
export function expLevel(str?: string | null): number {
  if (!str) return 1;
  const s = str.toLowerCase();
  if (/(нет опыта|no experience|<\s*1|junior|intern)/.test(s)) return 0;
  if (/6|более 6|senior|6\+/.test(s)) return 3;
  if (/3|middle/.test(s)) return 2;
  return 1;
}

/** Weighted Fit Score for a (profile, vacancy) pair. Deterministic; clamp 35–99. */
export function scoreVacancy(resume: Profile, v: Vacancy): FitResult {
  const vp = vacancyProfile(v);

  // 1) HARD SKILLS — 40%
  const hardMatches = vp.hard.filter(s => resume.skills.includes(s));
  const hardGaps = vp.hard.filter(s => !resume.skills.includes(s));
  const hardScore = vp.hard.length ? hardMatches.length / vp.hard.length : (resume.skills.length ? 0.6 : 0.4);

  // 2) PROJECTS / EXPERIENCE — 30%
  const projText = (resume.projects.join(" ") + " " + resume.skills.join(" ") + " " + resume.domains.join(" ")).toLowerCase();
  const respHits = vp.hard.filter(s => projText.includes(s)).length;
  const projScore = vp.hard.length ? respHits / vp.hard.length : 0.5;
  const domHit = vp.domains.some(d => resume.domains.includes(d)) ? 1 : (vp.domains.length ? 0.4 : 0.6);
  const need = expLevel(v.experience);
  const have = resume.years >= 6 ? 3 : resume.years >= 3 ? 2 : resume.years >= 1 ? 1 : 0;
  const senScore = have >= need ? 1 : Math.max(0.3, 1 - (need - have) * 0.32);
  const expScore = projScore * 0.55 + senScore * 0.3 + domHit * 0.15;

  // 3) SOFT SKILLS — 30%
  const softMatches = vp.soft.filter(s => resume.soft.includes(s));
  const softGaps = vp.soft.filter(s => !resume.soft.includes(s));
  const softScore = vp.soft.length ? (0.45 + 0.55 * (softMatches.length / vp.soft.length)) : 0.6;

  const overall = hardScore * 0.40 + expScore * 0.30 + softScore * 0.30;
  const pct = Math.max(35, Math.min(99, Math.round(overall * 100)));

  return {
    score: pct,
    breakdown: { hard: Math.round(hardScore * 100), exp: Math.round(expScore * 100), soft: Math.round(softScore * 100) },
    matches: hardMatches,
    gaps: hardGaps,
    softGaps,
    vp,
  };
}

/** Decode a FitResult into matches / gaps / suggestions. Ported from v1 buildExplain. */
export function buildExplain(resume: Profile, _v: Vacancy, a: FitResult): { matches: string[]; gaps: string[]; suggestions: string[] } {
  const matches = a.matches.slice(0, 6);
  const gaps = a.gaps.slice(0, 5);
  const suggestions: string[] = [];
  for (const g of gaps.slice(0, 3)) suggestions.push(`Add <b>${cap(g)}</b> — required here but missing from your resume.`);
  if (a.breakdown.exp < 60 && resume.years < 3) suggestions.push(`Highlight a hands-on project to lift your experience score (${a.breakdown.exp}%).`);
  if (a.softGaps.length && a.breakdown.soft < 70) suggestions.push(`Mention <b>${cap(a.softGaps[0])}</b> to strengthen soft-skill fit.`);
  if (!suggestions.length) suggestions.push(`Strong match — emphasise <b>${cap(matches[0] || resume.skills[0] || "your core skill")}</b> in your summary and apply.`);
  return { matches, gaps, suggestions: suggestions.slice(0, 3) };
}
