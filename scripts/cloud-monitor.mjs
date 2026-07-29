import { chromium } from "playwright";

const endpoint = process.env.ALERT_UPDATE_URL;
const updateToken = process.env.ALERT_UPDATE_TOKEN;
const bypassToken = process.env.SITES_BYPASS_TOKEN;
if (!endpoint || !updateToken || !bypassToken) throw new Error("Missing GitHub Actions secrets");

const sources = [
  // Dailynews is checked first to discover incidents. An operator post always
  // replaces its wording when both sources report the same line.
  { name: "ข่าวนวัตกรรมขนส่งเดลินิวส์", url: "https://www.facebook.com/TransportDailynews", lineIds: [], priority: 1, operator: false },
  { name: "BTS SkyTrain", url: "https://www.facebook.com/BTSSkyTrain", lineIds: ["bts-sukhumvit", "bts-silom", "gold"], priority: 2, operator: true },
  { name: "BEM MRT", url: "https://www.facebook.com/BEM.MRT", lineIds: ["mrt-blue", "mrt-purple"], priority: 2, operator: true },
  { name: "MRT Pink Line", url: "https://www.facebook.com/MRTPinkLine", lineIds: ["mrt-pink"], priority: 2, operator: true },
  { name: "MRT Yellow Line", url: "https://www.facebook.com/MRTYellowLine", lineIds: ["mrt-yellow"], priority: 2, operator: true },
  { name: "รถไฟฟ้าสายสีแดง", url: "https://www.facebook.com/REDLineSRTET", lineIds: ["red-dark", "red-light"], priority: 2, operator: true },
  { name: "Airport Rail Link", url: "https://www.facebook.com/AirportRailLink", lineIds: ["arl"], priority: 2, operator: true }
];

const crowdSources = [
  { name: "กลุ่มผู้ใช้รถไฟฟ้า", url: "https://www.facebook.com/share/g/1BaR6LaXwq/?mibextid=wwXIfr" }
];
const crowdWords = /(คนแน่นมาก|คนแน่น|คนเยอะมาก|คนเยอะ|ต่อคิวยาว|ล้นสถานี|เต็มชานชาลา|ขึ้นรถไม่ได้|เบียดมาก)/i;
const stationLineHints = {
  "ห้าแยกลาดพร้าว": "bts-sukhumvit", "วัดพระศรีมหาธาตุ": "bts-sukhumvit",
  "อนุสาวรีย์ชัยสมรภูมิ": "bts-sukhumvit", "มหาวิทยาลัยเกษตรศาสตร์": "bts-sukhumvit",
  "สนามกีฬาแห่งชาติ": "bts-silom", "สะพานตากสิน": "bts-silom",
  "ศูนย์ราชการนนทบุรี": "mrt-purple", "คลองบางไผ่": "mrt-purple",
  "ศูนย์วัฒนธรรม": "mrt-blue", "สวนจตุจักร": "mrt-blue",
  "หลักสอง": "mrt-blue", "เตาปูน": "mrt-blue", "หัวลำโพง": "mrt-blue",
  "เมืองทองธานี": "mrt-pink", "แยกปากเกร็ด": "mrt-pink", "มีนบุรี": "mrt-pink",
  "แยกลำสาลี": "mrt-yellow", "บางกะปิ": "mrt-yellow",
  "กรุงเทพอภิวัฒน์": "red-dark", "ดอนเมือง": "red-dark", "รังสิต": "red-dark",
  "ตลิ่งชัน": "red-light", "ราชปรารภ": "arl", "มักกะสัน": "arl",
  "สุวรรณภูมิ": "arl", "เจริญนคร": "gold", "คลองสาน": "gold",
  "คูคต": "bts-sukhumvit", "หมอชิต": "bts-sukhumvit", "อารีย์": "bts-sukhumvit",
  "พญาไท": "bts-sukhumvit", "ราชเทวี": "bts-sukhumvit", "สยาม": "bts-sukhumvit",
  "ชิดลม": "bts-sukhumvit", "เพลินจิต": "bts-sukhumvit", "นานา": "bts-sukhumvit",
  "อโศก": "bts-sukhumvit", "พร้อมพงษ์": "bts-sukhumvit", "ทองหล่อ": "bts-sukhumvit",
  "เอกมัย": "bts-sukhumvit", "พระโขนง": "bts-sukhumvit", "อ่อนนุช": "bts-sukhumvit",
  "อุดมสุข": "bts-sukhumvit", "บางนา": "bts-sukhumvit", "แบริ่ง": "bts-sukhumvit",
  "สำโรง": "bts-sukhumvit", "เคหะ": "bts-sukhumvit",
  "ศาลาแดง": "bts-silom", "ช่องนนทรี": "bts-silom", "กรุงธนบุรี": "bts-silom",
  "วงเวียนใหญ่": "bts-silom", "ตลาดพลู": "bts-silom", "บางหว้า": "bts-silom",
  "ลาดพร้าว": "mrt-blue", "พหลโยธิน": "mrt-blue", "ห้วยขวาง": "mrt-blue",
  "พระราม 9": "mrt-blue", "เพชรบุรี": "mrt-blue", "สุขุมวิท": "mrt-blue",
  "สีลม": "mrt-blue", "สามย่าน": "mrt-blue", "ท่าพระ": "mrt-blue",
  "หัวหมาก": "arl", "ลาดกระบัง": "arl"
};

