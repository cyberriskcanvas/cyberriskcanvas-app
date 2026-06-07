import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  // @prisma/adapter-pg routes all queries through a real pg.PoolClient.
  // Within prisma.$transaction, both $queryRaw and model queries share the
  // same PoolClient - fixing the Rust-engine bug where set_config was
  // invisible to model queries due to different internal connections.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Singleton - avoids exhausting connections during hot-reload in development
export const prisma = globalThis.prismaGlobal ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
