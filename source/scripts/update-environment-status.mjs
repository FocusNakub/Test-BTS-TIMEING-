import { readFile, writeFile } from "node:fs/promises";

const outputFiles = ["environment-status.json", "public/environment-status.json"];
const tomTomKey = process.env.TOMTOM_API_KEY?.trim();
const openWeatherKey = process.env.OPENWEATHER_API_KEY?.trim();

if (!tomTomKey && !openWeatherKey) {
  console.log("No optional provider keys configured; keeping the last good feed.");
  process.exit(0);
}

let feed = { generatedAt: "" };
try { feed = JSON.parse(await readFile(outputFiles[0], "utf8")); } catch {}
let changed = false;
const observedAt = new Date().toISOString();

async function fetchJson(url, provider) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${provider} HTTP ${response.status}`);
  return response.json();
}

if (openWeatherKey) {
  try {
    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.search = new URLSearchParams({ lat: "13.7563", lon: "100.5018", units: "metric", lang: "th", appid: openWeatherKey });
    const data = await fetchJson(url, "OpenWeather");
    feed.weather = { status: "ready", temperatureC: Number(data.main?.temp ?? 0), feelsLikeC: Number(data.main?.feels_like ?? 0), rainMm: Number(data.rain?.["1h"] ?? data.rain?.["3h"] ?? 0), description: String(data.weather?.[0]?.description || "ไม่ทราบสภาพอากาศ"), observedAt };
    changed = true;
  } catch (error) {
    console.warn(`OpenWeather skipped; last good data retained: ${error.message}`);
  }
}

if (tomTomKey) {
  try {
    const url = new URL("https://api.tomtom.com/traffic/services/5/incidentDetails");
    url.search = new URLSearchParams({ key: tomTomKey, bbox: "100.30,13.45,100.95,14.05", language: "th-TH", timeValidityFilter: "present", fields: "{incidents{type,properties{iconCategory,magnitudeOfDelay,events{description},from,to,delay}}}" });
    const data = await fetchJson(url, "TomTom");
    const incidents = Array.isArray(data.incidents) ? data.incidents : [];
    const severeCount = incidents.filter((incident) => Number(incident.properties?.magnitudeOfDelay ?? 0) >= 3).length;
    feed.traffic = { status: "ready", incidentCount: incidents.length, severeCount, summary: severeCount ? `มีเหตุจราจรรุนแรง ${severeCount} จุด` : incidents.length ? "พบเหตุบนถนน แต่ยังไม่รุนแรง" : "ไม่พบเหตุจราจรสำคัญ", observedAt };
    changed = true;
  } catch (error) {
    console.warn(`TomTom skipped; last good data retained: ${error.message}`);
  }
}

if (!changed) {
  console.log("No provider returned new data; keeping the last good feed.");
  process.exit(0);
}

feed.generatedAt = observedAt;
delete feed.note;
const body = `${JSON.stringify(feed, null, 2)}\n`;
await Promise.all(outputFiles.map((file) => writeFile(file, body)));
console.log("Hourly environment feed updated.");
