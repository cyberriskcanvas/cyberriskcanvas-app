import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Singleton - avoids exhausting connections during hot-reload in development
export const prisma = globalThis.prismaGlobal ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
