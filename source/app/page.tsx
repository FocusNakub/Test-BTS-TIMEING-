"use client";

import { useEffect, useMemo, useState } from "react";

type RailLine = {
  id: string;
  short: string;
  name: string;
  color: string;
  soft: string;
  terminalA: string;
  terminalB: string;
  cars: number;
  stations: string[];
};

type RouteNode = { id: string; lineId: string; station: string; stationIndex: number };
type RouteEdge = { to: string; transfer: boolean };
type RoutePreference = "fastest" | "cheapest" | "fewest-transfers";
type RoutePlan = {
  nodes: RouteNode[];
  stations: number;
  transfers: number;
  fare: number;
  duration: number;
  segments: { line: RailLine; from: string; to: string; stations: number }[];
};

type ServiceAlert = {
  lineId: string;
  affectedArea: string;
  summary: string;
  delayMinutes?: [number, number];
  updatedAt: string;
  sourceName: string;
  sourceUrl: string;
};

type ServiceAlertFeed = {
  alerts: ServiceAlert[];
  generatedAt: string;
  crowdReports?: CrowdReport[];
};

type CrowdReport = {
  id: string;
  lineId: string;
  station: string;
  direction: -1 | 1 | null;
  level: 1 | 2 | 3;
  summary: string;
  reportedAt: string;
  expiresAt: string;
  sourceName: string;
  sourceUrl: string;
};

const railLines: RailLine[] = [
  {
    id: "bts-sukhumvit", short: "BTS", name: "สายสุขุมวิท", color: "#5fbf4a", soft: "#e9f7e6",
    terminalA: "คูคต", terminalB: "เคหะฯ", cars: 4,
    stations: ["คูคต", "แยก คปอ.", "พิพิธภัณฑ์กองทัพอากาศ", "โรงพยาบาลภูมิพลอดุลยเดช", "สะพานใหม่", "สายหยุด", "พหลโยธิน 59", "วัดพระศรีมหาธาตุ", "กรมทหารราบที่ 11", "บางบัว", "กรมป่าไม้", "มหาวิทยาลัยเกษตรศาสตร์", "เสนานิคม", "รัชโยธิน", "พหลโยธิน 24", "ห้าแยกลาดพร้าว", "หมอชิต", "สะพานควาย", "อารีย์", "สนามเป้า", "อนุสาวรีย์ชัยสมรภูมิ", "พญาไท", "ราชเทวี", "สยาม", "ชิดลม", "เพลินจิต", "นานา", "อโศก", "พร้อมพงษ์", "ทองหล่อ", "เอกมัย", "พระโขนง", "อ่อนนุช", "บางจาก", "ปุณณวิถี", "อุดมสุข", "บางนา", "แบริ่ง", "สำโรง", "ปู่เจ้า", "ช้างเอราวัณ", "โรงเรียนนายเรือ", "ปากน้ำ", "ศรีนครินทร์", "แพรกษา", "สายลวด", "เคหะฯ"]
  },
  {
    id: "bts-silom", short: "BTS", name: "สายสีลม", color: "#157a3d", soft: "#e2f3e8",
    terminalA: "สนามกีฬาแห่งชาติ", terminalB: "บางหว้า", cars: 4,
    stations: ["สนามกีฬาแห่งชาติ", "สยาม", "ราชดำริ", "ศาลาแดง", "ช่องนนทรี", "เซนต์หลุยส์", "สุรศักดิ์", "สะพานตากสิน", "กรุงธนบุรี", "วงเวียนใหญ่", "โพธิ์นิมิตร", "ตลาดพลู", "วุฒากาศ", "บางหว้า"]
  },
  {
    id: "gold", short: "G", name: "สายสีทอง", color: "#b79a5b", soft: "#f6f0df",
    terminalA: "กรุงธนบุรี", terminalB: "คลองสาน", cars: 2,
    stations: ["กรุงธนบุรี", "เจริญนคร", "คลองสาน"]
  },
  {
    id: "mrt-blue", short: "BL", name: "MRT สีน้ำเงิน", color: "#1f5da9", soft: "#e4eefb",
    terminalA: "หลักสอง", terminalB: "ท่าพระ", cars: 3,
    stations: ["หลักสอง", "บางแค", "ภาษีเจริญ", "เพชรเกษม 48", "บางหว้า", "บางไผ่", "ท่าพระ", "จรัญฯ 13", "ไฟฉาย", "บางขุนนนท์", "บางยี่ขัน", "สิรินธร", "บางพลัด", "บางอ้อ", "บางโพ", "เตาปูน", "บางซื่อ", "กำแพงเพชร", "สวนจตุจักร", "พหลโยธิน", "ลาดพร้าว", "รัชดาภิเษก", "สุทธิสาร", "ห้วยขวาง", "ศูนย์วัฒนธรรมฯ", "พระราม 9", "เพชรบุรี", "สุขุมวิท", "ศูนย์การประชุมฯ", "คลองเตย", "ลุมพินี", "สีลม", "สามย่าน", "หัวลำโพง", "วัดมังกร", "สามยอด", "สนามไชย", "อิสรภาพ"]
  },
  {
    id: "mrt-purple", short: "PP", name: "MRT สีม่วง", color: "#7c3f98", soft: "#f0e6f5",
    terminalA: "คลองบางไผ่", terminalB: "เตาปูน", cars: 3,
    stations: ["คลองบางไผ่", "ตลาดบางใหญ่", "สามแยกบางใหญ่", "บางพลู", "บางรักใหญ่", "บางรักน้อยท่าอิฐ", "ไทรม้า", "สะพานพระนั่งเกล้า", "แยกนนทบุรี 1", "บางกระสอ", "ศูนย์ราชการนนทบุรี", "กระทรวงสาธารณสุข", "แยกติวานนท์", "วงศ์สว่าง", "บางซ่อน", "เตาปูน"]
  },
  {
    id: "mrt-yellow", short: "YL", name: "MRT สีเหลือง", color: "#e0b900", soft: "#fff7d6",
    terminalA: "ลาดพร้าว", terminalB: "สำโรง", cars: 4,
    stations: ["ลาดพร้าว", "ภาวนา", "โชคชัย 4", "ลาดพร้าว 71", "ลาดพร้าว 83", "มหาดไทย", "ลาดพร้าว 101", "บางกะปิ", "แยกลำสาลี", "ศรีกรีฑา", "หัวหมาก", "กลันตัน", "ศรีนุช", "ศรีนครินทร์ 38", "สวนหลวง ร.9", "ศรีอุดม", "ศรีเอี่ยม", "ศรีลาซาล", "ศรีแบริ่ง", "ศรีด่าน", "ศรีเทพา", "ทิพวัล", "สำโรง"]
  },
  {
    id: "mrt-pink", short: "PK", name: "MRT สีชมพู", color: "#ec75a6", soft: "#fde9f1",
    terminalA: "ศูนย์ราชการนนทบุรี", terminalB: "มีนบุรี", cars: 4,
    stations: ["ศูนย์ราชการนนทบุรี", "แคราย", "สนามบินน้ำ", "สามัคคี", "กรมชลประทาน", "แยกปากเกร็ด", "เลี่ยงเมืองปากเกร็ด", "แจ้งวัฒนะ-ปากเกร็ด 28", "ศรีรัช", "เมืองทองธานี", "แจ้งวัฒนะ 14", "ศูนย์ราชการเฉลิมพระเกียรติ", "ทีโอที", "หลักสี่", "ราชภัฏพระนคร", "วัดพระศรีมหาธาตุ", "รามอินทรา 3", "ลาดปลาเค้า", "รามอินทรา กม.4", "มัยลาภ", "วัชรพล", "รามอินทรา กม.6", "คู้บอน", "รามอินทรา กม.9", "วงแหวนรามอินทรา", "นพรัตนราชธานี", "บางชัน", "เศรษฐบุตรบำเพ็ญ", "ตลาดมีนบุรี", "มีนบุรี"]
  },
  {
    id: "red-dark", short: "RN", name: "สายสีแดงเข้ม", color: "#b12631", soft: "#f9e5e7",
    terminalA: "กรุงเทพอภิวัฒน์", terminalB: "รังสิต", cars: 6,
    stations: ["กรุงเทพอภิวัฒน์", "จตุจักร", "วัดเสมียนนารี", "บางเขน", "ทุ่งสองห้อง", "หลักสี่", "การเคหะ", "ดอนเมือง", "หลักหก", "รังสิต"]
  },
  {
    id: "red-light", short: "RW", name: "สายสีแดงอ่อน", color: "#db5964", soft: "#fdebed",
    terminalA: "กรุงเทพอภิวัฒน์", terminalB: "ตลิ่งชัน", cars: 6,
    stations: ["กรุงเทพอภิวัฒน์", "บางซ่อน", "บางบำหรุ", "ตลิ่งชัน"]
  },
  {
    id: "arl", short: "ARL", name: "Airport Rail Link", color: "#7b202b", soft: "#f5e4e7",
    terminalA: "พญาไท", terminalB: "สุวรรณภูมิ", cars: 4,
    stations: ["พญาไท", "ราชปรารภ", "มักกะสัน", "รามคำแหง", "หัวหมาก", "บ้านทับช้าง", "ลาดกระบัง", "สุวรรณภูมิ"]
  }
];