function crowdReportFrom(text) {
  if (!crowdWords.test(text)) return null;
  const station = Object.keys(stationLineHints).sort((a, b) => b.length - a.length).find((name) => text.includes(name));
  if (!station) return null;
  const explicitLines = linesFor(text, []);
  const lineId = explicitLines.length === 1 ? explicitLines[0] : stationLineHints[station];
  const level = /(แน่นมาก|เยอะมาก|ล้นสถานี|เต็มชานชาลา|ขึ้นรถไม่ได้)/i.test(text) ? 3 : 2;
  return { station, lineId, level };
}

const incident = /(ขัดข้อง|ล่าช้า|งดให้บริการ|หยุดเดินรถ|ปิดสถานี|น้ำท่วม|อุบัติเหตุ|เหตุฉุกเฉิน|เดินรถทางเดียว|ระบบสำรอง)/i;
const resolved = /(กลับมาให้บริการตามปกติ|เปิดให้บริการตามปกติแล้ว|กลับมาเปิดให้บริการ|แก้ไขเรียบร้อย|resumed normal|service.*resumed)/i;

function linesFor(text, fallback) {
  if (fallback.length) {
    if (/สีทอง|gold line/i.test(text)) return ["gold"];
    if (/สีลม|silom/i.test(text)) return ["bts-silom"];
    if (/สุขุมวิท|sukhumvit/i.test(text)) return ["bts-sukhumvit"];
    if (/สีน้ำเงิน|blue line/i.test(text)) return ["mrt-blue"];
    if (/สีม่วง|purple line/i.test(text)) return ["mrt-purple"];
    return fallback;
  }
  if (/airport rail link|แอร์พอร์ต\s*เรล\s*ลิงก์|\bARL\b/i.test(text)) return ["arl"];
  if (/สายสีทอง|gold line/i.test(text)) return ["gold"];
  if (/สายสีลม|silom/i.test(text)) return ["bts-silom"];
  if (/สายสุขุมวิท|green line|\bBTS\b|บีทีเอส/i.test(text)) return ["bts-sukhumvit", "bts-silom"];
  if (/สายสีน้ำเงิน|blue line/i.test(text)) return ["mrt-blue"];
  if (/สายสีม่วง|purple line/i.test(text)) return ["mrt-purple"];
  if (/สายสีเหลือง|yellow line/i.test(text)) return ["mrt-yellow"];
  if (/สายสีชมพู|pink line/i.test(text)) return ["mrt-pink"];
  if (/สายสีแดงเข้ม|dark red/i.test(text)) return ["red-dark"];
  if (/สายสีแดงอ่อน|light red/i.test(text)) return ["red-light"];
  if (/สายสีแดง|red line/i.test(text)) return ["red-dark", "red-light"];
  return [];
}

