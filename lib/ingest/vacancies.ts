/**
 * Job ingestion + semantic retrieval orchestrator.
 * - FALLBACK_POOL: v1's curated KZ roles (spec §7 — keep the 3-tier fallback). This is
 *   the account-free corpus; the live hh.ru OAuth client + Supabase upsert land in Phase 2.
 * - retrieveCandidates(): the "embeddings for recall" step — embed the profile's
 *   retrieval_query (RETRIEVAL_QUERY) and each vacancy (RETRIEVAL_DOCUMENT), then top-K.
 */
import type { Profile, Vacancy } from "../schemas";
import { embed } from "../embeddings";
import { retrieveTopK, type Embedded, type Retrieved } from "../retrieval";
import { buildRetrievalQuery } from "../profile/retrievalQuery";

/** Text used to embed a vacancy (title + requirements + responsibilities). */
export function vacancyText(v: Vacancy): string {
  return `${v.name}. ${v.requirements || ""} ${v.responsibilities || ""}`.trim();
}

/** Embed a corpus of vacancies as RETRIEVAL_DOCUMENT. */
export async function embedVacancies(vacancies: Vacancy[]): Promise<Embedded<Vacancy>[]> {
  return Promise.all(vacancies.map(async v => ({ item: v, embedding: await embed(vacancyText(v), "RETRIEVAL_DOCUMENT") })));
}

/**
 * Semantic retrieval: profile → retrieval_query → embed(RETRIEVAL_QUERY) → top-K by
 * cosine over the (pre-embedded) vacancy corpus.
 */
export async function retrieveCandidates(profile: Profile, corpus: Embedded<Vacancy>[], k = 40): Promise<Retrieved<Vacancy>[]> {
  const q = buildRetrievalQuery(profile);
  const qv = await embed(q, "RETRIEVAL_QUERY");
  return retrieveTopK(qv, corpus, k);
}

/** v1 curated fallback pool (Kazakhstan roles). */
export const FALLBACK_POOL: Vacancy[] = [
  { name: "Data Analyst", company: "GreenTech Solutions", area: "Almaty", salary: [450000, 650000, "KZT"], experience: "1–3 years", schedule: "Full day",
    requirements: "Python, SQL, statistics. Build dashboards, run climate impact analysis on energy data.", responsibilities: "Cross-functional analytics with sustainability teams; communication and stakeholder reporting.", description: "" },
  { name: "Backend Developer (Python)", company: "FinFlow", area: "Astana", salary: [700000, 1100000, "KZT"], experience: "3–6 years", schedule: "Full day",
    requirements: "Python, Django, PostgreSQL, Docker, REST, microservices on AWS, CI/CD.", responsibilities: "Design fintech services; agile delivery, ownership, code review and teamwork.", description: "" },
  { name: "Machine Learning Engineer", company: "Visionary AI", area: "Remote", salary: [900000, 1500000, "KZT"], experience: "3–6 years", schedule: "Remote",
    requirements: "Python, PyTorch, deep learning, computer vision, Docker, NumPy.", responsibilities: "Train & deploy vision models; research, analytical thinking, cross-functional collaboration.", description: "" },
  { name: "Frontend Engineer (React)", company: "Pixel Forge", area: "Almaty", salary: [600000, 950000, "KZT"], experience: "1–3 years", schedule: "Full day",
    requirements: "JavaScript, TypeScript, React, GraphQL, Git, design systems.", responsibilities: "Build SaaS UI; collaboration with design, communication, ownership.", description: "" },
  { name: "Data Scientist", company: "Kasaba Analytics", area: "Astana", salary: [800000, 1300000, "KZT"], experience: "3–6 years", schedule: "Full day",
    requirements: "Python, machine learning, SQL, statistics, Spark, scikit-learn.", responsibilities: "End-to-end ML, A/B testing, analytical rigor, stakeholder communication.", description: "" },
  { name: "Product Manager", company: "Bereke Digital", area: "Almaty", salary: [850000, 1400000, "KZT"], experience: "3–6 years", schedule: "Full day",
    requirements: "Product, roadmap, agile, analytics, Jira. Fintech / banking domain.", responsibilities: "Drive roadmap; stakeholder alignment, leadership, cross-functional communication.", description: "" },
  { name: "DevOps Engineer", company: "CloudPeak", area: "Remote", salary: [900000, 1400000, "KZT"], experience: "3–6 years", schedule: "Remote",
    requirements: "Docker, Kubernetes, AWS, CI/CD, Linux, infrastructure as code.", responsibilities: "Run clusters, reliability engineering, ownership, teamwork.", description: "" },
  { name: "Marketing Analyst", company: "BrightReach", area: "Almaty", salary: [400000, 600000, "KZT"], experience: "1–3 years", schedule: "Full day",
    requirements: "SEO, Google Analytics, Excel, CRM, B2B SaaS marketing.", responsibilities: "Campaign analytics, content, cross-functional communication, presentation.", description: "" },
  { name: "Mobile Developer (Flutter)", company: "Tap Labs", area: "Astana", salary: [650000, 1000000, "KZT"], experience: "1–3 years", schedule: "Full day",
    requirements: "Flutter, Dart, REST, Git, mobile architecture.", responsibilities: "Ship cross-platform app; ownership, teamwork, problem-solving.", description: "" },
  { name: "QA Automation Engineer", company: "TestForge", area: "Remote", salary: [550000, 850000, "KZT"], experience: "1–3 years", schedule: "Remote",
    requirements: "Selenium, Cypress, Python, automation, API testing.", responsibilities: "Build test suites, CI integration, analytical, attention to detail.", description: "" },
  { name: "Full-Stack Engineer (Node + React)", company: "Stacklore", area: "Almaty", salary: [750000, 1200000, "KZT"], experience: "3–6 years", schedule: "Full day",
    requirements: "Node.js, React, TypeScript, PostgreSQL, REST, Docker.", responsibilities: "Own features end-to-end; collaboration, communication, agile.", description: "" },
  { name: "Business / Data Analyst", company: "NurMetrics", area: "Astana", salary: [500000, 750000, "KZT"], experience: "1–3 years", schedule: "Full day",
    requirements: "SQL, Excel, Power BI, statistics, data analysis.", responsibilities: "Translate questions into queries; stakeholder reporting, communication.", description: "" },
  { name: "NLP Engineer", company: "LinguaCore", area: "Remote", salary: [950000, 1600000, "KZT"], experience: "3–6 years", schedule: "Remote",
    requirements: "Python, NLP, PyTorch, machine learning, API deployment.", responsibilities: "Build NLP/LLM pipelines; research, analytical, cross-functional.", description: "" },
  { name: "UX/UI Designer", company: "Form & Function", area: "Almaty", salary: [500000, 800000, "KZT"], experience: "1–3 years", schedule: "Full day",
    requirements: "Figma, UI, UX, prototyping, user research.", responsibilities: "Design product flows; collaboration with product, communication, creativity.", description: "" },
];