const routeNodes = railLines.flatMap((routeLine) => routeLine.stations.map((routeStation, stationIndex) => ({
  id: `${routeLine.id}:${stationIndex}`,
  lineId: routeLine.id,
  station: routeStation,
  stationIndex,
})));

const explicitInterchanges = [
  [["bts-sukhumvit", "อโศก"], ["mrt-blue", "สุขุมวิท"]],
  [["bts-sukhumvit", "หมอชิต"], ["mrt-blue", "สวนจตุจักร"]],
  [["bts-silom", "ศาลาแดง"], ["mrt-blue", "สีลม"]],
  [["bts-sukhumvit", "ห้าแยกลาดพร้าว"], ["mrt-blue", "พหลโยธิน"]],
  [["mrt-blue", "เพชรบุรี"], ["arl", "มักกะสัน"]],
  [["mrt-blue", "บางซื่อ"], ["red-dark", "กรุงเทพอภิวัฒน์"]],
  [["mrt-blue", "บางซื่อ"], ["red-light", "กรุงเทพอภิวัฒน์"]],
] as const;

function stationNodeId(lineId: string, stationName: string) {
  const routeLine = railLines.find((item) => item.id === lineId);
  const index = routeLine?.stations.indexOf(stationName) ?? -1;
  return index >= 0 ? `${lineId}:${index}` : "";
}

function routeGraph() {
  const graph = new Map<string, RouteEdge[]>();
  const connect = (from: string, to: string, transfer: boolean) => {
    if (!from || !to) return;
    graph.set(from, [...(graph.get(from) ?? []), { to, transfer }]);
  };
  railLines.forEach((routeLine) => routeLine.stations.forEach((_, index) => {
    const current = `${routeLine.id}:${index}`;
    if (index > 0) connect(current, `${routeLine.id}:${index - 1}`, false);
    if (index < routeLine.stations.length - 1) connect(current, `${routeLine.id}:${index + 1}`, false);
  }));
  const sameName = new Map<string, string[]>();
  routeNodes.forEach((node) => sameName.set(node.station, [...(sameName.get(node.station) ?? []), node.id]));
  sameName.forEach((ids) => ids.forEach((from) => ids.forEach((to) => from !== to && connect(from, to, true))));
  explicitInterchanges.forEach(([a, b]) => {
    const from = stationNodeId(a[0], a[1]);
    const to = stationNodeId(b[0], b[1]);
    connect(from, to, true);
    connect(to, from, true);
  });
  return graph;
}

const plannerGraph = routeGraph();

function operatorGroup(lineId: string) {
  if (lineId.startsWith("bts-")) return "bts";
  if (lineId === "mrt-blue" || lineId === "mrt-purple") return "bem";
  if (lineId === "mrt-yellow" || lineId === "mrt-pink") return "monorail";
  if (lineId.startsWith("red-")) return "red";
  return lineId;
}

function estimateSegmentFare(group: string, stations: number) {
  if (group === "bts") return Math.min(65, 17 + Math.max(0, stations - 1) * 3);
  if (group === "gold") return 16;
  if (group === "bem") return Math.min(45, 17 + stations * 2);
  if (group === "monorail") return Math.min(45, 15 + stations * 3);
  if (group === "red") return Math.min(42, 12 + stations * 4);
  if (group === "arl") return Math.min(45, 15 + stations * 5);
  return 0;
}

function averageMinutesPerStation(lineId: string) {
  if (lineId === "arl") return 4.5;
  if (lineId.startsWith("red-")) return 3.2;
  if (lineId === "mrt-blue" || lineId === "mrt-purple") return 2.5;
  if (lineId === "mrt-yellow" || lineId === "mrt-pink") return 2.3;
  if (lineId === "gold") return 2.5;
  return 2.1;
}

function fareEntry(group: string) {
  return ({ bts: 17, gold: 16, bem: 17, monorail: 15, red: 12, arl: 15 } as Record<string, number>)[group] ?? 0;
}

function farePerStation(group: string) {
  return ({ bts: 3, gold: 0.5, bem: 2, monorail: 3, red: 4, arl: 5 } as Record<string, number>)[group] ?? 1;
}

function routeEdgeScore(fromId: string, edge: RouteEdge, preference: RoutePreference) {
  const from = routeNodes.find((node) => node.id === fromId)!;
  const to = routeNodes.find((node) => node.id === edge.to)!;
  const fromGroup = operatorGroup(from.lineId);
  const toGroup = operatorGroup(to.lineId);
  if (preference === "fewest-transfers") return edge.transfer ? 1000 : averageMinutesPerStation(from.lineId);
  if (preference === "cheapest") {
    if (edge.transfer) return fromGroup === toGroup ? 0.1 : fareEntry(toGroup);
    return farePerStation(fromGroup) + averageMinutesPerStation(from.lineId) / 100;
  }
  return edge.transfer ? 7 : averageMinutesPerStation(from.lineId);
}

