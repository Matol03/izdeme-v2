/**
 * Vector retrieval — the semantic recall layer ("embeddings for recall, LLM for
 * precision", spec §1). This in-memory implementation is the exact analog of the
 * Supabase pgvector query it will be swapped for in Phase 2:
 *
 *   select *, 1 - (embedding <=> $queryEmbedding) as score
 *   from vacancies order by embedding <=> $queryEmbedding limit $k;
 *
 * Keeping it here (a) makes retrieval unit-testable without a DB, and (b) is the
 * account-free fallback path when Supabase isn't configured.
 */
import { cosine } from "./embeddings";

export interface Embedded<T> { item: T; embedding: number[]; }
export interface Retrieved<T> { item: T; score: number; }

/** Top-K by cosine similarity to the query vector (descending). */
export function retrieveTopK<T>(queryEmbedding: number[], corpus: Embedded<T>[], k = 40): Retrieved<T>[] {
  return corpus
    .map(({ item, embedding }) => ({ item, score: cosine(queryEmbedding, embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
