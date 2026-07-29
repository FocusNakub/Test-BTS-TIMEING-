import { getDb } from "@/db";
import { pushTokens } from "@/db/schema";

const allowedOrigins = new Set([
  "https://focusnakub.github.io",
  "https://bangkok-rail-daily-2026.pp5074160.chatgpt.site",
]);

function cors(request: Request) {
  const origin = request.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://focusnakub.github.io",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin") || "";
  if (!allowedOrigins.has(origin)) return Response.json({ error: "Origin not allowed" }, { status: 403, headers: cors(request) });
  let body: { token?: unknown; platform?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: cors(request) }); }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (token.length < 40 || token.length > 5000) return Response.json({ error: "Invalid token" }, { status: 400, headers: cors(request) });
  const platform = typeof body.platform === "string" ? body.platform.slice(0, 80) : "web";
  const now = new Date();
  await getDb().insert(pushTokens).values({ token, platform, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: pushTokens.token, set: { platform, updatedAt: now } });
  return Response.json({ ok: true }, { headers: cors(request) });
}
