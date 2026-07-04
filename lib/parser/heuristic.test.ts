import { describe, it, expect } from "vitest";
import { computeYears, parseResume } from "./heuristic";

describe("computeYears", () => {
  it("sums merged work ranges and excludes education dates", () => {
    const txt = "Software Engineer 2019 - 2022\nData Intern 2018-2019\nBSc Computer Science, University 2014-2018";
    expect(computeYears(txt)).toBe(4); // 2018–2022 merged; degree 2014–2018 excluded
  });
  it("honours an explicit 'N years' statement", () => {
    expect(computeYears("5+ years of experience in backend")).toBe(5);
  });
  it("returns 0 when only education dates are present", () => {
    expect(computeYears("BSc, Nazarbayev University, 2016-2020")).toBe(0);
  });
  it("handles month-prefixed end years", () => {
    expect(computeYears("Analyst 2020 - Jun 2023")).toBe(3);
  });
});

describe("parseResume", () => {
  const sample = [
    "Aigerim Nurlanovna",
    "Data Analyst | Almaty",
    "SKILLS",
    "Python, JS, SQL, Postgres, k8s, scikit-learn, ML",
    "Soft: communication, teamwork, attention to detail",
    "EXPERIENCE",
    "Data Analyst, GreenTech — 2021 - Present",
    "- Built a climate data pipeline in Python",
    "EDUCATION",
    "BSc Computer Science, Nazarbayev University, 2017 - 2021",
  ].join("\n");

  const p = parseResume(sample);

  it("extracts name and title", () => {
    expect(p.name).toBe("Aigerim Nurlanovna");
    expect(p.title).toBe("Data Analyst");
  });
  it("resolves skill aliases (JS→javascript, Postgres→postgresql, k8s→kubernetes, ML→machine learning)", () => {
    expect(p.skills).toEqual(expect.arrayContaining(["python", "javascript", "sql", "postgresql", "kubernetes", "scikit-learn", "machine learning"]));
  });
  it("captures soft skills incl. multi-word", () => {
    expect(p.soft).toEqual(expect.arrayContaining(["communication", "teamwork", "attention to detail"]));
  });
  it("excludes the degree range from years", () => {
    expect(p.years).toBeGreaterThanOrEqual(1); // 2021→now, NOT +4 from the 2017–2021 degree
    expect(p.years).toBeLessThan(9);
  });
  it("detects education and a project", () => {
    expect(p.education.toLowerCase()).toContain("nazarbayev university");
    expect(p.projects.join(" ").toLowerCase()).toContain("climate data pipeline");
  });
});