function planRoute(startId: string, endId: string, preference: RoutePreference): RoutePlan | null {
  if (startId === endId) return null;
  const best = new Map<string, number>([[startId, 0]]);
  const previous = new Map<string, { id: string; transfer: boolean }>();
  const queue = [{ id: startId, score: 0 }];
  while (queue.length) {
    queue.sort((a, b) => a.score - b.score);
    const current = queue.shift()!;
    if (current.id === endId) break;
    if (current.score !== best.get(current.id)) continue;
    for (const edge of plannerGraph.get(current.id) ?? []) {
      const score = current.score + routeEdgeScore(current.id, edge, preference);
      if (score < (best.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        best.set(edge.to, score);
        previous.set(edge.to, { id: current.id, transfer: edge.transfer });
        queue.push({ id: edge.to, score });
      }
    }
  }
  if (!previous.has(endId)) return null;
  const ids = [endId];
  let cursor = endId;
  while (cursor !== startId) {
    cursor = previous.get(cursor)!.id;
    ids.unshift(cursor);
  }
  const nodes = ids.map((id) => routeNodes.find((node) => node.id === id)!).filter(Boolean);
  const segments: RoutePlan["segments"] = [];
  let stations = 0;
  let transfers = 0;
  let duration = 0;
  nodes.forEach((node, index) => {
    if (index === 0) return;
    const prior = nodes[index - 1];
    if (prior.lineId !== node.lineId) {
      transfers += 1;
      duration += 7;
      return;
    }
    stations += 1;
    duration += averageMinutesPerStation(prior.lineId);
    const last = segments[segments.length - 1];
    if (last?.line.id === node.lineId) {
      last.to = node.station;
      last.stations += 1;
    } else {
      segments.push({ line: railLines.find((item) => item.id === node.lineId)!, from: prior.station, to: node.station, stations: 1 });
    }
  });
  let fare = 0;
  let activeGroup = "";
  let groupStations = 0;
  segments.forEach((segment, index) => {
    const group = operatorGroup(segment.line.id);
    if (activeGroup && group !== activeGroup) {
      fare += estimateSegmentFare(activeGroup, groupStations);
      groupStations = 0;
    }
    activeGroup = group;
    groupStations += segment.stations;
    if (index === segments.length - 1) fare += estimateSegmentFare(activeGroup, groupStations);
  });
  return { nodes, stations, transfers, fare, duration: Math.ceil(duration), segments };
}

const interchangeStations = new Set(["สยาม", "อโศก", "สุขุมวิท", "หมอชิต", "สวนจตุจักร", "ศาลาแดง", "สีลม", "บางหว้า", "พญาไท", "สำโรง", "วัดพระศรีมหาธาตุ", "เตาปูน", "ท่าพระ", "หลักสี่", "หัวหมาก", "มักกะสัน", "กรุงธนบุรี", "กรุงเทพอภิวัฒน์", "บางซ่อน", "ลาดพร้าว", "ห้าแยกลาดพร้าว", "พหลโยธิน", "ศูนย์ราชการนนทบุรี"]);

const officeStations = new Set(["อารีย์", "สนามเป้า", "อนุสาวรีย์ชัยสมรภูมิ", "ชิดลม", "เพลินจิต", "อโศก", "นานา", "ศาลาแดง", "ช่องนนทรี", "เซนต์หลุยส์", "สุรศักดิ์", "สุขุมวิท", "พระราม 9", "เพชรบุรี", "ศูนย์การประชุมฯ", "ลุมพินี", "สีลม", "สามย่าน", "ศูนย์ราชการนนทบุรี", "ศูนย์ราชการเฉลิมพระเกียรติ", "ทีโอที"]);
const shoppingStations = new Set(["สยาม", "สนามกีฬาแห่งชาติ", "ราชเทวี", "ชิดลม", "พร้อมพงษ์", "ทองหล่อ", "เอกมัย", "ห้าแยกลาดพร้าว", "พหลโยธิน", "พระราม 9", "ศูนย์วัฒนธรรมฯ", "สามย่าน", "วัดมังกร", "เจริญนคร", "ตลาดบางใหญ่", "บางกะปิ", "แยกปากเกร็ด", "เมืองทองธานี"]);
const residentialGateways = new Set(["คูคต", "สะพานใหม่", "มหาวิทยาลัยเกษตรศาสตร์", "หมอชิต", "อ่อนนุช", "อุดมสุข", "สำโรง", "เคหะฯ", "บางหว้า", "หลักสอง", "คลองบางไผ่", "ตลาดบางใหญ่", "ลาดพร้าว", "มีนบุรี", "รังสิต", "ดอนเมือง", "ตลิ่งชัน", "ลาดกระบัง"]);
const nightlifeStations = new Set(["นานา", "อโศก", "พร้อมพงษ์", "ทองหล่อ", "เอกมัย", "ศาลาแดง", "สีลม", "สามย่าน", "พระราม 9", "รัชดาภิเษก", "ห้วยขวาง"]);
const eventStations = new Set(["สนามกีฬาแห่งชาติ", "เมืองทองธานี", "สวนจตุจักร", "หมอชิต", "ศูนย์การประชุมฯ", "ราชมังคลาฯ", "รามคำแหง"]);

const alertFeedUrl = process.env.NEXT_PUBLIC_ALERT_FEED_URL || "/api/service-alerts";

const operatorSources: Record<string, { name: string; url: string }> = {
  "bts-sukhumvit": { name: "BTS SkyTrain", url: "https://www.facebook.com/BTSSkyTrain/" },
  "bts-silom": { name: "BTS SkyTrain", url: "https://www.facebook.com/BTSSkyTrain/" },
  gold: { name: "BTS SkyTrain", url: "https://www.facebook.com/BTSSkyTrain/" },
  "mrt-yellow": { name: "BTS SkyTrain", url: "https://www.facebook.com/BTSSkyTrain/" },
  "mrt-pink": { name: "BTS SkyTrain", url: "https://www.facebook.com/BTSSkyTrain/" },
  "mrt-blue": { name: "BEM MRT", url: "https://metro.bemplc.co.th/" },
  "mrt-purple": { name: "BEM MRT", url: "https://metro.bemplc.co.th/" },
  "red-dark": { name: "รถไฟฟ้าสายสีแดง", url: "https://www.srtet.co.th/" },
  "red-light": { name: "รถไฟฟ้าสายสีแดง", url: "https://www.srtet.co.th/" },
  arl: { name: "Airport Rail Link", url: "https://www.srtet.co.th/" },
};

function simpleHash(text: string) {
  let hash = 7;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

type FrequencyInfo = {
  seconds: number;
  periodLabel: string;
  sourceLabel: string;
  sourceUrl?: string;
  official: boolean;
};

const frequencySources = {
  green: "https://www.ebm.co.th/cms-routemap/WareHouse/TimeTable/GreenLine.pdf",
  gold: "https://www.bts.co.th/pdf/timetable_Gold_1JUL22.pdf",
  bem: "https://metro.bemplc.co.th/MRT-System-Map?lang=th",
  yellow: "https://www.ebm.co.th/cms-routemap/WareHouse/TimeTable/YellowLine.pdf",
  pink: "https://www.ebm.co.th/cms-routemap/WareHouse/TimeTable/PinkLine.pdf",
  red: "https://www.srtet.co.th/en/fare-timetable",
};

function band(hour: number, start: number, end: number) {
  return hour >= start && hour < end;
}

function frequencyInfo(seconds: number, periodLabel: string, sourceLabel: string, sourceUrl?: string, official = true): FrequencyInfo {
  return { seconds, periodLabel, sourceLabel, sourceUrl, official };
}

function serviceHours(line: RailLine, date: Date) {
  const weekday = date.getDay() > 0 && date.getDay() < 6;

  if (line.id === "bts-sukhumvit" || line.id === "bts-silom") {
    return { opensAt: 5 * 60 + 15, closesAt: 24 * 60 + 15, source: frequencySources.green };
  }
  if (line.id === "mrt-purple") {
    return { opensAt: weekday ? 5 * 60 + 30 : 6 * 60, closesAt: 24 * 60, source: frequencySources.bem };
  }
  if (line.id === "mrt-yellow") {
    return { opensAt: 5 * 60 + 30, closesAt: 24 * 60, source: frequencySources.yellow };
  }
  if (line.id === "mrt-pink") {
    return { opensAt: 5 * 60 + 24, closesAt: 24 * 60, source: frequencySources.pink };
  }
  if (line.id === "red-dark" || line.id === "red-light") {
    return { opensAt: 5 * 60, closesAt: 24 * 60, source: frequencySources.red };
  }
  if (line.id === "arl") {
    return { opensAt: 5 * 60 + 30, closesAt: 24 * 60, source: operatorSources.arl.url };
  }
  return { opensAt: 6 * 60, closesAt: 24 * 60, source: line.id === "gold" ? frequencySources.gold : frequencySources.bem };
}

function isOutsideServiceHours(line: RailLine, date: Date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const hours = serviceHours(line, date);
  const afterMidnightEnd = hours.closesAt - 24 * 60;
  const insideAfterMidnight = hours.closesAt > 24 * 60 && minutes < afterMidnightEnd;
  return !insideAfterMidnight && (minutes < hours.opensAt || minutes >= Math.min(hours.closesAt, 24 * 60));
}

function formatClock(minutes: number) {
  const normalized = minutes % (24 * 60);
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function getFrequency(line: RailLine, station: string, date: Date): FrequencyInfo {
  const hour = date.getHours() + date.getMinutes() / 60;
  const weekday = date.getDay() > 0 && date.getDay() < 6;
  const official = (seconds: number, label: string, sourceLabel: string, sourceUrl: string) => frequencyInfo(seconds, label, sourceLabel, sourceUrl);

  if (line.id === "bts-sukhumvit") {
    const stationIndex = line.stations.indexOf(station);
    const central = stationIndex >= line.stations.indexOf("หมอชิต") && stationIndex <= line.stations.indexOf("สำโรง");
    const segment = central ? "ช่วงหมอชิต–สำโรง" : "ช่วงส่วนต่อขยาย";
    if (weekday) {
      if (band(hour, 7, 9) || band(hour, 17, 20)) return official(central ? 150 : 300, `${segment} · ชั่วโมงเร่งด่วน`, "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
      if (band(hour, 9, 9.5) || band(hour, 16, 17) || band(hour, 20, 21)) return official(300, `${segment} · ช่วงเปลี่ยนความถี่`, "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
      if (band(hour, 22, 24) || hour < 6) return official(480, `${segment} · ช่วงดึก`, "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
      return official(360, `${segment} · ชั่วโมงปกติ`, "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
    }
    if (band(hour, 6, 8) || band(hour, 21, 22)) return official(420, `${segment} · วันหยุด`, "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
    if (band(hour, 8, 11)) return official(355, `${segment} · วันหยุด`, "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
    if (band(hour, 11, 21)) return official(central ? 270 : 360, `${segment} · วันหยุด`, "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
    return official(480, `${segment} · วันหยุดช่วงดึก`, "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
  }

  if (line.id === "bts-silom") {
    if (weekday) {
      if (band(hour, 7, 9) || band(hour, 17, 20)) return official(225, "ชั่วโมงเร่งด่วน", "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
      if (band(hour, 9, 9.5)) return official(300, "ช่วงหลังเร่งด่วนเช้า", "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
      if (band(hour, 16, 17)) return official(390, "ช่วงก่อนเร่งด่วนเย็น", "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
      if (band(hour, 22, 24) || hour < 6) return official(480, "ช่วงดึก", "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
      return official(360, "ชั่วโมงปกติ", "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
    }
    if (band(hour, 6, 9) || band(hour, 21, 22)) return official(420, "วันหยุด", "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
    if (band(hour, 9, 21)) return official(360, "วันหยุด", "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
    return official(480, "วันหยุดช่วงดึก", "ตาราง BTS มีผล 1 ม.ค. 2569", frequencySources.green);
  }

  if (line.id === "gold") {
    if (band(hour, 11, 22)) return official(900, "11:00–22:00", "ตาราง BTS สายสีทอง", frequencySources.gold);
    return official(1200, hour < 11 ? "06:00–11:00" : "22:00–24:00", "ตาราง BTS สายสีทอง", frequencySources.gold);
  }

  if (line.id === "mrt-blue") {
    const peak = weekday && (band(hour, 7, 9) || band(hour, 16.5, 19.5));
    return official(peak ? 240 : 420, peak ? "ชั่วโมงเร่งด่วน" : "ชั่วโมงปกติ", "ข้อมูลระบบ BEM MRT", frequencySources.bem);
  }

  if (line.id === "mrt-purple") {
    const peak = weekday && (band(hour, 6.5, 8.5) || band(hour, 17, 19.5));
    return official(peak ? 360 : 540, peak ? "ชั่วโมงเร่งด่วน" : "ชั่วโมงปกติ", "ข้อมูลระบบ BEM MRT", frequencySources.bem);
  }

  if (line.id === "mrt-yellow") {
    const peak = weekday && (band(hour, 7, 9) || band(hour, 17, 20));
    return official(peak ? 300 : 600, peak ? "ชั่วโมงเร่งด่วน" : weekday ? "ชั่วโมงปกติ" : "วันหยุด", "ตาราง EBM สายสีเหลือง", frequencySources.yellow);
  }

  if (line.id === "mrt-pink") {
    const peak = weekday && (band(hour, 6.5, 8.5) || band(hour, 16.5, 19.5));
    return official(peak ? 300 : 600, peak ? "ชั่วโมงเร่งด่วน" : weekday ? "ชั่วโมงปกติ" : "วันหยุด", "ตาราง NBM มีผล 1 ก.ย. 2568", frequencySources.pink);
  }

  if (line.id === "red-dark") {
    const peak = weekday && (band(hour, 7, 9.5) || band(hour, 17, 19.5));
    return official(peak ? 600 : 900, peak ? "ช่วงตามตารางทุก 10 นาที" : "ช่วงตามตารางทุก 15 นาที", "ตารางรถไฟฟ้าสายสีแดง", frequencySources.red);
  }

  if (line.id === "red-light") return official(1200, "ตามตารางทุก 20 นาที", "ตารางรถไฟฟ้าสายสีแดง", frequencySources.red);

  const arlPeak = weekday && (band(hour, 6, 9) || band(hour, 16, 20));
  return frequencyInfo(arlPeak ? 600 : 900, arlPeak ? "ช่วงเร่งด่วนโดยประมาณ" : "ช่วงปกติโดยประมาณ", "ยังไม่พบตารางความถี่ทางการที่นำมาใช้ได้", undefined, false);
}

function getArrival(line: RailLine, station: string, direction: number, date: Date) {
  const frequency = getFrequency(line, station, date).seconds;
  const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const offset = simpleHash(`${line.id}-${station}-${direction}-${dayKey}`) % frequency;
  const secondsNow = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  const period = frequency;
  let slot = Math.ceil((secondsNow + offset) / period);
  let remaining = slot * period - (secondsNow + offset);
  if (remaining <= 0) {
    slot += 1;
    remaining = period;
  }
  return { remaining, slot };
}

function formatCountdown(totalSeconds: number) {
  if (totalSeconds < 60) return `${Math.max(1, Math.ceil(totalSeconds))} วิ`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatInterval(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes} นาที ${String(seconds).padStart(2, "0")} วินาที` : `${minutes} นาที`;
}

function getCrowd(line: RailLine, station: string, car: number, date: Date) {
  const hour = date.getHours() + date.getMinutes() / 60;
  const weekday = date.getDay() > 0 && date.getDay() < 6;
  const morningRush = weekday && hour >= 6.5 && hour < 9.5;
  const eveningRush = weekday && hour >= 16.5 && hour < 20;
  const rush = morningRush || eveningRush;
  const lateNight = hour >= 22 || hour < 6;
  const weekendDay = !weekday && hour >= 10 && hour < 21;
  const base = rush ? 55 : lateNight ? 19 : weekendDay ? 38 : hour >= 10 && hour < 16 ? 33 : 39;
  const lineWeight = line.id === "bts-sukhumvit" ? 5 : line.id === "bts-silom" || line.id === "mrt-blue" ? 3 : line.id === "gold" ? -6 : ["mrt-purple", "mrt-yellow", "mrt-pink", "red-dark", "red-light"].includes(line.id) ? -3 : -1;
  const hub = interchangeStations.has(station) ? (rush ? 14 : 8) : 0;
  const office = officeStations.has(station) ? (morningRush ? 10 : eveningRush ? 8 : weekday && hour >= 9 && hour < 18 ? 4 : 0) : 0;
  const shopping = shoppingStations.has(station) ? ((!weekday && hour >= 11 && hour < 21) || (weekday && hour >= 17 && hour < 21) ? 9 : 2) : 0;
  const residential = residentialGateways.has(station) && rush ? 7 : 0;
  const nightlife = nightlifeStations.has(station) && hour >= 19 && hour < 23.5 ? 7 : 0;
  const event = eventStations.has(station) && !weekday && hour >= 10 && hour < 22 ? 5 : 0;
  const shape = [7, -4, 2, 10, -2, 5][car % 6];
  const variation = (simpleHash(`${line.id}-${station}-${car}-${date.getDay()}-${date.getHours()}`) % 9) - 4;
  return Math.max(10, Math.min(96, base + lineWeight + hub + office + shopping + residential + nightlife + event + shape + variation));
}

function crowdReportBoost(line: RailLine, station: string, direction: number, queueIndex: number, reports: CrowdReport[], date: Date) {
  const targetIndex = line.stations.indexOf(station);
  return reports.reduce((strongest, report) => {
    if (report.lineId !== line.id || (report.direction != null && report.direction !== direction)) return strongest;
    const sourceIndex = line.stations.indexOf(report.station);
    if (sourceIndex < 0 || targetIndex < 0) return strongest;
    const distance = direction === 1 ? targetIndex - sourceIndex : sourceIndex - targetIndex;
    if (distance < 0 || distance > 7) return strongest;
    const ageMinutes = Math.max(0, (date.getTime() - new Date(report.reportedAt).getTime()) / 60000);
    if (!Number.isFinite(ageMinutes) || ageMinutes > 60 || new Date(report.expiresAt).getTime() <= date.getTime()) return strongest;
    const levelBoost = report.level === 3 ? 30 : report.level === 2 ? 18 : 8;
    const timeDecay = Math.max(0.15, 1 - ageMinutes / 70);
    const distanceDecay = Math.pow(0.84, distance);
    const trainDecay = queueIndex === 0 ? 1 : 0.45;
    return Math.max(strongest, Math.round(levelBoost * timeDecay * distanceDecay * trainDecay));
  }, 0);
}

function getTrainCrowd(line: RailLine, station: string, car: number, date: Date, direction: number, slot: number, queueIndex: number, reports: CrowdReport[]) {
  const base = getCrowd(line, station, car, date);
  const trainVariation = (simpleHash(`${line.id}-${direction}-${slot}-${car}`) % 11) - 5;
  const reportBoost = crowdReportBoost(line, station, direction, queueIndex, reports, date);
  return Math.max(10, Math.min(96, base + trainVariation + reportBoost));
}

function getNextStationCrowd(line: RailLine, nextStation: string, current: number, car: number, date: Date, direction: number, slot: number, queueIndex: number, reports: CrowdReport[]) {
  const target = getTrainCrowd(line, nextStation, car, date, direction, slot, queueIndex, reports);
  const flow = (simpleHash(`${line.id}-${nextStation}-${direction}-${slot}-${date.getDay()}-${date.getHours()}`) % 7) - 3;
  return Math.max(10, Math.min(96, Math.round(current * 0.55 + target * 0.45 + flow)));
}

function trendLabel(current: number, next: number) {
  const difference = next - current;
  if (difference >= 3) return { symbol: "↑", text: "เพิ่ม", className: "up" };
  if (difference <= -3) return { symbol: "↓", text: "ลด", className: "down" };
  return { symbol: "→", text: "ใกล้เคียง", className: "steady" };
}

function crowdLabel(value: number) {
  if (value < 45) return "โล่ง";
  if (value < 72) return "ปานกลาง";
  return "หนาแน่น";
}

export default function Home() {
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [routeStart, setRouteStart] = useState(stationNodeId("bts-sukhumvit", "อโศก"));
  const [routeEnd, setRouteEnd] = useState(stationNodeId("arl", "สุวรรณภูมิ"));
  const [routePreference, setRoutePreference] = useState<RoutePreference>("fastest");
  const [lineId, setLineId] = useState("bts-sukhumvit");
  const [station, setStation] = useState("อโศก");
  const [now, setNow] = useState(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [alertFeed, setAlertFeed] = useState<ServiceAlertFeed>({ alerts: [], crowdReports: [], generatedAt: "" });
  const [alertStatus, setAlertStatus] = useState<"loading" | "ready" | "error">("loading");

  const line = railLines.find((item) => item.id === lineId) ?? railLines[0];
  const stationIndex = Math.max(0, line.stations.indexOf(station));
  const favoriteKey = `${line.id}|${station}`;
  const isFavorite = favorites.includes(favoriteKey);

  useEffect(() => {
    const saved = localStorage.getItem("bangkok-rail-selection");
    const savedFavorites = localStorage.getItem("bangkok-rail-favorites");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const savedLine = railLines.find((item) => item.id === parsed.lineId);
        if (savedLine && savedLine.stations.includes(parsed.station)) {
          setLineId(parsed.lineId);
          setStation(parsed.station);
        }
      } catch {}
    }
    if (savedFavorites) {
      try { setFavorites(JSON.parse(savedFavorites)); } catch {}
    }
    setReady(true);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadAlerts() {
      try {
        const response = await fetch(`${alertFeedUrl}?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Alert feed HTTP ${response.status}`);
        const data = await response.json() as ServiceAlertFeed;
        if (active) {
          setAlertFeed({ alerts: Array.isArray(data.alerts) ? data.alerts : [], crowdReports: Array.isArray(data.crowdReports) ? data.crowdReports : [], generatedAt: data.generatedAt || "" });
          setAlertStatus("ready");
        }
      } catch {
        if (active) setAlertStatus("error");
      }
    }
    loadAlerts();
    const timer = window.setInterval(loadAlerts, 5 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("bangkok-rail-selection", JSON.stringify({ lineId, station }));
  }, [lineId, station, ready]);

  const filteredStations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? line.stations.filter((item) => item.toLowerCase().includes(normalized)) : line.stations;
  }, [line.stations, query]);

  const frequency = getFrequency(line, station, now);
  const serviceAlert = alertFeed.alerts.find((alert) => alert.lineId === line.id);
  const serviceClosed = isOutsideServiceHours(line, now);
  const serviceSuspended = Boolean(serviceAlert && /(งดให้บริการ|หยุดเดินรถ|หยุดให้บริการ|ปิดสถานี)/i.test(serviceAlert.summary));
  const trainsUnavailable = serviceClosed || serviceSuspended;
  const announcedFrequencyMinutes = serviceAlert?.delayMinutes && serviceAlert.summary.includes("ความถี่") ? serviceAlert.delayMinutes[0] : null;
  const announcedDelayMinutes = serviceAlert?.delayMinutes && !serviceAlert.summary.includes("ความถี่") ? serviceAlert.delayMinutes[1] : 0;
  const effectiveFrequency = announcedFrequencyMinutes
    ? frequencyInfo(announcedFrequencyMinutes * 60, `ตามประกาศเหตุขัดข้อง · ความถี่ประมาณ ${announcedFrequencyMinutes} นาที`, serviceAlert?.sourceName || "ประกาศล่าสุด", serviceAlert?.sourceUrl, false)
    : frequency;
  const directionTrips = [
    ...(stationIndex > 0 ? [{ direction: -1, directionKey: 0, destination: line.terminalA, nextStation: line.stations[stationIndex - 1], arrival: getArrival(line, station, 0, now) }] : []),
    ...(stationIndex < line.stations.length - 1 ? [{ direction: 1, directionKey: 1, destination: line.terminalB, nextStation: line.stations[stationIndex + 1], arrival: getArrival(line, station, 1, now) }] : []),
  ];
  const activeCrowdReports = (alertFeed.crowdReports ?? []).filter((report) => report.lineId === line.id && new Date(report.expiresAt).getTime() > now.getTime());
  const nearbyCrowdReport = activeCrowdReports
    .filter((report) => Math.abs(line.stations.indexOf(report.station) - stationIndex) <= 7)
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())[0];
  const operatorSource = operatorSources[line.id];
  const routePlan = useMemo(() => planRoute(routeStart, routeEnd, routePreference), [routeStart, routeEnd, routePreference]);

  function selectLine(nextLine: RailLine) {
    setLineId(nextLine.id);
    const remembered = localStorage.getItem(`bangkok-rail-station-${nextLine.id}`);
    setStation(remembered && nextLine.stations.includes(remembered) ? remembered : nextLine.stations[Math.floor(nextLine.stations.length / 2)]);
  }

  function selectStation(nextStation: string) {
    setStation(nextStation);
    localStorage.setItem(`bangkok-rail-station-${line.id}`, nextStation);
    setPickerOpen(false);
    setQuery("");
  }

  function toggleFavorite() {
    const next = isFavorite ? favorites.filter((item) => item !== favoriteKey) : [...favorites, favoriteKey];
    setFavorites(next);
    localStorage.setItem("bangkok-rail-favorites", JSON.stringify(next));
  }

  return (
    <main className="app-shell" style={{ "--line": line.color, "--line-soft": line.soft } as React.CSSProperties}>
      <div className="phone-frame">
        <header className="topbar">
          <div>
            <p className="eyebrow">BANGKOK RAIL · DAILY</p>
            <h1>{plannerOpen ? "วางแผนการเดินทาง" : "รถไฟขบวนถัดไป"}</h1>
          </div>
          <div className="clock" aria-label="เวลาปัจจุบัน">
            <strong>{now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</strong>
            <span>{now.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" })}</span>
          </div>
        </header>

        <nav className="line-strip" aria-label="เลือกสายรถไฟฟ้า">
          {railLines.map((item) => (
            <button
              key={item.id}
              className={`line-pill${item.id === line.id ? " active" : ""}${alertFeed.alerts.some((alert) => alert.lineId === item.id) ? " disrupted" : ""}`}
              onClick={() => selectLine(item)}
              aria-label={`${item.name}${alertFeed.alerts.some((alert) => alert.lineId === item.id) ? " มีเหตุขัดข้อง" : ""}`}
            >
              <span className="line-dot" style={{ background: item.color }}>{item.short}</span>
              <span>{item.name.replace("MRT ", "")}</span>
              {alertFeed.alerts.some((alert) => alert.lineId === item.id) && <b className="line-alert-dot" aria-hidden="true">!</b>}
            </button>
          ))}
        </nav>

        <div className="mode-switch" role="tablist" aria-label="เลือกหน้าการใช้งาน">
          <button className={!plannerOpen ? "active" : ""} onClick={() => setPlannerOpen(false)} role="tab" aria-selected={!plannerOpen}>ขบวนถัดไป</button>
          <button className={plannerOpen ? "active" : ""} onClick={() => setPlannerOpen(true)} role="tab" aria-selected={plannerOpen}>⇄ วางแผนเส้นทาง</button>
        </div>

        {plannerOpen && (
          <section className="route-planner" aria-label="วางแผนเส้นทางรถไฟฟ้า">
            <div className="planner-heading">
              <p className="eyebrow dark">ROUTE PLANNER</p>
              <h2>ไปไหนดี?</h2>
              <span>เลือกสถานีและสายให้ตรงกับจุดที่ขึ้นจริง</span>
            </div>
            <div className="route-fields">
              <label>
                <span>ต้นทาง</span>
                <select value={routeStart} onChange={(event) => setRouteStart(event.target.value)}>
                  {railLines.map((routeLine) => (
                    <optgroup key={routeLine.id} label={`${routeLine.short} · ${routeLine.name}`}>
                      {routeLine.stations.map((routeStation, index) => <option key={`${routeLine.id}:${index}`} value={`${routeLine.id}:${index}`}>{routeStation}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <button className="swap-route" onClick={() => { setRouteStart(routeEnd); setRouteEnd(routeStart); }} aria-label="สลับต้นทางและปลายทาง">⇅</button>
              <label>
                <span>ปลายทาง</span>
                <select value={routeEnd} onChange={(event) => setRouteEnd(event.target.value)}>
                  {railLines.map((routeLine) => (
                    <optgroup key={routeLine.id} label={`${routeLine.short} · ${routeLine.name}`}>
                      {routeLine.stations.map((routeStation, index) => <option key={`${routeLine.id}:${index}`} value={`${routeLine.id}:${index}`}>{routeStation}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>

            <div className="route-preferences" role="radiogroup" aria-label="รูปแบบเส้นทาง">
              <button className={routePreference === "fastest" ? "active" : ""} onClick={() => setRoutePreference("fastest")} role="radio" aria-checked={routePreference === "fastest"}>⚡ เร็วที่สุด</button>
              <button className={routePreference === "cheapest" ? "active" : ""} onClick={() => setRoutePreference("cheapest")} role="radio" aria-checked={routePreference === "cheapest"}>฿ ประหยัดที่สุด</button>
              <button className={routePreference === "fewest-transfers" ? "active" : ""} onClick={() => setRoutePreference("fewest-transfers")} role="radio" aria-checked={routePreference === "fewest-transfers"}>⇄ เปลี่ยนน้อยสุด</button>
            </div>

            {routePlan ? (
              <div className="route-result" aria-live="polite">
                <div className="route-summary">
                  <div><small>ค่าโดยสารประมาณ</small><strong>฿{routePlan.fare}</strong></div>
                  <div><small>เวลาโดยประมาณ</small><strong>{routePlan.duration}<em> นาที</em></strong></div>
                  <div><small>จำนวนสถานี</small><strong>{routePlan.stations}</strong></div>
                  <div><small>เปลี่ยนสาย</small><strong>{routePlan.transfers}</strong></div>
                </div>
                <div className="route-steps">
                  {routePlan.segments.map((segment, index) => (
                    <article key={`${segment.line.id}-${index}`}>
                      <i style={{ background: segment.line.color }}>{segment.line.short}</i>
                      <div>
                        <small>{segment.line.name} · {segment.stations} สถานี</small>
                        <strong>{segment.from} → {segment.to}</strong>
                        {index < routePlan.segments.length - 1 && <span>เปลี่ยนเป็น {routePlan.segments[index + 1].line.name}</span>}
                      </div>
                    </article>
                  ))}
                </div>
                <p className="fare-note">ค่าโดยสารเป็นค่าประมาณสำหรับผู้ใหญ่แบบเที่ยวเดียว อาจต่างจากราคาจริงเมื่อใช้บัตร โปรโมชั่น ค่าแรกเข้า หรือเดินทางข้ามผู้ให้บริการ โปรดตรวจราคาที่เครื่องจำหน่ายบัตรก่อนเดินทาง</p>
              </div>
            ) : (
              <div className="route-empty">กรุณาเลือกต้นทางและปลายทางคนละสถานี</div>
            )}
          </section>
        )}

        <section className="station-hero">
          <div className="status-row">
            <span className="network-badge"><i />{line.short} · {line.name}</span>
            <span className={serviceAlert ? "estimate-badge disrupted" : "estimate-badge"}>
              {serviceAlert ? "มีเหตุขัดข้อง" : "ค่าประมาณ"}
            </span>
          </div>
          <button className="station-button" onClick={() => setPickerOpen(true)} aria-haspopup="dialog">
            <span>
              <small>กำลังดูสถานี</small>
              <strong>{station}</strong>
            </span>
            <span className="chevron">⌄</span>
          </button>
          <div className="station-actions">
            <button onClick={toggleFavorite} className={isFavorite ? "mini-action saved" : "mini-action"}>
              {isFavorite ? "★ ปักหมุดแล้ว" : "☆ ปักหมุดสถานี"}
            </button>
            <button className="mini-action" onClick={() => setNow(new Date())}>↻ อัปเดต</button>
          </div>
        </section>

        <section className="service-status-section" aria-label="สถานะเหตุขัดข้อง">
          {serviceAlert ? (
            <article className="service-alert-card disrupted">
              <div className="service-alert-icon" aria-hidden="true">!</div>
              <div className="service-alert-copy">
                <p className="service-alert-label">แจ้งเหตุขัดข้อง · {line.name}</p>
                <h2>{serviceAlert.affectedArea}</h2>
                <span className="service-alert-summary">{serviceAlert.summary}</span>
                <strong>
                  {serviceAlert.delayMinutes
                    ? serviceAlert.summary.includes("ความถี่")
                      ? `ความถี่การเดินรถประมาณ ${serviceAlert.delayMinutes[0]} นาที`
                      : `เดินรถล่าช้าประมาณ ${serviceAlert.delayMinutes[0]}–${serviceAlert.delayMinutes[1]} นาที`
                    : "เดินรถล่าช้า · ยังไม่ทราบระยะเวลา"}
                </strong>
                <span>ประกาศเมื่อ {new Date(serviceAlert.updatedAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</span>
                <a href={serviceAlert.sourceUrl} target="_blank" rel="noreferrer">ดูประกาศจาก {serviceAlert.sourceName} ↗</a>
              </div>
            </article>
          ) : (
            <article className="service-alert-card checking">
              <div className="service-alert-icon" aria-hidden="true">✓</div>
              <div className="service-alert-copy">
                <p className="service-alert-label">SERVICE STATUS · {line.short}</p>
                <h2>{alertStatus === "loading" ? "กำลังตรวจประกาศ…" : alertStatus === "error" ? "ตรวจสถานะอัตโนมัติไม่ได้" : "ไม่พบประกาศเหตุขัดข้องล่าสุด"}</h2>
                <span>{alertStatus === "ready" ? "ระบบตรวจประกาศผู้ให้บริการและข่าวนวัตกรรมขนส่งเดลินิวส์ทุก 15 นาที และไม่คาดเดาระยะเวลาที่ข่าวไม่ได้ระบุ" : "โปรดตรวจประกาศจากผู้ให้บริการก่อนออกเดินทาง"}</span>
                {operatorSource && <a href={operatorSource.url} target="_blank" rel="noreferrer">ตรวจประกาศ {operatorSource.name} ↗</a>}
              </div>
            </article>
          )}
        </section>

        <section className="arrivals" aria-label="ขบวนถัดไปโดยประมาณ">
          <div className="section-heading">
            <div>
              <p className="eyebrow dark">NEXT TRAINS</p>
              <h2>ขบวนถัดไป</h2>
            </div>
            <span>{serviceClosed ? "หมดเวลาให้บริการปกติ" : serviceSuspended ? "หยุดให้บริการชั่วคราว" : announcedFrequencyMinutes ? `ตามประกาศทุกประมาณ ${announcedFrequencyMinutes} นาที` : `ทุกประมาณ ${formatInterval(frequency.seconds)}`}</span>
          </div>

          {trainsUnavailable ? (
            <article className="arrival-card service-paused">
              <div className="direction-mark" aria-hidden="true"><span>!</span></div>
              <div className="arrival-copy">
                <small>{serviceClosed ? "นอกเวลาให้บริการปกติ" : "ประกาศเหตุขัดข้อง"}</small>
                <strong>{serviceClosed ? "ไม่มีขบวนถัดไปในขณะนี้" : "ยังไม่ทราบเวลาให้บริการถัดไป"}</strong>
                <span>{serviceClosed ? `เริ่มให้บริการเที่ยวแรกของระบบประมาณ ${formatClock(serviceHours(line, now).opensAt)} น. เวลาแต่ละสถานีและทิศทางอาจต่างกัน` : "โปรดรอประกาศกลับมาเดินรถจากผู้ให้บริการ"}</span>
              </div>
            </article>
          ) : directionTrips.map((trip) => (
            <article className="arrival-card" key={`${trip.destination}-${trip.directionKey}`}>
              <div className="direction-mark" aria-hidden="true"><span>→</span></div>
              <div className="arrival-copy">
                <small>มุ่งหน้า</small>
                <strong>{trip.destination}</strong>
                <span>{announcedFrequencyMinutes ? `ขบวนต่อไปตามประกาศอีกประมาณ ${announcedFrequencyMinutes * 2} นาที` : `ขบวนต่อไปอีก ${Math.ceil((trip.arrival.remaining + announcedDelayMinutes * 60 + effectiveFrequency.seconds) / 60)} นาที`}</span>
              </div>
              <div className="countdown">
                <strong>{announcedFrequencyMinutes ? `≤ ${announcedFrequencyMinutes}` : formatCountdown(trip.arrival.remaining + announcedDelayMinutes * 60)}</strong>
                <span>{announcedFrequencyMinutes ? "นาทีโดยประมาณ" : trip.arrival.remaining + announcedDelayMinutes * 60 < 60 ? "ใกล้ถึง" : "นาที"}</span>
              </div>
            </article>
          ))}
          <div className="truth-note"><span>i</span><p><strong>ยังไม่ใช่ตำแหน่งรถสด</strong> {serviceClosed ? <>ระบบหยุดคำนวณขบวนและความหนาแน่นเมื่ออยู่นอกกรอบตารางปกติ เที่ยวแรก–สุดท้ายจริงต่างกันตามสถานีและทิศทาง · <a href={serviceHours(line, now).source} target="_blank" rel="noreferrer">ตรวจตารางทางการ ↗</a></> : serviceAlert ? announcedFrequencyMinutes ? `ประกาศระบุเพียงความถี่ ${announcedFrequencyMinutes} นาที จึงแสดงเป็น “ภายใน” ไม่ใช่เวลารถถึงจริง` : announcedDelayMinutes ? `นำเวลาล่าช้าตามประกาศ ${announcedDelayMinutes} นาทีมาบวกกับค่าคาดการณ์เดิม` : "มีเหตุขัดข้องแต่ประกาศไม่ได้ระบุเวลาล่าช้า จึงไม่เพิ่มตัวเลขเอง" : <>ใช้{frequency.periodLabel} · {frequency.sourceUrl ? <a href={frequency.sourceUrl} target="_blank" rel="noreferrer">{frequency.sourceLabel} ↗</a> : frequency.sourceLabel}</>} โปรดตรวจสอบจอชานชาลาและปลายทางจริง</p></div>
        </section>

        <section className="density-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow dark">CAR LOAD FORECAST</p>
              <h2>คาดการณ์ความหนาแน่น</h2>
            </div>
            <span className="forecast-chip">ไม่ใช่ข้อมูลจริง</span>
          </div>
          {nearbyCrowdReport && (
            <article className="crowd-report-card">
              <span className="crowd-report-icon">◉</span>
              <div>
                <small>รายงานผู้โดยสาร · ใช้ปรับค่าประเมินขบวน</small>
                <strong>{nearbyCrowdReport.station} · {nearbyCrowdReport.level === 3 ? "คนหนาแน่นมาก" : nearbyCrowdReport.level === 2 ? "คนค่อนข้างแน่น" : "มีผู้โดยสารเพิ่มขึ้น"}</strong>
                <p>{nearbyCrowdReport.summary}</p>
                <a href={nearbyCrowdReport.sourceUrl} target="_blank" rel="noreferrer">ดูรายงานจาก {nearbyCrowdReport.sourceName} ↗</a>
              </div>
            </article>
          )}
          <div className="direction-forecasts">
            {trainsUnavailable && (
              <div className="density-unavailable">
                <strong>{serviceClosed ? "หยุดคาดการณ์นอกเวลาให้บริการ" : "หยุดคาดการณ์ระหว่างงดเดินรถ"}</strong>
                <span>ระบบจะเริ่มคำนวณขบวนและความหนาแน่นอีกครั้งเมื่อกลับมาให้บริการ</span>
              </div>
            )}
            {!trainsUnavailable && directionTrips.map((trip) => (
              <article className="direction-forecast" key={`forecast-${trip.directionKey}`}>
                <header className="direction-forecast-head">
                  <span className="direction-arrow">→</span>
                  <div><small>มุ่งหน้า</small><strong>{trip.destination}</strong></div>
                  <p>สถานีถัดไป <b>{trip.nextStation}</b></p>
                </header>
                {[0, 1].map((queueIndex) => {
                  const trainSlot = trip.arrival.slot + queueIndex;
                  const eta = announcedFrequencyMinutes
                    ? (queueIndex + 1) * effectiveFrequency.seconds
                    : trip.arrival.remaining + announcedDelayMinutes * 60 + queueIndex * effectiveFrequency.seconds;
                  return (
                    <section className="train-forecast" key={`${trip.directionKey}-${trainSlot}`}>
                      <div className="train-forecast-title">
                        <strong>{queueIndex === 0 ? "ขบวนถัดไป" : "ขบวนต่อไป"}</strong>
                        <span>ประมาณ {formatCountdown(eta)}</span>
                      </div>
                      <div className="train-cars">
                        {Array.from({ length: line.cars }).map((_, carIndex) => {
                          const currentValue = getTrainCrowd(line, station, carIndex, now, trip.direction, trainSlot, queueIndex, activeCrowdReports);
                          const nextValue = getNextStationCrowd(line, trip.nextStation, currentValue, carIndex, now, trip.direction, trainSlot, queueIndex, activeCrowdReports);
                          const level = currentValue < 45 ? "low" : currentValue < 72 ? "medium" : "high";
                          const trend = trendLabel(currentValue, nextValue);
                          return (
                            <div className={`train-car ${level}`} key={carIndex}>
                              <div className="car-window"><span /><span /></div>
                              <strong>ตู้ {carIndex + 1}</strong>
                              <small>{crowdLabel(currentValue)}</small>
                              <span className={`car-trend ${trend.className}`}>{trend.symbol} {trend.text}</span>
                              <em>ถัดไป: {crowdLabel(nextValue)}</em>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </article>
            ))}
          </div>
          <div className="legend"><span><i className="low" />โล่ง</span><span><i className="medium" />ปานกลาง</span><span><i className="high" />หนาแน่น</span></div>
          <div className="truth-note"><span>i</span><p>ระบบติดตามลำดับขบวนไว้ภายในโดยไม่แสดงหมายเลข หากมีรายงานผู้โดยสารสาธารณะ ระบบจะเพิ่มน้ำหนักให้ขบวนแรกที่รับคนจากสถานีนั้น แล้วลดผลตามเวลา ระยะทาง และขบวนถัดไป รายงานหมดผลภายใน 60 นาที</p></div>
        </section>

        {favorites.length > 0 && (
          <section className="favorites-section">
            <div className="section-heading"><div><p className="eyebrow dark">QUICK ACCESS</p><h2>สถานีที่ปักหมุด</h2></div></div>
            <div className="favorite-list">
              {favorites.map((key) => {
                const [favoriteLineId, favoriteStation] = key.split("|");
                const favoriteLine = railLines.find((item) => item.id === favoriteLineId);
                if (!favoriteLine) return null;
                return <button key={key} onClick={() => { setLineId(favoriteLineId); setStation(favoriteStation); }}><i style={{ background: favoriteLine.color }} /><span><strong>{favoriteStation}</strong><small>{favoriteLine.name}</small></span><b>→</b></button>;
              })}
            </div>
          </section>
        )}

        <footer>
          <p>Bangkok Rail Daily · เว็บส่วนตัวสำหรับช่วยวางแผนเดินทาง</p>
          <p>เวลาและความหนาแน่นอาจคลาดเคลื่อน ไม่ใช่ระบบทางการของผู้ให้บริการ</p>
        </footer>
      </div>

      {pickerOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setPickerOpen(false); }}>
          <section className="station-picker" role="dialog" aria-modal="true" aria-label="เลือกสถานี">
            <div className="picker-grab" />
            <div className="picker-head"><div><small>{line.short} · {line.name}</small><h2>เลือกสถานี</h2></div><button onClick={() => setPickerOpen(false)} aria-label="ปิด">×</button></div>
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อสถานี" />
            <div className="station-list">
              {filteredStations.map((item, index) => (
                <button key={`${item}-${index}`} className={item === station ? "selected" : ""} onClick={() => selectStation(item)}>
                  <span className="station-index">{String(line.stations.indexOf(item) + 1).padStart(2, "0")}</span>
                  <strong>{item}</strong>
                  {interchangeStations.has(item) && <small>เชื่อมต่อ</small>}
                  {item === station && <b>✓</b>}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
