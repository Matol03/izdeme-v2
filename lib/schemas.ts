/**
 * Zod schemas — the single source of truth for the résumé/vacancy/match JSON shapes.
 * Used by (a) LLM structured outputs (generateObject), and (b) DB row types.
 * Mirrors the Postgres model in supabase/migrations/0001_init.sql.
 */
import { z } from "zod";

/** Parsed résumé profile (heuristic parser output + LLM parser output share this shape). */
export const ProfileSchema = z.object({
  name: z.string().default(""),
  title: z.string().default(""),
  seniority: z.string().default(""), // "" | junior | middle | senior | lead | intern
  years: z.number().default(0),
  skills: z.array(z.string()).default([]),        // hard/technical skills (lowercase)
  soft: z.array(z.string()).default([]),
  domains: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
  experience: z.array(z.any()).default([]),
  education: z.string().default("Not detected"),
  educationList: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
});
export type Profile = z.infer<typeof ProfileSchema>;

/** Minimal vacancy shape the scorer needs (a normalized hh.kz vacancy). */
export const VacancySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  company: z.string().default("Company"),
  area: z.string().default("—"),
  salary: z.tuple([z.number().nullable(), z.number().nullable(), z.string().nullable()]).nullable().optional(),
  requirements: z.string().default(""),
  responsibilities: z.string().default(""),
  description: z.string().default(""),
  url: z.string().optional(),
  schedule: z.string().nullable().optional(),
  experience: z.string().nullable().optional(), // hh "experience" label, e.g. "3–6 years"
});
export type Vacancy = z.infer<typeof VacancySchema>;

/** Fit Score result for a (profile, vacancy) pair — persisted to `matches`. */
export const MatchSchema = z.object({
  score: z.number(),                 // 35–99
  breakdown: z.object({ hard: z.number(), exp: z.number(), soft: z.number() }),
  matches: z.array(z.string()),
  gaps: z.array(z.string()),
  softGaps: z.array(z.string()),
  suggestions: z.array(z.string()).optional(),
  reason: z.string().optional(),     // Ranker Agent one-liner
});
export type Match = z.infer<typeof MatchSchema>;

/** LLM Query Planner output (prompt → hh.kz filters). Ported from v1 aiSearchPlan. */
export const SearchPlanSchema = z.object({
  text: z.string().default(""),
  city: z.string().default(""),
  remote: z.boolean().default(false),
  experience: z.string().default(""), // noExperience | between1And3 | between3And6 | moreThan6 | ""
  employment: z.string().default(""), // full | part | project | ""
  salary: z.number().nullable().default(null),
});
export type SearchPlan = z.infer<typeof SearchPlanSchema>;
