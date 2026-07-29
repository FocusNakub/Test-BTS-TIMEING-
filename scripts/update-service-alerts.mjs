import fs from "node:fs/promises";

const outputPaths = [
  new URL("../public/service-alerts.json", import.meta.url),
  new URL("../service-alerts.json", import.meta.url),
];
const maxAgeMs = 6 * 60 * 60 * 1000;

const sources = [
  {
    name: "BTS SkyTrain",
    lineIds: ["bts-sukhumvit", "bts-silom", "gold"],
    query: 'site:facebook.com/BTSSkyTrain (ขัดข้อง OR ล่าช้า OR งดให้บริการ OR หยุดเดินรถ)',
  },
  {
    name: "MRT Pink Line",
    lineIds: ["mrt-pink"],
    query: 'site:facebook.com/MRTPinkLine (ขัดข้อง OR ล่าช้า OR งดให้บริการ OR หยุดเดินรถ)',
  },
  {
    name: "MRT Yellow Line",
    lineIds: ["mrt-yellow"],
    query: 'site:facebook.com/MRTYellowLine (ขัดข้อง OR ล่าช้า OR งดให้บริการ OR หยุดเดินรถ)',
  },
  {
    name: "BEM MRT",
    lineIds: ["mrt-blue", "mrt-purple"],
    query: '(site:facebook.com/BEM.MRT OR site:metro.bemplc.co.th) (ขัดข้อง OR ล่าช้า OR งดให้บริการ OR หยุดเดินรถ)',
  },
  {
    name: "SRTET",
    lineIds: ["red-dark", "red-light", "arl"],
    query: '(site:srtet.co.th OR site:facebook.com/REDLineSRTET OR site:facebook.com/AirportRailLink) (ขัดข้อง OR ล่าช้า OR งดให้บริการ OR หยุดเดินรถ)',
  },
];

const incidentWords = /(ขัดข้อง|ล่าช้า|งดให้บริการ|หยุดเดินรถ|ปิดให้บริการ|เหตุขัดข้อง|service disruption|delayed|suspended)/i;
const resolvedWords = /(กลับมาให้บริการตามปกติ|เปิดให้บริการตามปกติ|แก้ไขเรียบร้อย|normal service.*resum|resumed normal)/i;

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ").trim();
}

function tag(item, name) {
  return decodeXml(item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1]);
}

function itemLink(item) {
  return tag(item, "link") || item.match(/<link>([^<]+)<\/link>/i)?.[1] || "";
}

function affectedArea(text) {
  const range = text.match(/(?:ตั้งแต่|ระหว่าง)\s*(?:สถานี)?\s*([^,.;]{2,35}?)\s*(?:ถึง|–|-)\s*(?:สถานี)?\s*([^,.;]{2,35}?)(?:\s|$)/);
  if (range) return `${range[1].trim()}–${range[2].trim()}`;
  const station = text.match(/สถานี\s*([^,.;]{2,35})/);
  return station ? `บริเวณสถานี${station[1].trim()}` : "โปรดตรวจช่วงสถานีในประกาศต้นฉบับ";
}

function delayMinutes(text) {
  const range = text.match(/(?:ล่าช้า|เพิ่มขึ้น)?[^\d]{0,20}(\d{1,3})\s*(?:-|–|ถึง)\s*(\d{1,3})\s*นาที/);
  if (range) return [Number(range[1]), Number(range[2])];
  const single = text.match(/(?:ล่าช้า|เพิ่มขึ้น)[^\d]{0,20}(\d{1,3})\s*นาที/);
  return single ? [Number(single[1]), Number(single[1])] : undefined;
}

function lineIdsFor(source, text) {
  if (source.name === "BTS SkyTrain") {
    if (/สีทอง|gold line/i.test(text)) return ["gold"];
    if (/สีลม|silom/i.test(text)) return ["bts-silom"];
    if (/สุขุมวิท|sukhumvit/i.test(text)) return ["bts-sukhumvit"];
  }
  if (source.name === "BEM MRT") {
    if (/สีม่วง|purple/i.test(text)) return ["mrt-purple"];
    if (/สีน้ำเงิน|blue/i.test(text)) return ["mrt-blue"];
  }
  return source.lineIds;
}

async function fetchItems(source) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${source.query} when:1d`)}&hl=th&gl=TH&ceid=TH:th`;
  const response = await fetch(url, { headers: { "User-Agent": "BangkokRailDaily/1.0" } });
  if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
}

const now = Date.now();
const alerts = [];

for (const source of sources) {
  try {
    const items = await fetchItems(source);
    for (const item of items) {
      const title = tag(item, "title");
      const description = tag(item, "description");
      const text = `${title} ${description}`.trim();
      const publishedAt = new Date(tag(item, "pubDate"));
      if (!incidentWords.test(text) || resolvedWords.test(text) || !Number.isFinite(publishedAt.getTime())) continue;
      if (now - publishedAt.getTime() > maxAgeMs || publishedAt.getTime() > now + 5 * 60 * 1000) continue;
      for (const lineId of lineIdsFor(source, text)) {
        alerts.push({
          lineId,
          affectedArea: affectedArea(text),
          summary: title.replace(/\s+-\s+[^-]+$/, "").slice(0, 180),
          ...(delayMinutes(text) ? { delayMinutes: delayMinutes(text) } : {}),
          updatedAt: publishedAt.toISOString(),
          sourceName: source.name,
          sourceUrl: itemLink(item),
        });
      }
    }
  } catch (error) {
    console.warn(error.message);
  }
}

const unique = [...new Map(alerts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((alert) => [`${alert.lineId}|${alert.sourceUrl}`, alert])).values()];
const previous = JSON.parse(await fs.readFile(outputPaths[0], "utf8").catch(() => '{"generatedAt":"","alerts":[]}'));
const previousAlerts = JSON.stringify(previous.alerts || []);
const nextAlerts = JSON.stringify(unique);
const result = { generatedAt: previousAlerts === nextAlerts ? previous.generatedAt : new Date().toISOString(), alerts: unique };
await Promise.all(outputPaths.map((outputPath) => fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`)));
console.log(`Found ${unique.length} active alert(s).`);
