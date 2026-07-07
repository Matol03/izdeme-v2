"use client";
import { useEffect, useRef, useState } from "react";
import { cap } from "@/lib/scoring/lexicons";

declare global { interface Window { pdfjsLib?: any } }

const RECS = [
  { q: "Remote job", label: "Remote job", icon: "M3 5h18v12H3zM2 20h20" },
  { q: "Data-driven management", label: "Data-driven management", icon: "M4 20h16 M7 20v-6M12 20V8M17 20v-9" },
  { q: "Python", label: "Python", icon: "M8 9l-3 3 3 3M16 9l3 3-3 3M13 6l-2 12" },
  { q: "Machine learning", label: "Machine learning", icon: "M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z" },
  { q: "Frontend developer", label: "Frontend", icon: "M3 4h18v16H3zM3 9h18M8 9v11" },
  { q: "Product manager", label: "Product manager", icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15 9l-4.5 1.5L9 15l4.5-1.5z" },
];

interface Fit { score: number; breakdown: { hard: number; exp: number; soft: number } }
interface Result {
  vacancy: { name: string; company: string; area: string; salary?: any; url?: string; schedule?: string | null; experience?: string | null };
  fit: Fit; explain: { matches: string[]; gaps: string[]; suggestions: string[] };
  recall: number; match?: number; reason?: string;
}

function fmtSalary(s: any) {
  if (!s) return <span>Salary undisclosed</span>;
  const [from, to, cur] = s;
  const c = (cur || "KZT").replace("KZT", "₸").replace("RUR", "₽").replace("USD", "$").replace("EUR", "€");
  const f = (n: any) => (n ? Number(n).toLocaleString("en-US") : null);
  if (from && to) return <>{f(from)}–{f(to)} <span>{c}/mo</span></>;
  if (from) return <>from {f(from)} <span>{c}/mo</span></>;
  if (to) return <>up to {f(to)} <span>{c}/mo</span></>;
  return <span>Salary undisclosed</span>;
}
const ringHex = (p: number) => (p >= 85 ? "#27d39a" : p >= 68 ? "#ffb44d" : "#ff6b6b");

export default function DashboardPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resumeTextRef = useRef<string>("");
  const [status, setStatus] = useState<any>(null);
  const [resumeName, setResumeName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ results: Result[]; source: string; rankedBy: string; profile: any } | null>(null);

  useEffect(() => {
    fetch("/api/status").then(r => r.json()).then(setStatus).catch(() => {});
    if (!window.pdfjsLib) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = () => { if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; };
      document.body.appendChild(s);
    }
  }, []);

  async function extractPdf(file: File): Promise<string> {
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const lines: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const c = await (await pdf.getPage(i)).getTextContent();
      const rows: { y: number; items: { x: number; str: string }[] }[] = [];
      for (const it of c.items) {
        if (!it.str || !it.str.trim()) continue;
        const y = Math.round(it.transform[5]), x = it.transform[4];
        let row = rows.find(r => Math.abs(r.y - y) <= 3.5);
        if (!row) { row = { y, items: [] }; rows.push(row); }
        row.items.push({ x, str: it.str });
      }
      rows.sort((a, b) => b.y - a.y);
      for (const r of rows) { r.items.sort((a, b) => a.x - b.x); const l = r.items.map(o => o.str).join(" ").replace(/\s+/g, " ").trim(); if (l) lines.push(l); }
      lines.push("");
    }
    return lines.join("\n");
  }

  async function onFile(file?: File) {
    if (!file) return;
    if (!window.pdfjsLib) { setError("PDF engine still loading — try again in a moment."); return; }
    try { resumeTextRef.current = await extractPdf(file); setResumeName(file.name); setError(""); }
    catch { setError("Couldn't read that PDF — try another file."); }
  }

  async function run() {
    const prompt = inputRef.current?.value.trim() || "";
    if (!prompt && !resumeTextRef.current) { inputRef.current?.focus(); return; }
    setLoading(true); setError(""); setData(null);
    try {
      const r = await fetch("/api/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, resumeText: resumeTextRef.current }) });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setData(j);
    } catch (e: any) { setError(e?.message || "Search failed"); }
    finally { setLoading(false); }
  }

  const useChip = (q: string) => { if (inputRef.current) inputRef.current.value = q; run(); };
  const bar = (lbl: string, w: string, pc: number, col: string) => (
    <div className="bd-row" key={lbl}><span className="bk">{lbl} <small style={{ color: "var(--muted-2)" }}>{w}</small></span><div className="bar"><i style={{ width: pc + "%", background: col }} /></div><span className="pc">{pc}</span></div>
  );

  return (
    <>
      <div className="bg-grid" /><div className="bg-glow" />
      <header><div className="wrap nav"><div className="brand">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5Z" fill="url(#g1)" /><path d="M2 12l10 5 10-5" stroke="url(#g1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".7" /><path d="M2 17l10 5 10-5" stroke="url(#g1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".4" /><defs><linearGradient id="g1" x1="2" y1="2" x2="22" y2="22"><stop stopColor="#7c5cff" /><stop offset="1" stopColor="#4d8dff" /></linearGradient></defs></svg>
        <div className="brand-name">Izde<b>Me</b></div>
      </div></div></header>

      <main className="wrap">
        <section className="hero">
          <div className="badge"><span className="dot" /> Semantic search{status?.embeddings ? " · Gemini embeddings" : ""}{status?.enabled ? ` · ${status.providers?.find((p: any) => p.id === status.default)?.label || "LLM"}` : ""}</div>
          <h1>Describe your dream <span className="grad">job.</span></h1>

          <div className="search-shell">
            <div className="search-box">
              <svg className="lead" width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <input id="prompt" ref={inputRef} placeholder="Describe your dream job…" autoComplete="off" onKeyDown={e => { if (e.key === "Enter") run(); }} />
              <button className="btn-run" type="button" onClick={run} disabled={loading}>
                {loading ? <span className="spinner" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                {loading ? "Matching…" : "Run Match"}
              </button>
            </div>
            <div className="chips">
              {RECS.map(r => (
                <button key={r.q} className="chip" type="button" onClick={() => useChip(r.q)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d={r.icon} /></svg>{r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="resume-shell">
            <div className="dropzone" onClick={() => fileRef.current?.click()}>
              <div className="dz-ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L8 8m4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></div>
              <div className="dz-txt"><b>{resumeName ? `✓ ${resumeName}` : "Drop your resume here, or click to upload"}</b></div>
              <input type="file" ref={fileRef} accept="application/pdf,.pdf" hidden onChange={e => onFile(e.target.files?.[0])} />
            </div>
          </div>

          {error && <p className="err">{error}</p>}
        </section>

        {data && (
          <section id="results">
            <div className="res-head">
              <h2>Top {data.results.length} matches</h2>
              <div className="res-meta">
                <div className={"meta-pill" + (data.source === "hh.kz" ? " on" : "")}>Source: <b>{data.source === "hh.kz" ? "● hh.kz live" : "● curated"}</b></div>
                <div className={"meta-pill" + (data.rankedBy === "llm" ? " on" : "")}>Ranking: <b>{data.rankedBy === "llm" ? "LLM" : "Fit Score"}</b></div>
                <div className={"meta-pill" + (status?.embeddings ? " on" : "")}>Retrieval: <b>{status?.embeddings ? "semantic" : "lexical"}</b></div>
              </div>
            </div>
            <div className="grid">
              {data.results.map((r, i) => {
                const initials = r.vacancy.company.replace(/[^A-Za-zА-Яа-я ]/g, "").trim().split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "·";
                const vmeta = [r.vacancy.experience, r.vacancy.schedule, r.vacancy.area].filter(Boolean);
                return (
                  <div className={"card" + (i < 3 ? " top" : "")} key={i}>
                    <span className="rank">#{i + 1}</span>
                    <div className="card-top">
                      <div style={{ flex: 1 }}>
                        <h3>{r.vacancy.name}</h3>
                        <div className="company"><span className="logo">{initials}</span>{r.vacancy.company} · {r.vacancy.area}</div>
                      </div>
                      <div className="fit-ring" style={{ background: `conic-gradient(${ringHex(r.fit.score)} ${r.fit.score}%, rgba(255,255,255,.07) 0)` }}>
                        <span className="num" style={{ color: ringHex(r.fit.score) }}>{r.fit.score}%</span><span className="lbl">FIT</span>
                      </div>
                    </div>
                    <div className="salary">{fmtSalary(r.vacancy.salary)}</div>
                    {vmeta.length > 0 && <div className="vac-meta">{vmeta.map((m, k) => <span className="vmeta" key={k}>{m}</span>)}</div>}
                    {r.reason && <div className="match-why"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z" /></svg><span>{r.reason}{typeof r.match === "number" ? <> · <b>{r.match}% match</b></> : null}</span></div>}
                    <div className="breakdown">
                      {bar("Hard", "40%", r.fit.breakdown.hard, "var(--brand)")}
                      {bar("Experience", "30%", r.fit.breakdown.exp, "var(--brand-2)")}
                      {bar("Soft", "30%", r.fit.breakdown.soft, "var(--green)")}
                    </div>
                    <div className="explain">
                      <div className="ex-block match"><div className="ex-h">✓ Matches</div><div className="ex-tags">{r.explain.matches.length ? r.explain.matches.map((s, k) => <span className="ex-tag m" key={k}>{cap(s)}</span>) : <span className="ex-tag">transferable skills</span>}</div></div>
                      <div className="ex-block gap"><div className="ex-h">! Gaps</div><div className="ex-tags">{r.explain.gaps.length ? r.explain.gaps.map((s, k) => <span className="ex-tag g" key={k}>{cap(s)}</span>) : <span className="ex-tag m">no critical gaps</span>}</div></div>
                      <div className="ex-block sug"><div className="ex-h">✦ Suggestions</div><ul className="sug-list">{r.explain.suggestions.map((s, k) => <li key={k} dangerouslySetInnerHTML={{ __html: s }} />)}</ul></div>
                    </div>
                    {r.vacancy.url && <a className="open" href={r.vacancy.url} target="_blank" rel="noopener">Open on hh.kz ↗</a>}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
