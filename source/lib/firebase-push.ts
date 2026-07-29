import { inArray } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { pushTokens } from "@/db/schema";

type PushMessage = { title: string; body: string; url?: string; tag?: string };

function base64Url(input: Uint8Array | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function privateKeyBytes(pem: string) {
  const body = pem.replace(/\\n/g, "\n").replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(body);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function accessToken(projectId: string, clientEmail: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error(`Firebase OAuth failed (${response.status})`);
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error("Firebase OAuth returned no access token");
  return { projectId, token: data.access_token };
}

export async function sendPush(message: PushMessage) {
  const secrets = env as unknown as Record<string, string | undefined>;
  const projectId = secrets.FIREBASE_PROJECT_ID;
  const clientEmail = secrets.FIREBASE_CLIENT_EMAIL;
  const privateKey = secrets.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return { configured: false, sent: 0, failed: 0 };

  const rows = await getDb().select({ token: pushTokens.token }).from(pushTokens);
  if (!rows.length) return { configured: true, sent: 0, failed: 0 };
  const auth = await accessToken(projectId, clientEmail, privateKey);
  let sent = 0;
  let failed = 0;
  const invalid: string[] = [];
  for (const row of rows) {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(auth.projectId)}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { token: row.token, data: {
        title: message.title,
        body: message.body,
        url: message.url || "/Test-BTS-TIMEING-/",
        tag: message.tag || "rail-service-alert",
      } } }),
    });
    if (response.ok) sent += 1;
    else {
      failed += 1;
      const detail = await response.text();
      if (response.status === 404 || detail.includes("UNREGISTERED") || detail.includes("INVALID_ARGUMENT")) invalid.push(row.token);
    }
  }
  if (invalid.length) await getDb().delete(pushTokens).where(inArray(pushTokens.token, invalid));
  return { configured: true, sent, failed };
}
