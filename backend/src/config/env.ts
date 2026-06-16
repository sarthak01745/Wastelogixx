import { config } from "dotenv";
import { z } from "zod";

config();

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  CLIENT_URL: z.string().url(),
  APP_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  JWT_SECRET: z.string().min(12),
  JWT_EXPIRES_IN: z.string().default("7d"),
  ROUTE_DEVIATION_METERS: z.coerce.number().default(250),
  LONG_STOP_MINUTES: z.coerce.number().default(12),
  STOP_RADIUS_METERS: z.coerce.number().default(65),
  GPS_SPOOF_SPEED_KPH: z.coerce.number().default(140),
  MULTI_STOP_THRESHOLD: z.coerce.number().default(3),
  SYNC_BATCH_LIMIT: z.coerce.number().default(100),
  IOT_SHARED_SECRET: z.string().min(8),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
});

export const env = schema.parse(process.env);
