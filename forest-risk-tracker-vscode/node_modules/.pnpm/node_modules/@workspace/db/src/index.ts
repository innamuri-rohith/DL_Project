import { drizzle as drizzleNodePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

export * from "./schema";
export * from "drizzle-orm";

const { Pool } = pg;

export type AppDatabase = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

let dbInstance: AppDatabase;
let poolInstance: pg.Pool | undefined;

if (process.env.DATABASE_URL) {
  poolInstance = new Pool({ connectionString: process.env.DATABASE_URL });
  dbInstance = drizzleNodePg(poolInstance, { schema });
} else {
  const dataDir = process.env.PGLITE_DATA_DIR || path.resolve(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dataDir, { recursive: true });

  const client = new PGlite(dataDir);

  await client.exec(`
    CREATE TABLE IF NOT EXISTS risk_zones (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      region TEXT NOT NULL,
      risk NUMERIC(5, 2) NOT NULL,
      risk_type TEXT NOT NULL,
      change NUMERIC(5, 2) NOT NULL,
      area NUMERIC(10, 2) NOT NULL,
      coordinates NUMERIC(12, 6)[] NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS observations (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      location TEXT NOT NULL,
      confidence NUMERIC(5, 2) NOT NULL,
      recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      source TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'review'
    );

    CREATE TABLE IF NOT EXISTS forest_alerts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      signal TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS forest_activity (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      detail TEXT NOT NULL,
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      tone TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS geofences (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      risk_level TEXT NOT NULL DEFAULT 'safe',
      buffer_meters INTEGER NOT NULL DEFAULT 500,
      population INTEGER,
      center_coordinates NUMERIC(12, 6)[] NOT NULL,
      boundary_coordinates TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS camera_traps (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      coordinates NUMERIC(12, 6)[] NOT NULL,
      status TEXT NOT NULL DEFAULT 'online',
      battery INTEGER NOT NULL DEFAULT 95,
      last_ping TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS multimodal_detections (
      id SERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      model TEXT NOT NULL,
      target TEXT NOT NULL,
      confidence NUMERIC(5, 2) NOT NULL,
      threat_level TEXT NOT NULL,
      location TEXT NOT NULL,
      coordinates NUMERIC(12, 6)[] NOT NULL,
      bounding_boxes TEXT,
      details TEXT NOT NULL,
      nearest_geofence TEXT,
      geofence_distance_meters INTEGER,
      detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ranger_dispatches (
      id SERIAL PRIMARY KEY,
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL,
      severity TEXT NOT NULL,
      headline TEXT NOT NULL,
      payload TEXT NOT NULL,
      location TEXT NOT NULL,
      coordinates NUMERIC(12, 6)[] NOT NULL,
      assigned_unit TEXT NOT NULL,
      eta_minutes INTEGER NOT NULL DEFAULT 15,
      status TEXT NOT NULL DEFAULT 'dispatched',
      dispatched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      acknowledged_at TIMESTAMP WITH TIME ZONE
    );
  `);

  dbInstance = drizzlePglite(client, { schema });
}

export const pool = poolInstance;
export const db = dbInstance;

