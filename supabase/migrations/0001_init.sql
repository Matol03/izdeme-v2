-- IzdeMe v2 — initial schema (spec §3). Postgres + pgvector on Supabase.
-- Embeddings: profiles.embedding and vacancies.embedding MUST come from the SAME
-- model at the SAME dimension (gemini-embedding-001 truncated to 1536 via Matryoshka)
-- or cosine similarity is meaningless.

create extension if not exists vector;

-- users handled by Supabase Auth (auth.users)

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text, title text, seniority text,
  years numeric,
  skills jsonb default '[]',        -- hard skills [{name, confidence}] or ["python", ...]
  soft_skills jsonb default '[]',
  domains jsonb default '[]',
  projects jsonb default '[]',
  education text,
  languages jsonb default '[]',
  raw_resume_text text,             -- extracted, pre-parse
  embedding vector(1536),
  retrieval_query text,             -- LLM-written "ideal job description" used for retrieval
  updated_at timestamptz default now()
);

create table if not exists vacancies (
  id text primary key,              -- hh.ru vacancy id
  source text default 'hh.kz',
  raw jsonb not null,                -- full normalized vacancy payload
  title text, company text, area text,
  salary_min int, salary_max int,
  schedule text, experience_required text,
  embedding vector(1536),
  fetched_at timestamptz default now()
);
create index if not exists vacancies_embedding_idx on vacancies using hnsw (embedding vector_cosine_ops);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles,
  vacancy_id text references vacancies,
  fit_score int,                     -- deterministic 35–99, same formula as v1
  hard_score numeric, exp_score numeric, soft_score numeric,
  matches jsonb, gaps jsonb, suggestions jsonb,
  llm_reason text,                   -- Ranker Agent's one-line reason
  created_at timestamptz default now(),
  unique(profile_id, vacancy_id)
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles,
  vacancy_id text references vacancies,
  status text default 'saved',       -- saved | tailored | applied | interview | rejected | offer
  tailored_summary text,
  updated_at timestamptz default now()
);

create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles,
  prompt text, filters jsonb,
  cron_enabled boolean default false,
  last_run_at timestamptz
);

create table if not exists llm_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,  -- for RLS + secure Realtime subscription
  type text not null,                 -- parse_resume | match_and_rank | tailor_resume
  status text default 'queued',       -- queued | running | done | error
  input jsonb, output jsonb, error text,
  created_at timestamptz default now()
);

-- ── Row-Level Security ──────────────────────────────────────────────────────
alter table profiles       enable row level security;
alter table vacancies      enable row level security;
alter table matches        enable row level security;
alter table applications   enable row level security;
alter table saved_searches enable row level security;
alter table llm_jobs       enable row level security;

-- User-owned by direct user_id column
create policy "own profiles"  on profiles  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own llm_jobs"  on llm_jobs  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- User-owned via profile_id → profiles.user_id join
create policy "own matches" on matches for all
  using (exists (select 1 from profiles p where p.id = matches.profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from profiles p where p.id = matches.profile_id and p.user_id = auth.uid()));
create policy "own applications" on applications for all
  using (exists (select 1 from profiles p where p.id = applications.profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from profiles p where p.id = applications.profile_id and p.user_id = auth.uid()));
create policy "own saved_searches" on saved_searches for all
  using (exists (select 1 from profiles p where p.id = saved_searches.profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from profiles p where p.id = saved_searches.profile_id and p.user_id = auth.uid()));

-- Shared/global table: vacancies has NO owner. Authenticated users may read;
-- only the service role writes (via the Job Ingestion Service). Do NOT add a
-- user_id policy here — there is no such column (spec §3 footgun note).
create policy "vacancies readable" on vacancies for select using (auth.role() = 'authenticated');
create policy "vacancies writable by service" on vacancies for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
