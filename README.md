# IzdeMe v2

Production rebuild of [IzdeMe](https://github.com/Matol03/izdeme) per
`IzdeMe_v2_Architecture.md`: **Next.js 15 + TypeScript + Supabase (Postgres/pgvector/
Auth/Realtime) + Inngest background jobs + Vercel AI SDK + embeddings**, keeping v1's
deterministic, explainable **Fit Score (Hard 40 / Experience 30 / Soft 30)** as the core.

> v1 stays live at https://izdeme.vercel.app — this is a separate repo, built phase by phase.

## Status

| Phase | Scope | State |
|---|---|---|
| **0 Scaffolding** | Next.js/TS app, Zod schemas, Supabase migrations | ✅ done (account-free parts) |
| **3 Deterministic core** | Verbatim TS port of Fit Score + heuristic parser + **unit tests** | ✅ done |
| 1 Persistence + Auth | Supabase Auth, persist profiles | ⏳ needs Supabase project |
| 2 Embeddings + retrieval | `gemini-embedding-001` (1536d), pgvector HNSW, asymmetric task types | ⏳ needs Gemini key |
| 4 LLM orchestration | Vercel AI SDK agents (parser/planner/ranker/tailor), `generateObject` | ⏳ needs LLM key |
| 5 Background jobs | Inngest functions + Supabase Realtime status | ⏳ needs Inngest |
| 6 Product surface | saved searches, application tracker, résumé versioning | ⏳ |
| 7 Observability | Sentry + PostHog + Langfuse + Upstash rate limit | ⏳ |

## What's here now (no external accounts required)

```
lib/
  schemas.ts              # Zod: Profile, Vacancy, Match, SearchPlan — single source of truth
  scoring/
    lexicons.ts           # HARD/SOFT/DOMAIN lexicons, aliases, matchLexicon, cap  (ported verbatim)
    fitScore.ts           # scoreVacancy (40/30/30) + buildExplain  (ported verbatim)
    fitScore.test.ts      # pins the exact formula + documented edge cases
  parser/
    heuristic.ts          # parseResume, computeYears, extractIdentity  (ported verbatim)
    heuristic.test.ts     # alias resolution, year merging/exclusion, name/title
supabase/migrations/
  0001_init.sql           # full schema + RLS (incl. the vacancies "no owner" policy)
app/
  layout.tsx, globals.css, (dashboard)/page.tsx   # UI parity: liquid-glass landing
```

## Run

```bash
npm install
npm test          # ✅ deterministic core — vitest, no keys needed
npm run dev       # → http://localhost:3000  (landing UI parity)
```

## Design principles kept from v1 (spec §7 — do NOT change)

- Exact **Fit Score** formula (clamp 35–99) — ported byte-for-byte, unit-tested.
- **3-tier hh.kz fallback** (proxy → direct client → curated) — moves into the Job Ingestion Service.
- **Client-side PDF parsing** (pdf.js) — privacy; stays client-side.
- **Provider-agnostic LLM** via env vars.

## To continue (what you must provision)

1. **Supabase** project → put URL + anon + service-role keys in `.env.local`; run
   `supabase db push` (or paste `0001_init.sql` in the SQL editor). Enables Phase 1.
2. **Gemini API key** (embeddings) → Phase 2 retrieval.
3. **Groq/Gemini LLM key** → Phase 4 agents. ⚠️ Groq deprecated `llama-3.3-70b-versatile`
   (17 Jun 2026); default is now `openai/gpt-oss-120b` — verify on console.groq.com/docs/models.
4. **Inngest**, **Upstash**, **Sentry/PostHog/Langfuse** → Phases 5, 7.

See `.env.example` for every variable (all optional for the current foundation).
