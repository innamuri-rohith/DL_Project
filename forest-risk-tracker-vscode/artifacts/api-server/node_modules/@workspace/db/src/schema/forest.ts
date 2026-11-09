import { createInsertSchema } from "drizzle-zod";
import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const riskZonesTable = pgTable("risk_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  risk: numeric("risk", { precision: 5, scale: 2 }).notNull(),
  riskType: text("risk_type").notNull(),
  change: numeric("change", { precision: 5, scale: 2 }).notNull(),
  area: numeric("area", { precision: 10, scale: 2 }).notNull(),
  coordinates: numeric("coordinates", { precision: 12, scale: 6 }).array().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const observationsTable = pgTable("observations", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  subject: text("subject").notNull(),
  location: text("location").notNull(),
  confidence: numeric("confidence", { precision: 5, scale: 2 }).notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  source: text("source").notNull(),
  status: text("status").notNull().default("review"),
});

export const alertsTable = pgTable("forest_alerts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(),
  location: text("location").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  signal: text("signal").notNull(),
});

export const activityTable = pgTable("forest_activity", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  detail: text("detail").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  tone: text("tone").notNull(),
});

export const geofencesTable = pgTable("geofences", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'settlement' | 'road' | 'core_reserve' | 'agriculture'
  riskLevel: text("risk_level").notNull().default("safe"), // 'safe' | 'advisory' | 'critical'
  bufferMeters: integer("buffer_meters").notNull().default(500),
  population: integer("population"),
  centerCoordinates: numeric("center_coordinates", { precision: 12, scale: 6 }).array().notNull(),
  boundaryCoordinates: text("boundary_coordinates").notNull(), // JSON array of [lat, lng]
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cameraTrapsTable = pgTable("camera_traps", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  coordinates: numeric("coordinates", { precision: 12, scale: 6 }).array().notNull(),
  status: text("status").notNull().default("online"), // 'online' | 'alert' | 'offline'
  battery: integer("battery").notNull().default(95),
  lastPing: timestamp("last_ping", { withTimezone: true }).notNull().defaultNow(),
});

export const multimodalDetectionsTable = pgTable("multimodal_detections", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // 'drone_feed' | 'camera_trap' | 'satellite_unet' | 'satellite_fire_rf'
  model: text("model").notNull(), // 'YOLOv8-MegaDetector' | 'U-Net-CanopyLoss' | 'RandomForest-FireRisk' | 'Multimodal-Fusion'
  target: text("target").notNull(),
  confidence: numeric("confidence", { precision: 5, scale: 2 }).notNull(),
  threatLevel: text("threat_level").notNull(), // 'critical' | 'high' | 'medium' | 'low'
  location: text("location").notNull(),
  coordinates: numeric("coordinates", { precision: 12, scale: 6 }).array().notNull(),
  boundingBoxes: text("bounding_boxes"), // JSON string
  details: text("details").notNull(),
  nearestGeofence: text("nearest_geofence"),
  geofenceDistanceMeters: integer("geofence_distance_meters"),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rangerDispatchesTable = pgTable("ranger_dispatches", {
  id: serial("id").primaryKey(),
  channel: text("channel").notNull(), // 'telegram' | 'sms' | 'radio'
  recipient: text("recipient").notNull(),
  severity: text("severity").notNull(), // 'critical' | 'high' | 'medium'
  headline: text("headline").notNull(),
  payload: text("payload").notNull(),
  location: text("location").notNull(),
  coordinates: numeric("coordinates", { precision: 12, scale: 6 }).array().notNull(),
  assignedUnit: text("assigned_unit").notNull(),
  etaMinutes: integer("eta_minutes").notNull().default(15),
  status: text("status").notNull().default("dispatched"), // 'dispatched' | 'acknowledged' | 'en_route' | 'resolved'
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }).notNull().defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
});

export const insertObservationSchema = createInsertSchema(observationsTable).omit({ id: true, recordedAt: true });
export type InsertObservation = z.infer<typeof insertObservationSchema>;
export type RiskZone = typeof riskZonesTable.$inferSelect;
export type Observation = typeof observationsTable.$inferSelect;
export type ForestAlert = typeof alertsTable.$inferSelect;
export type ActivityItem = typeof activityTable.$inferSelect;
export type Geofence = typeof geofencesTable.$inferSelect;
export type CameraTrap = typeof cameraTrapsTable.$inferSelect;
export type MultimodalDetection = typeof multimodalDetectionsTable.$inferSelect;
export type RangerDispatch = typeof rangerDispatchesTable.$inferSelect;

