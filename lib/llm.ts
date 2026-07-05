/**
 * Provider-agnostic LLM client with SCHEMA-VALIDATED structured output.
 * Any OpenAI-compatible endpoint (Groq default, Gemini switchable) — mirrors v1's
 * provider registry + LLM_LOCK. `generateObject` validates the model's JSON against a
 * Zod schema, so "never invent skills" is enforced at the type level, not by prompt
 * wording alone. Agents call this and FAIL CLOSED to a deterministic fallback on any
 * error (no key, network, invalid JSON) — broken JSON never reaches the UI (spec §4/§6).
 *
 * NOTE: intentionally fetch-based (no Vercel AI SDK dep yet) so the fallback path is
 * fully unit-testable account-free. Phase 5 can swap in the AI SDK behind this interface.
 */
import { z, type ZodTypeAny } from "zod";

interface Provider { label: string; baseUrl: string; apiKey: string; model: string; extra?: Record<string, unknown>; }

const PROVIDERS: Record<string, Provider> = {
  groq: {
    label: "Groq",
    baseUrl: (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, ""),
    apiKey: process.env.GROQ_API_KEY || process.env.LLM_API_KEY || "",
    // ⚠️ Groq deprecated llama-3.3-70b-versatile (17 Jun 2026); default to a live model.
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  },
  gemini: {
    label: "Gemini",
    baseUrl: (process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/+$/, ""),
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    extra: { reasoning_effort: "none" }, // avoid thinking eating the JSON budget
  },
};
const LOCK = (PROVIDERS[process.env.LLM_LOCK || ""] && PROVIDERS[process.env.LLM_LOCK!].apiKey) ? process.env.LLM_LOCK! : "";
const DEFAULT_PROVIDER = LOCK
  || (PROVIDERS[process.env.LLM_PROVIDER || ""]?.apiKey ? process.env.LLM_PROVIDER!
    : PROVIDERS.groq.apiKey ? "groq" : PROVIDERS.gemini.apiKey ? "gemini" : "groq");

function pick(id?: string): Provider { return PROVIDERS[LOCK || (id && PROVIDERS[id]?.apiKey ? id : DEFAULT_PROVIDER)]; }

export function llmEnabled(): boolean { return PROVIDERS.groq.apiKey !== "" || PROVIDERS.gemini.apiKey !== ""; }
export function llmStatus() {
  return {
    enabled: llmEnabled(), default: DEFAULT_PROVIDER, locked: LOCK || null,
    providers: Object.entries(PROVIDERS).map(([id, p]) => ({ id, label: p.label, model: p.model, enabled: !!p.apiKey })),
  };
}

export interface Msg { role: "system" | "user" | "assistant"; content: string; }

/** Raw OpenAI-compatible chat call → string content. Throws NO_KEY when unconfigured. */
export async function callLLM(messages: Msg[], opts: { provider?: string; json?: boolean; maxTokens?: number; temperature?: number } = {}): Promise<string> {
  const p = pick(opts.provider);
  if (!p || !p.apiKey) { const e = new Error(`${p?.label || "LLM"} API key not set`); (e as any).code = "NO_KEY"; throw e; }
  const body: Record<string, unknown> = { model: p.model, messages, temperature: opts.temperature ?? 0.2, max_tokens: opts.maxTokens ?? 800 };
  if (opts.json ?? true) body.response_format = { type: "json_object" };
  if (p.extra) Object.assign(body, p.extra);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 22000);
  const r = await fetch(p.baseUrl + "/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + p.apiKey },
    body: JSON.stringify(body), signal: ctrl.signal,
  }).finally(() => clearTimeout(t));
  if (!r.ok) throw new Error(`${p.label} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  return data?.choices?.[0]?.message?.content || "{}";
}

/** Structured output: call the LLM and validate against a Zod schema. Throws on invalid. */
export async function generateObject<S extends ZodTypeAny>(schema: S, messages: Msg[], opts: { provider?: string; maxTokens?: number } = {}): Promise<z.infer<S>> {
  const raw = await callLLM(messages, { ...opts, json: true });
  return schema.parse(JSON.parse(raw)); // ZodError / SyntaxError → caller fails closed
}
