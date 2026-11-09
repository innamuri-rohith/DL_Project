import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { type PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";
export * from "./schema";
export * from "drizzle-orm";
export type AppDatabase = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;
export declare const pool: import("pg").Pool | undefined;
export declare const db: AppDatabase;
//# sourceMappingURL=index.d.ts.map