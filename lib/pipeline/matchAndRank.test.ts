import { describe, it, expect, beforeEach } from "vitest";
import { matchAndRank } from "./matchAndRank";
import { rankVacanciesAgent } from "../agents/ranker";
import { tailorAgent } from "../agents/tailor";
import { FALLBACK_POOL } from "../ingest/vacancies";
import type { Profile } from "../schemas";

const clearKeys = () => ["GROQ_API_KEY", "GEMINI_API_KEY", "LLM_API_KEY", "LLM_LOCK", "LLM_PROVIDER"].forEach(k => delete process.env[k]);
const profile = (p: Partial<Profile>): Profile => ({
  name: "", title: "", seniority: "", years: 0, skills: [], soft: [], domains: [],
  projects: [], experience: [], education: "Not detected", educationList: [], languages: [], certifications: [], ...p,
});
beforeEach(clearKeys);

describe("matchAndRank — end-to-end (no keys → fully deterministic)", () => {
  it("returns Fit-ordered, role-relevant results with plan + explainability", async () => {
    const p = profile({
      title: "Machine Learning Engineer", seniority: "middle", years: 3,
      skills: ["python", "pytorch", "machine learning", "computer vision", "numpy", "docker"],
      soft: ["research", "analytical"], projects: ["Trained a computer vision model in PyTorch"],
    });
    const out = await matchAndRank(p, "remote machine learning engineer");

    expect(out.rankedBy).toBe("heuristic");           // no LLM → deterministic ranking
    expect(out.plan.remote).toBe(true);               // planner picked up "remote"
    expect(out.results.length).toBeGreaterThan(0);
    expect(out.results.length).toBeLessThanOrEqual(10);

    expect(["Machine Learning Engineer", "NLP Engineer", "Data Scientist"]).toContain(out.results[0].vacancy.name);

    const fits = out.results.map(r => r.fit.score);
    expect([...fits].sort((a, b) => b - a)).toEqual(fits); // sorted by Fit desc

    const r0 = out.results[0];
    expect(r0.recall).toBeGreaterThan(0);              // came through semantic retrieval
    expect(r0.explain.matches.length + r0.explain.gaps.length).toBeGreaterThan(0);
  });
});

describe("Ranker Agent — fail closed", () => {
  it("keeps input (Fit) order when no LLM key", async () => {
    const { ranked, source } = await rankVacanciesAgent("python", FALLBACK_POOL.slice(0, 3));
    expect(source).toBe("heuristic");
    expect(ranked.map(r => r.i)).toEqual([0, 1, 2]);
  });
});

describe("Tailor Agent — fail closed", () => {
  it("returns a deterministic summary + explain when no LLM key", async () => {
    const t = await tailorAgent(profile({ skills: ["python", "sql"], years: 2 }), FALLBACK_POOL[0]);
    expect(t.source).toBe("heuristic");
    expect(t.summary.length).toBeGreaterThan(20);
    expect(Array.isArray(t.suggestions)).toBe(true);
  });
});
