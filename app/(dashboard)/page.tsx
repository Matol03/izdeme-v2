"use client";
import { useRef } from "react";

/** Recommendation chips (icons as raw SVG path data), ported from v1. */
const RECS: { q: string; label: string; icon: string }[] = [
  { q: "Remote job", label: "Remote job", icon: "M3 5h18v12H3zM2 20h20" },
  { q: "Offline job", label: "Offline job", icon: "M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17M15 9h4a1 1 0 0 1 1 1v11 M8 7h2M8 11h2M8 15h2" },
  { q: "Data-driven management", label: "Data-driven management", icon: "M4 20h16 M7 20v-6M12 20V8M17 20v-9" },
  { q: "Python", label: "Python", icon: "M8 9l-3 3 3 3M16 9l3 3-3 3M13 6l-2 12" },
  { q: "Machine learning", label: "Machine learning", icon: "M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z" },
  { q: "Frontend developer", label: "Frontend", icon: "M3 4h18v16H3zM3 9h18M8 9v11" },
  { q: "Product manager", label: "Product manager", icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15 9l-4.5 1.5L9 15l4.5-1.5z" },
  { q: "UX / UI design", label: "Design", icon: "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" },
];

export default function DashboardPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const useChip = (q: string) => { if (inputRef.current) inputRef.current.value = q; inputRef.current?.focus(); };

  return (
    <>
      <div className="bg-grid" />
      <div className="bg-glow" />

      <header>
        <div className="wrap nav">
          <div className="brand">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5Z" fill="url(#g1)" />
              <path d="M2 12l10 5 10-5" stroke="url(#g1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
              <path d="M2 17l10 5 10-5" stroke="url(#g1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".4" />
              <defs><linearGradient id="g1" x1="2" y1="2" x2="22" y2="22"><stop stopColor="#7c5cff" /><stop offset="1" stopColor="#4d8dff" /></linearGradient></defs>
            </svg>
            <div className="brand-name">Izde<b>Me</b></div>
          </div>
        </div>
      </header>

      <main className="wrap">
        <section className="hero">
          <div className="badge"><span className="dot" /> Semantic search · HeadHunter · Groq LLM</div>
          <h1>Describe your dream <span className="grad">job.</span></h1>

          <div className="steps">
            <div className="step"><span className="n">1</span> <b>Upload</b> resume</div>
            <div className="step"><span className="n">2</span> <b>Describe</b> the role</div>
            <div className="step"><span className="n">3</span> <b>Match</b> &amp; tailor</div>
          </div>

          <div className="search-shell">
            <div className="search-box">
              <svg className="lead" width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <input id="prompt" ref={inputRef} placeholder="Describe your dream job…" autoComplete="off" />
              <button className="btn-run" type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Run Match
              </button>
            </div>
            <div className="chips">
              {RECS.map(r => (
                <button key={r.q} className="chip" type="button" onClick={() => useChip(r.q)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d={r.icon} /></svg>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="resume-shell">
            <div className="dropzone" onClick={() => fileRef.current?.click()}>
              <div className="dz-ico">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L8 8m4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <div className="dz-txt"><b>Drop your resume here, or click to upload</b></div>
              <input type="file" ref={fileRef} accept="application/pdf,.pdf" hidden />
            </div>
          </div>

          <p className="phase-note">
            v2 foundation (Phase 0/3): UI parity + deterministic Fit Score &amp; parser ported and unit-tested.
            Persistence, embeddings, background jobs and LLM agents land in Phases 1–7.
          </p>
        </section>
      </main>
    </>
  );
}
