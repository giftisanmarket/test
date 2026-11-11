import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Check your .env file."
  );
}

type CustomPrismaClient = PrismaClient<{
  adapter: PrismaPg;
  omit: {
    user: {
      password: true;
    };
  };
}>;

const globalForPrisma = globalThis as unknown as {
  prisma: CustomPrismaClient | undefined;
  pool: Pool | undefined;
};

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 4, // Restrict active connections per Next.js server instance to prevent socket exhaustion on Neon
    idleTimeoutMillis: 30000, // Close idle pool connections after 30 seconds
    connectionTimeoutMillis: 15000, // Allow sufficient time for Neon cold starts
  });

const adapter = new PrismaPg(pool);

const createPrismaClient = () =>
  new PrismaClient({
    adapter,
    omit: {
      user: {
        password: true,
      },
    },
  });

const cachedPrisma = globalForPrisma.prisma;
const hasLatestSchema = Boolean(
  (cachedPrisma as any)?._runtimeDataModel?.models?.RefundRequest?.fields?.some(
    (f: any) => f.name === "returnTrackingNumber"
  )
);

export const prisma =
  cachedPrisma && (process.env.NODE_ENV === "production" || hasLatestSchema)
    ? cachedPrisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
