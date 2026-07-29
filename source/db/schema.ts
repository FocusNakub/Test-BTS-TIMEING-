import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const serviceAlerts = sqliteTable("service_alerts", {
  lineId: text("line_id").primaryKey(),
  affectedArea: text("affected_area").notNull(),
  summary: text("summary").notNull(),
  delayMin: integer("delay_min"),
  delayMax: integer("delay_max"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
});

export const crowdReports = sqliteTable("crowd_reports", {
  id: text("id").primaryKey(),
  lineId: text("line_id").notNull(),
  station: text("station").notNull(),
  direction: integer("direction"),
  level: integer("level").notNull(),
  summary: text("summary").notNull(),
  reportedAt: integer("reported_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
});

export const pushTokens = sqliteTable("push_tokens", {
  token: text("token").primaryKey(),
  platform: text("platform").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
