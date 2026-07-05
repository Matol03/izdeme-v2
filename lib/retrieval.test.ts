import { describe, it, expect } from "vitest";
import { retrieveTopK } from "./retrieval";
import { embedVacancies, retrieveCandidates, FALLBACK_POOL } from "./ingest/vacancies";
import type { Profile } from "./schemas";

const profile = (p: Partial<Profile>): Profile => ({
  name: "", title: "", seniority: "", years: 0, skills: [], soft: [], domains: [],
  projects: [], experience: [], education: "Not detected", educationList: [], languages: [], certifications: [], ...p,
});

describe("retrieveTopK", () => {
  it("orders by cosine desc and respects k", () => {
    const q = [1, 0, 0];
    const corpus = [
      { item: "a", embedding: [1, 0, 0] },
      { item: "c", embedding: [0, 1, 0] },
      { item: "b", embedding: [0.7, 0.7, 0] },
    ];
    const r = retrieveTopK(q, corpus, 2);
    expect(r.map(x => x.item)).toEqual(["a", "b"]);
    expect(r[0].score).toBeCloseTo(1, 5);
  });
});

describe("retrieveCandidates — semantic recall (offline fallback embeddings)", () => {
  it("surfaces role-relevant vacancies above unrelated ones", async () => {
    const corpus = await embedVacancies(FALLBACK_POOL);
    const p = profile({
      title: "Machine Learning Engineer", seniority: "middle", years: 3,
      skills: ["python", "pytorch", "machine learning", "computer vision", "numpy", "docker"],
      soft: ["research", "analytical"], projects: ["Trained a computer vision model in PyTorch"],
    });
    const top = await retrieveCandidates(p, corpus, 5);
    const names = top.map(t => t.item.name);
    expect(["Machine Learning Engineer", "NLP Engineer", "Data Scientist"]).toContain(names[0]);
    const top3 = names.slice(0, 3);
    expect(top3).not.toContain("UX/UI Designer");
    expect(top3).not.toContain("Marketing Analyst");
  });
});
