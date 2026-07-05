import { describe, it, expect } from "vitest";
import { hashEmbed, cosine, embed, EMBED_DIMS } from "./embeddings";

describe("hashEmbed (offline fallback)", () => {
  it("is deterministic and correctly dimensioned", () => {
    expect(hashEmbed("python backend developer")).toEqual(hashEmbed("python backend developer"));
    expect(hashEmbed("x").length).toBe(EMBED_DIMS);
  });
  it("produces (near) unit-norm vectors", () => {
    const v = hashEmbed("data analyst sql dashboards");
    expect(Math.sqrt(v.reduce((s, x) => s + x * x, 0))).toBeCloseTo(1, 5);
  });
  it("cosine(self)≈1 and overlapping text > disjoint text", () => {
    const q = hashEmbed("python machine learning pytorch");
    expect(cosine(q, q)).toBeCloseTo(1, 5);
    const related = cosine(q, hashEmbed("pytorch python deep learning"));
    const unrelated = cosine(q, hashEmbed("figma ux prototyping brand design"));
    expect(related).toBeGreaterThan(unrelated);
  });
});

describe("embed", () => {
  it("falls back to hashEmbed when no GEMINI_API_KEY", async () => {
    delete process.env.GEMINI_API_KEY;
    expect(await embed("python developer", "RETRIEVAL_QUERY")).toEqual(hashEmbed("python developer"));
  });
});
