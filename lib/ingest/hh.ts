/**
 * HeadHunter (hh.kz) ingestion — ported from v1 (_lib.js). OAuth client_credentials
 * app token (authenticated requests bypass DDoS-Guard), area/schedule/experience/salary
 * filters, normalization to the Vacancy shape. Returns [] when unconfigured/unreachable
 * so the caller falls back to the curated corpus (spec §7 — keep the 3-tier fallback).
 */
import type { Vacancy } from "../schemas";
import type { SearchPlan } from "../schemas";

const HH_USER_AGENT = process.env.HH_USER_AGENT || "IzdeMe-JobAgent/2.0 (murat.askarov@nu.edu.kz)";
const HH_AREA = process.env.HH_AREA || "40";
const HH_HOST = process.env.HH_HOST || "hh.kz";
const HH_CLIENT_ID = process.env.HH_CLIENT_ID || "";
const HH_CLIENT_SECRET = process.env.HH_CLIENT_SECRET || "";

// city → area id (verified from api.hh.ru/areas/40)
const KZ_AREAS: Record<string, number> = {
  kazakhstan: 40, almaty: 160, "alma-ata": 160, astana: 159, "nur-sultan": 159, nursultan: 159,
  shymkent: 205, chimkent: 205, karaganda: 177, karagandy: 177, aktobe: 154, atyrau: 153,
  pavlodar: 181, kostanay: 172, kostanai: 172, kyzylorda: 174, taraz: 187, semey: 185, semipalatinsk: 185,
  aktau: 152, kokshetau: 176, taldykorgan: 188, temirtau: 190, "ust-kamenogorsk": 194, oskemen: 194, petropavlovsk: 180,
};
export const cityToArea = (c?: string): string => String(KZ_AREAS[String(c || "").toLowerCase().trim()] ?? HH_AREA);

const clean = (s?: string) => (s || "").replace(/<\/?highlighttext>/g, "");

let _hhTok = process.env.HH_ACCESS_TOKEN || "";
let _hhTokExp = _hhTok ? Infinity : 0;
async function hhToken(force = false): Promise<string> {
  const now = Date.now();
  if (!force && _hhTok && now < _hhTokExp) return _hhTok;
  if (!HH_CLIENT_ID || !HH_CLIENT_SECRET) return _hhTok;
  try {
    const r = await fetch("https://api.hh.ru/token", {
      method: "POST",
      headers: { "User-Agent": HH_USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${encodeURIComponent(HH_CLIENT_ID)}&client_secret=${encodeURIComponent(HH_CLIENT_SECRET)}`,
    });
    if (!r.ok) return _hhTok;
    const j = await r.json();
    if (j.access_token) { _hhTok = j.access_token; _hhTokExp = now + ((j.expires_in || 1209600) * 1000) - 60000; }
    return _hhTok;
  } catch { return _hhTok; }
}

export function hhConfigured(): boolean { return !!(process.env.HH_ACCESS_TOKEN || (HH_CLIENT_ID && HH_CLIENT_SECRET)); }

/** Map a SearchPlan to hh query params. */
export function planToHhOpts(plan: SearchPlan) {
  return {
    area: cityToArea(plan.city),
    schedule: plan.remote ? "remote" : undefined,
    experience: plan.experience || undefined,
    employment: plan.employment || undefined,
    salary: plan.salary || undefined,
  };
}

interface FetchOpts { area?: string; schedule?: string; experience?: string; employment?: string; salary?: number | null; perPage?: number }

/** Fetch + normalize hh.kz vacancies. Returns [] on failure so callers fall back. */
export async function fetchHhVacancies(query: string, opts: FetchOpts = {}): Promise<Vacancy[]> {
  if (!hhConfigured()) return []; // no creds → skip network, use curated corpus
  const url = new URL("https://api.hh.ru/vacancies");
  url.searchParams.set("text", query);
  url.searchParams.set("area", opts.area || HH_AREA);
  url.searchParams.set("host", HH_HOST);
  url.searchParams.set("order_by", "relevance");
  url.searchParams.set("per_page", String(opts.perPage || 40));
  if (opts.schedule) url.searchParams.set("schedule", opts.schedule);
  if (opts.experience) url.searchParams.set("experience", opts.experience);
  if (opts.employment) url.searchParams.set("employment", opts.employment);
  if (opts.salary) { url.searchParams.set("salary", String(opts.salary)); url.searchParams.set("only_with_salary", "true"); }

  const doFetch = async (tok: string) => {
    const headers: Record<string, string> = { "User-Agent": HH_USER_AGENT, Accept: "application/json" };
    if (tok) headers.Authorization = "Bearer " + tok;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try { return await fetch(url, { headers, signal: ctrl.signal }); } finally { clearTimeout(t); }
  };

  try {
    let tok = await hhToken();
    let r = await doFetch(tok);
    if ((r.status === 401 || r.status === 403) && HH_CLIENT_ID && HH_CLIENT_SECRET) {
      tok = await hhToken(true);
      if (tok) r = await doFetch(tok);
    }
    if (!r.ok) return [];
    const data = await r.json();
    return (data.items || []).map((v: any): Vacancy => ({
      id: v.id,
      name: v.name,
      company: v.employer?.name || "Company",
      area: v.area?.name || "—",
      salary: v.salary ? [v.salary.from, v.salary.to, v.salary.currency] : null,
      requirements: clean(v.snippet?.requirement),
      responsibilities: clean(v.snippet?.responsibility),
      description: clean(`${v.snippet?.requirement || ""} ${v.snippet?.responsibility || ""}`).trim(),
      url: v.alternate_url,
      schedule: v.schedule?.name || null,
      experience: v.experience?.name || null,
    }));
  } catch { return []; }
}