function cleanPostText(value) {
  return value
    .replace(/(?:See more|View more comments|All reactions:|Like Comment|Email or phone number|Password|Log In|Forgot)[\s\S]*$/i, "")
    .replace(/^\s*(?:ลิงก์\s*)?การให้บริการ\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function operatorAnnouncement(value, sourceName) {
  const escapedName = sourceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cleaned = cleanPostText(value)
    .replace(new RegExp("^" + escapedName + "(?:\\s+\\d+\\s*[hm]|\\s+เมื่อ\\S+)?\\s*[·•]?\\s*", "i"), "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned.length > 280 ? cleaned.slice(0, 277).trimEnd() + "…" : cleaned;
}

async function latestPost(page) {
  const article = page.locator('[role="article"]').first();
  const root = await article.count() ? article : page.locator("body");
  const text = (await root.innerText()).replace(/\s+/g, " ").trim();
  const postUrl = await root.locator('a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid="]').evaluateAll((links) => {
    const href = links.map((link) => link.href).find(Boolean);
    return href ? href.split("?")[0] : "";
  });
  return { text, postUrl };
}

const lineNames = {
  "bts-sukhumvit": "BTS สายสุขุมวิท",
  "bts-silom": "BTS สายสีลม",
  gold: "รถไฟฟ้าสายสีทอง",
  "mrt-blue": "MRT สายสีน้ำเงิน",
  "mrt-purple": "MRT สายสีม่วง",
  "mrt-yellow": "MRT สายสีเหลือง",
  "mrt-pink": "MRT สายสีชมพู",
  "red-dark": "รถไฟฟ้าสายสีแดงเข้ม",
  "red-light": "รถไฟฟ้าสายสีแดงอ่อน",
  arl: "Airport Rail Link"
};

function postSummary(text, lineId) {
  const name = lineNames[lineId] || "รถไฟฟ้า";
  const minutes = frequency(text);
  if (/งดให้บริการ|หยุดเดินรถ|ปิดสถานี/i.test(text)) {
    return name + " งดหรือหยุดให้บริการชั่วคราว โปรดตรวจสอบประกาศล่าสุด";
  }
  if (/ล่าช้า/i.test(text)) {
    return name + " มีการเดินรถล่าช้า โปรดเผื่อเวลาเดินทาง";
  }
  if (minutes) {
    return name + " มีเหตุขัดข้อง ขณะนี้ให้บริการด้วยความถี่ประมาณ " + minutes + " นาที";
  }
  return name + " มีเหตุขัดข้อง โปรดตรวจสอบประกาศล่าสุด";
}

function area(text) {
  const match = text.match(/(?:ตั้งแต่|ระหว่าง)\s*(?:สถานี)?\s*([^,.;]{2,35}?)\s*(?:ถึง|–|-)\s*(?:สถานี)?\s*([^,.;]{2,35}?)(?:\s|$)/);
  return match ? match[1].trim() + "–" + match[2].trim() : "โปรดตรวจรายละเอียดในประกาศ";
}

function frequency(text) {
  const match = text.match(/(?:ความถี่|ทุก)\s*(?:ประมาณ)?\s*(\d{1,3})\s*นาที/i);
  return match ? Number(match[1]) : null;
}

async function api(options, target = endpoint) {
  const response = await fetch(target, {
    ...options,
    headers: {
      "OAI-Sites-Authorization": "Bearer " + bypassToken,
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error("API HTTP " + response.status);
  return response.json();
}

const current = await api({}, endpoint.replace(/\/update$/, ""));
const currentByLine = new Map((current.alerts || []).map((alert) => [alert.lineId, alert]));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const candidates = new Map();
const resolvedLines = new Set();
const crowdCandidates = new Map();
const currentCrowdUrls = new Set((current.crowdReports || []).map((report) => report.sourceUrl));

for (const source of sources) {
  try {
    await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);
    const { text, postUrl } = await latestPost(page);
    const affectedLines = linesFor(text, source.lineIds);
    if (!affectedLines.length) continue;
    if (resolved.test(text)) {
      for (const lineId of affectedLines) resolvedLines.add(lineId);
      continue;
    }
    if (!incident.test(text) || !postUrl) continue;
    const minutes = frequency(text);
    for (const lineId of affectedLines) {
      const summary = source.operator ? operatorAnnouncement(text, source.name) : postSummary(text, lineId);
      if (!summary) continue;
      const previousCandidate = candidates.get(lineId);
      if (previousCandidate && previousCandidate.priority >= source.priority) continue;
      const existing = currentByLine.get(lineId);
      if (existing && existing.sourceUrl === postUrl) continue;
      candidates.set(lineId, {
        priority: source.priority,
        lineId,
        affectedArea: area(text),
        summary,
        ...(minutes ? { delayMinutes: [minutes, minutes] } : {}),
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        sourceName: source.name,
        sourceUrl: postUrl
      });
    }
  } catch (error) {
    console.warn("Skipped " + source.name + ": " + error.message);
  }
}


for (const source of crowdSources) {
  try {
    await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    const rawText = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
    const postUrl = await page.locator('a[href*="/posts/"], a[href*="/permalink/"]').evaluateAll((links) => {
      const href = links.map((link) => link.href).find(Boolean);
      return href ? href.split("?")[0] : "";
    });
    const cleaned = cleanPostText(rawText);
    const report = crowdReportFrom(cleaned);
    if (!report || !postUrl || currentCrowdUrls.has(postUrl)) continue;
    const id = "crowd-" + report.lineId + "-" + Buffer.from(postUrl).toString("base64url").slice(-48);
    crowdCandidates.set(id, {
      id,
      lineId: report.lineId,
      station: report.station,
      direction: null,
      level: report.level,
      summary: report.station + (report.level === 3 ? " มีรายงานว่าผู้โดยสารหนาแน่นมาก" : " มีรายงานว่าผู้โดยสารค่อนข้างหนาแน่น"),
      reportedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      sourceName: source.name,
      sourceUrl: postUrl
    });
  } catch (error) {
    console.warn("Skipped crowd source " + source.name + ": " + error.message);
  }
}

await browser.close();
for (const lineId of resolvedLines) candidates.delete(lineId);
if (!candidates.size && !resolvedLines.size && !crowdCandidates.size) {
  console.log("No alert change");
  process.exit(0);
}

const updated = await api({
  method: "POST",
  headers: {
    Authorization: "Bearer " + updateToken,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    alerts: [...candidates.values()].map(({ priority, ...alert }) => alert),
    resolvedLineIds: [...resolvedLines],
    crowdReports: [...crowdCandidates.values()]
  })
});
console.log(JSON.stringify(updated));
