type Source = { name: string; lineIds: string[]; query: string };

const maxAgeMs = 6 * 60 * 60 * 1000;
const sources: Source[] = [
  { name: "BTS SkyTrain", lineIds: ["bts-sukhumvit", "bts-silom", "gold"], query: 'site:facebook.com/BTSSkyTrain (ขัดข้อง OR ล่าช้า OR งดให้บริการ OR หยุดเดินรถ)' },
  { name: "MRT Pink Line", lineIds: ["mrt-pink"], query: 'site:facebook.com/MRTPinkLine (ขัดข้อง OR ล่าช้า OR งดให้บริการ OR หยุดเดินรถ)' },
  { name: "MRT Yellow Line", lineIds: ["mrt-yellow"], query: 'site:facebook.com/MRTYellowLine (ขัดข้อง OR ล่าช้า OR งดให้บริการ OR หยุดเดินรถ)' },
  { name: "BEM MRT", lineIds: ["mrt-blue", "mrt-purple"], query: '(site:facebook.com/BEM.MRT OR site:metro.bemplc.co.th) (ขัดข้อง OR ล่าช้า OR งดให้บริการ OR หยุดเดินรถ)' },
  { name: "SRTET", lineIds: ["red-dark", "red-light", "arl"], query: '(site:srtet.co.th OR site:facebook.com/REDLineSRTET OR site:facebook.com/AirportRailLink) (ขัดข้อง OR ล่าช้า OR งดให้บริการ OR หยุดเดินรถ)' },
  { name: "ข่าวนวัตกรรมขนส่งเดลินิวส์", lineIds: [], query: 'site:facebook.com/TransportDailynews (รถไฟฟ้า OR BTS OR MRT OR Airport Rail Link OR แอร์พอร์ตเรลลิงก์) (ขัดข้อง OR ล่าช้า OR งดให้บริการ OR หยุดเดินรถ)' },
];

const incidentWords = /(ขัดข้อง|ล่าช้า|งดให้บริการ|หยุดเดินรถ|ปิดให้บริการ|เหตุขัดข้อง|service disruption|delayed|suspended)/i;
const resolvedWords = /(กลับมาให้บริการตามปกติ|เปิดให้บริการตามปกติ|กลับมาเปิดให้บริการ|เปิดให้บริการแล้ว|แก้ไขเรียบร้อย|normal service.*resum|resumed normal|service.*resumed)/i;

function decodeXml(value = "") {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ").trim();
}

function tag(item: string, name: string) {
  return decodeXml(item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1]);
}

function affectedArea(text: string) {
  const range = text.match(/(?:ตั้งแต่|ระหว่าง)\s*(?:สถานี)?\s*([^,.;]{2,35}?)\s*(?:ถึง|–|-)\s*(?:สถานี)?\s*([^,.;]{2,35}?)(?:\s|$)/);
  if (range) return `${range[1].trim()}–${range[2].trim()}`;
  const station = text.match(/สถานี\s*([^,.;]{2,35})/);
  return station ? `บริเวณสถานี${station[1].trim()}` : "โปรดตรวจช่วงสถานีในประกาศต้นฉบับ";
}

function delayMinutes(text: string): [number, number] | undefined {
  const range = text.match(/(?:ล่าช้า|เพิ่มขึ้น)?[^\d]{0,20}(\d{1,3})\s*(?:-|–|ถึง)\s*(\d{1,3})\s*นาที/);
  if (range) return [Number(range[1]), Number(range[2])];
  const single = text.match(/(?:ล่าช้า|เพิ่มขึ้น)[^\d]{0,20}(\d{1,3})\s*นาที/);
  return single ? [Number(single[1]), Number(single[1])] : undefined;
}

function lineIdsFor(source: Source, text: string) {
  if (source.name === "BTS SkyTrain") {
    if (/สีทอง|gold line/i.test(text)) return ["gold"];
    if (/สีลม|silom/i.test(text)) return ["bts-silom"];
    if (/สุขุมวิท|sukhumvit/i.test(text)) return ["bts-sukhumvit"];
  }
  if (source.name === "BEM MRT") {
    if (/สีม่วง|purple/i.test(text)) return ["mrt-purple"];
    if (/สีน้ำเงิน|blue/i.test(text)) return ["mrt-blue"];
  }
  if (source.name === "ข่าวนวัตกรรมขนส่งเดลินิวส์") {
    if (/สายสีทอง|gold line/i.test(text)) return ["gold"];
    if (/สายสีลม|silom line/i.test(text)) return ["bts-silom"];
    if (/สายสุขุมวิท|sukhumvit line/i.test(text)) return ["bts-sukhumvit"];
    if (/สายสีเขียว|green line|บีทีเอส|\bBTS\b/i.test(text)) return ["bts-sukhumvit", "bts-silom"];
    if (/สายสีน้ำเงิน|blue line/i.test(text)) return ["mrt-blue"];
    if (/สายสีม่วง|purple line/i.test(text)) return ["mrt-purple"];
    if (/สายสีเหลือง|yellow line/i.test(text)) return ["mrt-yellow"];
    if (/สายสีชมพู|pink line/i.test(text)) return ["mrt-pink"];
    if (/สายสีแดงเข้ม|dark red line/i.test(text)) return ["red-dark"];
    if (/สายสีแดงอ่อน|light red line/i.test(text)) return ["red-light"];
    if (/สายสีแดง|red line/i.test(text)) return ["red-dark", "red-light"];
    if (/airport rail link|แอร์พอร์ต\s*เรล\s*ลิงก์|รถไฟฟ้าเชื่อมท่าอากาศยาน/i.test(text)) return ["arl"];
    return [];
  }
  return source.lineIds;
}

