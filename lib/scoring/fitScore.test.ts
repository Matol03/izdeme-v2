import { describe, it, expect } from "vitest";
import { scoreVacancy, buildExplain, expLevel } from "./fitScore";
import type { Profile, Vacancy } from "../schemas";

const profile = (p: Partial<Profile>): Profile => ({
  name: "", title: "", seniority: "", years: 0, skills: [], soft: [], domains: [],
  projects: [], experience: [], education: "Not detected", educationList: [], languages: [], certifications: [], ...p,
});
const vacancy = (v: Partial<Vacancy>): Vacancy => ({
  name: "", company: "Co", area: "—", requirements: "", responsibilities: "", description: "", ...v,
});

describe("scoreVacancy — exact formula (Hard 40 / Exp 30 / Soft 30)", () => {
  it("reproduces the documented arithmetic to the integer", () => {
    // resume ∩ vacancy = {python, sql}; vacancy also needs docker; domain + seniority + soft all align
    const a = scoreVacancy(
      profile({ skills: ["python", "sql"], soft: ["communication"], domains: ["fintech"], projects: ["built python sql pipeline"], years: 4 }),
      vacancy({ name: "Backend Developer", requirements: "Python, SQL, Docker", responsibilities: "communication, fintech", experience: "3–6 years" }),
    );
    // hard 2/3=.6667→67
    // exp: expLevel("3–6 years")=3 (v1 quirk: /6/ matches "3–6"), have=2 → senScore=.68
    //      .55*.6667 + .30*.68 + .15*1 = .7207 → 72
    // soft .45+.55=1→100 ; overall .4*.6667+.3*.7207+.3*1 = .7829 → 78
    expect(a.score).toBe(78);
    expect(a.breakdown).toEqual({ hard: 67, exp: 72, soft: 100 });
    expect(a.matches.sort()).toEqual(["python", "sql"]);
    expect(a.gaps).toContain("docker");
  });

  it("hard-skill fallback: vacancy lists no hard skills but résumé has some → hardScore 0.6", () => {
    const a = scoreVacancy(
      profile({ skills: ["python"] }),
      vacancy({ name: "Office Manager", requirements: "organizing, scheduling" }),
    );
    expect(a.breakdown.hard).toBe(60);
  });

  it("hard-skill fallback: empty résumé + no vacancy hard skills → hardScore 0.4", () => {
    const a = scoreVacancy(profile({}), vacancy({ name: "Office Manager", requirements: "organizing" }));
    expect(a.breakdown.hard).toBe(40);
  });

  it("seniority-gap formula: candidate 1yr vs role needing 6+ → senScore max(0.3, 1-(3-1)*0.32)=0.36", () => {
    const a = scoreVacancy(
      profile({ skills: ["python"], years: 1 }),
      vacancy({ name: "Senior Python Engineer", requirements: "Python", experience: "6+ years senior" }),
    );
    // hard 1/1=1→100; projScore python-in-skills=1/1=1; senScore=.36; domHit(no domains)=.6
    // exp = .55*1 + .3*.36 + .15*.6 = .55+.108+.09 = .748 → 75
    expect(a.breakdown.exp).toBe(75);
  });

  it("always clamps to [35, 99]", () => {
    for (const y of [0, 3, 8]) {
      const a = scoreVacancy(profile({ skills: [], years: y }), vacancy({ name: "x", requirements: "python java rust" }));
      expect(a.score).toBeGreaterThanOrEqual(35);
      expect(a.score).toBeLessThanOrEqual(99);
    }
  });
});

describe("expLevel", () => {
  it("maps hh experience labels to required levels", () => {
    expect(expLevel("")).toBe(1);
    expect(expLevel("No experience")).toBe(0);
    expect(expLevel("Junior")).toBe(0);
    expect(expLevel("Middle")).toBe(2);
    expect(expLevel("More than 6 years")).toBe(3);
    // v1 quirk preserved verbatim: "3–6 years" contains "6", so the /6/ branch wins → 3
    expect(expLevel("3–6 years")).toBe(3);
  });
});

describe("buildExplain", () => {
  it("turns gaps into 'Add X' suggestions", () => {
    const p = profile({ skills: ["python"], years: 1 });
    const v = vacancy({ name: "Data Eng", requirements: "Python, Spark, Kafka" });
    const a = scoreVacancy(p, v);
    const ex = buildExplain(p, v, a);
    expect(ex.gaps).toEqual(expect.arrayContaining(["spark", "kafka"]));
    expect(ex.suggestions.join(" ")).toMatch(/Add <b>Spark<\/b>/i);
    expect(ex.suggestions.length).toBeLessThanOrEqual(3);
  });
});
