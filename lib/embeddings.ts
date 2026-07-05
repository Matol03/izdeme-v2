/**
 * Embeddings — provider-agnostic, with a deterministic OFFLINE fallback so the
 * retrieval pipeline works (and is unit-testable) without any API key.
 *
 * Real path: gemini-embedding-001 (multilingual, top MTEB), truncated to EMBED_DIMS
 * via Matryoshka, with ASYMMETRIC task types (RETRIEVAL_QUERY vs RETRIEVAL_DOCUMENT).
 * Fallback: signed feature-hashing bag-of-words → fixed-dim L2-normalized vector.
 * The fallback captures lexical overlap only (no synonymy) — good enough to build and
 * test the pipeline; swap in Gemini for true semantic recall (spec §4/§5, Phase 2).
 */
import { tokenize } from "./scoring/lexicons";

export type TaskType = "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT";
export const EMBED_DIMS = Number(process.env.EMBED_DIMS || 1536);

/** FNV-1a → uint32, for stable feature hashing. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

function l2normalize(v: number[]): number[] {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return v.map(x => x / n);
}

/** Deterministic bag-of-words embedding (signed feature hashing). Account-free. */
export function hashEmbed(text: string, dims = EMBED_DIMS): number[] {
  const v = new Array(dims).fill(0);
  for (const t of tokenize(text)) {
    const idx = fnv1a(t) % dims;
    const sign = (fnv1a(t + "#") & 1) ? 1 : -1; // signed hashing reduces collision bias
    v[idx] += sign;
  }
  return l2normalize(v);
}

/** Real Gemini embedding (only used when GEMINI_API_KEY is set). */
async function geminiEmbed(text: string, taskType: TaskType, dims: number, key: string): Promise<number[]> {
  const model = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${key}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text: text.slice(0, 8000) }] },
      taskType,
      outputDimensionality: dims,
    }),
  });
  if (!r.ok) throw new Error(`gemini-embed ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const j = await r.json();
  const values: number[] = j?.embedding?.values || [];
  if (!values.length) throw new Error("gemini-embed: empty");
  return values;
}

/**
 * Embed text for retrieval. Uses Gemini when keyed (asymmetric task type), else the
 * deterministic offline fallback. Never throws — always returns a usable vector.
 */
export async function embed(text: string, taskType: TaskType = "RETRIEVAL_DOCUMENT"): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try { return await geminiEmbed(text, taskType, EMBED_DIMS, key); }
    catch { /* fall through to offline fallback */ }
  }
  return hashEmbed(text, EMBED_DIMS);
}

/** Cosine similarity (handles non-normalized vectors). */
export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d ? dot / d : 0;
}