async function fetchItems(source: Source) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${source.query} when:1d`)}&hl=th&gl=TH&ceid=TH:th`;
  const response = await fetch(url, { headers: { "User-Agent": "BangkokRailDaily/1.0" } });
  if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`);
  return [...(await response.text()).matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
}

export async function GET() {
  const now = Date.now();
  const alerts: Array<Record<string, unknown>> = [];
  const liveCrowdReports: Array<Record<string, unknown>> = [];
  try {
    const stored = await getDb().select().from(serviceAlerts).where(gt(serviceAlerts.expiresAt, new Date(now)));
    for (const alert of stored) {
      alerts.push({
        lineId: alert.lineId,
        affectedArea: alert.affectedArea,
        summary: alert.summary,
        ...(alert.delayMin != null && alert.delayMax != null ? { delayMinutes: [alert.delayMin, alert.delayMax] } : {}),
        updatedAt: alert.updatedAt.toISOString(),
        sourceName: alert.sourceName,
        sourceUrl: alert.sourceUrl,
        detector: "direct-monitor",
      });
    }
    const storedCrowdReports = await getDb().select().from(crowdReports).where(gt(crowdReports.expiresAt, new Date(now)));
    for (const report of storedCrowdReports) {
      liveCrowdReports.push({
        id: report.id,
        lineId: report.lineId,
        station: report.station,
        direction: report.direction,
        level: report.level,
        summary: report.summary,
        reportedAt: report.reportedAt.toISOString(),
        expiresAt: report.expiresAt.toISOString(),
        sourceName: report.sourceName,
        sourceUrl: report.sourceUrl,
      });
    }
  } catch { /* Local builds do not always have a D1 binding. */ }
  await Promise.all(sources.map(async (source) => {
    try {
      const items = await fetchItems(source);
      const resolvedAt = new Map<string, number>();
      for (const item of items) {
        const text = `${tag(item, "title")} ${tag(item, "description")}`.trim();
        const publishedAt = new Date(tag(item, "pubDate"));
        if (!resolvedWords.test(text) || !Number.isFinite(publishedAt.getTime()) || now - publishedAt.getTime() > maxAgeMs) continue;
        for (const lineId of lineIdsFor(source, text)) resolvedAt.set(lineId, Math.max(resolvedAt.get(lineId) || 0, publishedAt.getTime()));
      }
      for (const item of items) {
        const title = tag(item, "title");
        const text = `${title} ${tag(item, "description")}`.trim();
        const publishedAt = new Date(tag(item, "pubDate"));
        if (!incidentWords.test(text) || resolvedWords.test(text) || !Number.isFinite(publishedAt.getTime())) continue;
        if (now - publishedAt.getTime() > maxAgeMs || publishedAt.getTime() > now + 5 * 60 * 1000) continue;
        for (const lineId of lineIdsFor(source, text)) {
          if ((resolvedAt.get(lineId) || 0) >= publishedAt.getTime()) continue;
          const delay = delayMinutes(text);
          alerts.push({ lineId, affectedArea: affectedArea(text), summary: title.replace(/\s+-\s+[^-]+$/, "").slice(0, 180), ...(delay ? { delayMinutes: delay } : {}), updatedAt: publishedAt.toISOString(), sourceName: source.name, sourceUrl: tag(item, "link") });
        }
      }
    } catch { /* Return other working sources if one source is unavailable. */ }
  }));
  const unique = [...new Map(alerts.sort((a, b) => Number(Boolean(a.detector)) - Number(Boolean(b.detector)) || String(a.updatedAt).localeCompare(String(b.updatedAt))).map((alert) => [String(alert.lineId), alert])).values()]
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return Response.json({ generatedAt: new Date().toISOString(), alerts: unique, crowdReports: liveCrowdReports }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=300" } });
}
import { gt } from "drizzle-orm";
import { getDb } from "@/db";
import { crowdReports, serviceAlerts } from "@/db/schema";
