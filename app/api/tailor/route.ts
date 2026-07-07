import { tailorAgent } from "@/lib/agents/tailor";

export const runtime = "nodejs";
export const maxDuration = 30;

/** POST { profile, vacancy } → { summary, matches, gaps, suggestions, source } */
export async function POST(req: Request) {
  try {
    const { profile, vacancy } = await req.json();
    if (!vacancy) return Response.json({ error: "vacancy required" }, { status: 400 });
    const prof = profile || { skills: [], soft: [], domains: [], years: 0, projects: [] };
    return Response.json(await tailorAgent(prof, vacancy));
  } catch (e: any) {
    return Response.json({ error: e?.message || "tailor failed" }, { status: 500 });
  }
}
