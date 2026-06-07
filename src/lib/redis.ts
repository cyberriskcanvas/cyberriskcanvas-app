import Redis from 'ioredis';
import { prisma } from './db';

declare global {
  var redisGlobal: Redis | undefined;
}

export const redis = globalThis.redisGlobal ?? new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
});
if (process.env.NODE_ENV !== 'production') globalThis.redisGlobal = redis;

redis.on('error', (err) => {
  console.warn('[redis]', err.message);
});

const DIRTY_SET = 'diagrams:dirty';
const TTL_SECONDS = 3600;

type DiagramPatch = { nodes?: unknown; edges?: unknown; viewport?: unknown; name?: string };
type DiagramBuffer = { patch: DiagramPatch; userId: string };

export async function bufferDiagram(id: string, patch: DiagramPatch, userId: string): Promise<void> {
  const key = `diagram:${id}`;
  try {
    const existing = await redis.get(key);
    const current: DiagramBuffer = existing ? JSON.parse(existing) : { patch: {}, userId };
    const merged: DiagramPatch = { ...current.patch };
    if (patch.nodes !== undefined) merged.nodes = patch.nodes;
    if (patch.edges !== undefined) merged.edges = patch.edges;
    if (patch.viewport !== undefined) merged.viewport = patch.viewport;
    if (patch.name !== undefined) merged.name = patch.name;
    await redis.pipeline()
      .set(key, JSON.stringify({ patch: merged, userId }), 'EX', TTL_SECONDS)
      .sadd(DIRTY_SET, id)
      .exec();
  } catch {
    // Redis unavailable - write directly to Postgres as fallback
    await prisma.diagram.update({ where: { id }, data: patch as Record<string, unknown> });
  }
}

export async function flushDiagram(id: string): Promise<void> {
  const key = `diagram:${id}`;
  try {
    const raw = await redis.get(key);
    if (!raw) return;
    const { patch }: DiagramBuffer = JSON.parse(raw);
    await prisma.diagram.update({ where: { id }, data: patch as Record<string, unknown> });
    await redis.pipeline().del(key).srem(DIRTY_SET, id).exec();
  } catch (err) {
    console.error(`[redis] flush failed for diagram ${id}:`, err);
  }
}

export async function flushAllDirty(): Promise<void> {
  try {
    const ids = await redis.smembers(DIRTY_SET);
    if (ids.length > 0) await Promise.all(ids.map(flushDiagram));
  } catch {
    // Redis unavailable - nothing to flush
  }
}
