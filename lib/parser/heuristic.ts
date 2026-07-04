/**
 * Heuristic résumé parser — the deterministic, no-LLM instant fallback.
 * Ported VERBATIM from IzdeMe v1 (index.html): expandAliases, computeYears,
 * extractIdentity, parseResume. Logic byte-for-byte; only TS types added.
 */
import { HARD_SKILLS, SOFT_SKILLS, DOMAINS, EDU_KEYS, LANGUAGES, SKILL_ALIASES, cap, matchLexicon } from "../scoring/lexicons";
import type { Profile } from "../schemas";

/** Normalize skill aliases in raw text before lexicon matching (js→javascript, k8s→kubernetes…). */
export function expandAliases(text: string): string {
  let t = " " + String(text).toLowerCase() + " ";
  for (const a in SKILL_ALIASES) {
    const re = new RegExp("(^|[^a-z0-9])" + a.replace(/[.+*]/g, "\\$&") + "([^a-z0-9]|$)", "g");
    t = t.replace(re, "$1" + SKILL_ALIASES[a] + "$2");
  }
  return t;
}

/**
 * Years of experience: sum MERGED work-date ranges, EXCLUDING education lines,
 * and honour an explicit "N years" statement — take whichever is larger.
 */
export function computeYears(text: string): number {
  const now = new Date().getFullYear();
  const isEdu = (l: string) => /\b(university|institute|college|bachelor|master|bsc|msc|ph\.?d|diploma|degree|faculty|gpa|школа|gymnasium|lyceum)\b/i.test(l);
  let explicit = 0;
  const intervals: [number, number][] = [];
  for (const line of text.split(/\n/)) {
    if (isEdu(line)) continue; // a degree's dates are not work experience
    const e = line.match(/(\d{1,2})\s*\+?\s*(?:years|yrs|year|год|года|лет)\b/i);
    if (e) explicit = Math.max(explicit, parseInt(e[1]));
    const re = /((?:19|20)\d{2})\s*(?:[-–—]|to)\s*(?:[a-zа-яё.]+\s+)?(present|current|now|настоящее|(?:19|20)\d{2})/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const s = parseInt(m[1]);
      const end = /present|current|now|настоящее/i.test(m[2]) ? now : parseInt(m[2]);
      if (end >= s && end - s <= 45) intervals.push([s, end]);
    }
  }
  intervals.sort((a, b) => a[0] - b[0]);
  let span = 0, cs: number | null = null, ce: number | null = null;
  for (const [s, e] of intervals) {
    if (cs === null) { cs = s; ce = e; continue; }
    if (s <= (ce as number)) ce = Math.max(ce as number, e); // overlap → merge
    else { span += (ce as number) - cs; cs = s; ce = e; }
  }
  if (cs !== null) span += (ce as number) - cs;
  return Math.max(explicit, span);
}

/** Name + current title from the résumé header (first few lines). */
export function extractIdentity(lines: string[]): { name: string; title: string } {
  let name = "", title = "";
  for (let i = 0; i < Math.min(lines.length, 7); i++) {
    const l = (lines[i] || "").trim();
    if (!l) continue;
    if (!name && l.length <= 42 && !/[@\d]/.test(l) &&
      /^[A-ZА-ЯЁ][\p{L}.'-]+(?:\s+[A-ZА-ЯЁ][\p{L}.'-]+){1,3}$/u.test(l)) { name = l; continue; }
    if (!title && l.length <= 70 &&
      /(developer|engineer|analyst|manager|designer|scientist|intern|specialist|consultant|lead|architect|student|administrator|marketer|researcher|recruiter|accountant|teacher|qa|devops)/i.test(l)) {
      title = l.split(/\s*[|•·–—]\s*/)[0].trim();
      if (name) break;
    }
  }
  return { name, title };
}

/** Full heuristic parse: résumé text → structured Profile. */
export function parseResume(text: string): Profile {
  const lines = text.split(/\n/).map(l => l.replace(/\s+/g, " ").trim());
  const skills = matchLexicon(expandAliases(text), HARD_SKILLS);
  const soft = matchLexicon(text, SOFT_SKILLS);
  const domains = matchLexicon(text, DOMAINS);
  const languages = matchLexicon(text, LANGUAGES).map(cap);
  const years = computeYears(text);
  const { name, title } = extractIdentity(lines);

  // education — collect institution/degree lines, prefer the most specific
  const educationList: string[] = [];
  for (const l of lines) {
    if (l && l.length <= 140 && EDU_KEYS.some(k => l.toLowerCase().includes(k)) && !educationList.includes(l)) educationList.push(l);
    if (educationList.length >= 3) break;
  }
  const education = (educationList.find(l => /university|institute|college|nazarbayev|kbtu|sdu|aitu/i.test(l)) || educationList[0] || "Not detected").slice(0, 120);

  // certifications
  const certifications: string[] = [];
  for (const l of lines) {
    if (/\b(certified|certificate|certification|nanodegree|coursera|udacity)\b/i.test(l) && l.length < 100) {
      const c = l.replace(/^[•\-*•\s]+/, "").trim();
      if (c && !certifications.includes(c)) certifications.push(c);
    }
    if (certifications.length >= 3) break;
  }

  // projects / experience — section-aware, action-verb or bulleted lines
  const verbs = /\b(built|build|developed|develop|created|create|designed|design|implemented|implement|led|deployed|deploy|analyzed|analyze|automated|automate|trained|train|engineered|optimized|optimize|launched|launch|managed|manage|architected|improved|improve|delivered|deliver|integrated|integrate)\b/i;
  const HEAD = /^(projects?|experience|work experience|professional experience|employment|selected projects|key projects)\b/i;
  const OTHER = /^(education|skills|technical skills|summary|objective|contact|certifications?|languages?|awards?|interests?|references?|profile)\b/i;
  const bulletRe = /^[•\-*•▪●–—]/;
  const tidy = (l: string) => l.replace(/^[•\-*•▪●–—\s]+/, "").replace(/\s+/g, " ").trim();
  const projects: string[] = [];
  const seen = new Set<string>();
  const add = (l: string) => {
    l = tidy(l);
    if (l.length < 15 || l.length > 160) return;
    const k = l.toLowerCase().slice(0, 45);
    if (seen.has(k)) return;
    seen.add(k);
    projects.push(l.length > 140 ? l.slice(0, 137).replace(/\s+\S*$/, "") + "…" : l);
  };
  let inSec = false;
  for (const l of lines) {
    if (HEAD.test(l)) { inSec = true; continue; }
    if (OTHER.test(l)) { inSec = false; continue; }
    if (verbs.test(l) || (inSec && bulletRe.test(l))) add(l);
    if (projects.length >= 4) break;
  }
  if (!projects.length) {
    if (domains[0] && skills[0]) projects.push(`${cap(skills[0])} project in ${cap(domains[0])}`);
    if (skills[1]) projects.push(`${cap(skills[1])} / ${cap(skills[2] || "data")} work`);
  }

  const ttl = (title || "").toLowerCase();
  const seniority = /senior|lead|principal|head/.test(ttl) ? "senior"
    : /junior|intern|trainee|student/.test(ttl) ? "junior"
    : years >= 6 ? "senior" : years >= 3 ? "middle" : years >= 1 ? "junior" : "";

  return { name, title, skills, soft, domains, projects, experience: [], education, educationList, languages, certifications, seniority, years };
}
