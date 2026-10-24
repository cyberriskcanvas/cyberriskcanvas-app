import { prisma } from './db';

/** The organisation row of this installation; created empty on first use. */
export async function getOrg() {
  return (await prisma.organisation.findUnique({ where: { id: 'org' } }))
    ?? prisma.organisation.upsert({ where: { id: 'org' }, update: {}, create: { id: 'org' } });
}
