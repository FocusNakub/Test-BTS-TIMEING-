import { chromium } from "playwright";

const endpoint = process.env.ALERT_UPDATE_URL;
const updateToken = process.env.ALERT_UPDATE_TOKEN;
const bypassToken = process.env.SITES_BYPASS_TOKEN;
if (!endpoint || !updateToken || !bypassToken) throw new Error("Missing GitHub Actions secrets");

const sources = [
  { name: "ข่าวนวัตกรรมขนส่งเดลินิวส์", url: "https://www.facebook.com/TransportDailynews", lineIds: [] },
  { name: "BTS SkyTrain", url: "https://www.facebook.com/BTSSkyTrain", lineIds: ["bts-sukhumvit", "bts-silom", "gold"] },
  { name: "BEM MRT", url: "https://www.facebook.com/BEM.MRT", lineIds: ["mrt-blue", "mrt-purple"] },
  { name: "MRT Pink Line", url: "https://www.facebook.com/MRTPinkLine", lineIds: ["mrt-pink"] },
  { name: "MRT Yellow Line", url: "https://www.facebook.com/MRTYellowLine", lineIds: ["mrt-yellow"] },
  { name: "รถไฟฟ้าสายสีแดง", url: "https://www.facebook.com/REDLineSRTET", lineIds: ["red-dark", "red-light"] },
  { name: "Airport Rail Link", url: "https://www.facebook.com/AirportRailLink", lineIds: ["arl"] }
];

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

for (const source of sources) {
  try {
    await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
    const postUrl = await page.locator('a[href*="/posts/"]').evaluateAll((links) => {
      const href = links.map((link) => link.href).find((value) => value.includes("/posts/"));
      return href ? href.split("?")[0] : "";
    });
    const affectedLines = linesFor(text, source.lineIds);
    if (!affectedLines.length) continue;
    if (resolved.test(text)) {
      for (const lineId of affectedLines) resolvedLines.add(lineId);
      continue;
    }
    if (!incident.test(text) || !postUrl) continue;
    const minutes = frequency(text);
    for (const lineId of affectedLines) {
      const summary = postSummary(text, lineId);
      if (candidates.has(lineId)) continue;
      const existing = currentByLine.get(lineId);
      if (existing && existing.sourceUrl === postUrl) continue;
      candidates.set(lineId, {
        lineId,
        affectedArea: area(summary),
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

await browser.close();
for (const lineId of resolvedLines) candidates.delete(lineId);
if (!candidates.size && !resolvedLines.size) {
  console.log("No alert change");
  process.exit(0);
}

const updated = await api({
  method: "POST",
  headers: {
    Authorization: "Bearer " + updateToken,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ alerts: [...candidates.values()], resolvedLineIds: [...resolvedLines] })
});
console.log(JSON.stringify(updated));
