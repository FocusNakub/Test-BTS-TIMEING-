import { eq, inArray, lt } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { crowdReports, serviceAlerts } from "@/db/schema";
import { sendPush } from "@/lib/firebase-push";

const validLineIds = new Set([
  "bts-sukhumvit", "bts-silom", "gold", "mrt-blue", "mrt-purple",
  "mrt-yellow", "mrt-pink", "red-dark", "red-light", "arl",
]);

type IncomingAlert = {
  lineId?: unknown;
  affectedArea?: unknown;
  summary?: unknown;
  delayMinutes?: unknown;
  updatedAt?: unknown;
  expiresAt?: unknown;
  sourceName?: unknown;
  sourceUrl?: unknown;
};

type IncomingCrowdReport = {
  id?: unknown;
  lineId?: unknown;
  station?: unknown;
  direction?: unknown;
  level?: unknown;
  summary?: unknown;
  reportedAt?: unknown;
  expiresAt?: unknown;
  sourceName?: unknown;
  sourceUrl?: unknown;
};

function text(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function safeUrl(value: unknown) {
  const raw = text(value, 1000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}

function safeDate(value: unknown) {
  const date = typeof value === "string" || typeof value === "number" ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

export async function POST(request: Request) {
  const expected = env.ALERT_UPDATE_TOKEN;
  const provided = request.headers.get("authorization");
  if (!expected || provided !== `Bearer ${expected}`) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { alerts?: IncomingAlert[]; resolvedLineIds?: unknown[]; crowdReports?: IncomingCrowdReport[]; resolvedCrowdReportIds?: unknown[] };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const now = new Date();
  const db = getDb();
  const accepted: string[] = [];
  const changedAlerts: Array<{ lineId: string; affectedArea: string; summary: string }> = [];
  for (const raw of Array.isArray(body.alerts) ? body.alerts : []) {
    const lineId = text(raw.lineId, 40);
    const affectedArea = text(raw.affectedArea, 160);
    const summary = text(raw.summary, 300);
    const updatedAt = safeDate(raw.updatedAt) || now;
    const expiresAt = safeDate(raw.expiresAt);
    const sourceName = text(raw.sourceName, 120);
    const sourceUrl = safeUrl(raw.sourceUrl);
    if (!lineId || !validLineIds.has(lineId) || !affectedArea || !summary || !expiresAt || expiresAt <= now || !sourceName || !sourceUrl) continue;
    const delay = Array.isArray(raw.delayMinutes) && raw.delayMinutes.length === 2 ? raw.delayMinutes.map(Number) : null;
    const delayMin = delay && Number.isFinite(delay[0]) && delay[0] >= 0 && delay[0] <= 180 ? Math.round(delay[0]) : null;
    const delayMax = delay && Number.isFinite(delay[1]) && delay[1] >= (delayMin ?? 0) && delay[1] <= 180 ? Math.round(delay[1]) : null;
    const previous = await db.select().from(serviceAlerts).where(eq(serviceAlerts.lineId, lineId)).limit(1);
    const values = { lineId, affectedArea, summary, delayMin, delayMax, updatedAt, expiresAt, sourceName, sourceUrl };
    await db.insert(serviceAlerts).values(values).onConflictDoUpdate({ target: serviceAlerts.lineId, set: values });
    accepted.push(lineId);
    const old = previous[0];
    if (!old || old.summary !== summary || old.affectedArea !== affectedArea || old.delayMin !== delayMin || old.delayMax !== delayMax) {
      changedAlerts.push({ lineId, affectedArea, summary });
    }
  }

  const resolved = (Array.isArray(body.resolvedLineIds) ? body.resolvedLineIds : [])
    .map((value) => text(value, 40)).filter((value): value is string => Boolean(value && validLineIds.has(value)));
  if (resolved.length) await db.delete(serviceAlerts).where(inArray(serviceAlerts.lineId, resolved));
  const acceptedCrowdReports: string[] = [];
  for (const raw of Array.isArray(body.crowdReports) ? body.crowdReports : []) {
    const id = text(raw.id, 120);
    const lineId = text(raw.lineId, 40);
    const station = text(raw.station, 120);
    const summary = text(raw.summary, 300);
    const reportedAt = safeDate(raw.reportedAt) || now;
    const expiresAt = safeDate(raw.expiresAt);
    const sourceName = text(raw.sourceName, 120);
    const sourceUrl = safeUrl(raw.sourceUrl);
    const levelValue = Number(raw.level);
    const level = Number.isFinite(levelValue) ? Math.max(1, Math.min(3, Math.round(levelValue))) : null;
    const directionValue = Number(raw.direction);
    const direction = directionValue === -1 || directionValue === 1 ? directionValue : null;
    if (!id || !lineId || !validLineIds.has(lineId) || !station || !summary || !level || !expiresAt || expiresAt <= now || !sourceName || !sourceUrl) continue;
    const values = { id, lineId, station, direction, level, summary, reportedAt, expiresAt, sourceName, sourceUrl };
    await db.insert(crowdReports).values(values).onConflictDoUpdate({ target: crowdReports.id, set: values });
    acceptedCrowdReports.push(id);
  }
  const resolvedCrowdReportIds = (Array.isArray(body.resolvedCrowdReportIds) ? body.resolvedCrowdReportIds : [])
    .map((value) => text(value, 120)).filter((value): value is string => Boolean(value));
  if (resolvedCrowdReportIds.length) await db.delete(crowdReports).where(inArray(crowdReports.id, resolvedCrowdReportIds));
  await db.delete(serviceAlerts).where(lt(serviceAlerts.expiresAt, now));
  await db.delete(crowdReports).where(lt(crowdReports.expiresAt, now));
  const pushResults = [];
  for (const alert of changedAlerts) {
    pushResults.push(await sendPush({
      title: `แจ้งเหตุรถไฟฟ้า · ${alert.affectedArea}`,
      body: alert.summary,
      url: "/Test-BTS-TIMEING-/",
      tag: `rail-alert-${alert.lineId}`,
    }));
  }
  for (const lineId of resolved) {
    pushResults.push(await sendPush({
      title: "การเดินรถกลับสู่ภาวะปกติ",
      body: `ประกาศเหตุของ ${lineId} ได้รับการยกเลิกแล้ว`,
      url: "/Test-BTS-TIMEING-/",
      tag: `rail-alert-${lineId}`,
    }));
  }
  return Response.json({ ok: true, accepted, resolved, acceptedCrowdReports, resolvedCrowdReportIds, pushResults });
}
