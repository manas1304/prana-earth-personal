import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn(
      "DATABASE_URL is not set. Initializing Prisma without a Neon adapter.",
    );
    return new PrismaClient({
      datasources: {
        db: {
          url: "postgresql://postgres:postgres@localhost:5432/postgres",
        },
      },
    } as any);
  }

  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter } as any);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
