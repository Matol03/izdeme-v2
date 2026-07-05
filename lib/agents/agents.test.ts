import { describe, it, expect, beforeEach } from "vitest";
import { parseResumeAgent } from "./parser";
import { planSearchAgent, heuristicPlan } from "./planner";
import { parseResume } from "../parser/heuristic";
import { llmEnabled } from "../llm";

// Ensure no LLM is configured so we exercise the fail-closed path deterministically.
beforeEach(() => { delete process.env.GROQ_API_KEY; delete process.env.GEMINI_API_KEY; delete process.env.LLM_API_KEY; delete process.env.LLM_LOCK; delete process.env.LLM_PROVIDER; });

describe("Parser Agent — fail closed to heuristic", () => {
  it("returns the heuristic parse when no LLM key is set", async () => {
    expect(llmEnabled()).toBe(false);
    const text = "Aigerim\nData Analyst\nSKILLS\nPython, SQL, Pandas\nEXPERIENCE\n2021 - Present";
    const { profile, source } = await parseResumeAgent(text);
    expect(source).toBe("heuristic");
    expect(profile.skills).toEqual(parseResume(text).skills);
    expect(profile.skills).toContain("python");
  });
});

describe("Query Planner Agent — fail closed to heuristic", () => {
  it("returns the heuristic plan when no LLM key is set", async () => {
    const { plan, source } = await planSearchAgent("remote Python developer in Almaty");
    expect(source).toBe("heuristic");
    expect(plan.remote).toBe(true);
    expect(plan.city).toBe("Almaty");
    expect(plan.text.toLowerCase()).not.toContain("remote");
    expect(plan.text.toLowerCase()).not.toContain("almaty");
    expect(plan.text.toLowerCase()).toContain("python");
  });

  it("heuristicPlan handles no city / no remote", () => {
    const p = heuristicPlan("data analyst with SQL");
    expect(p.city).toBe("");
    expect(p.remote).toBe(false);
    expect(p.text.toLowerCase()).toContain("data analyst");
  });
});
