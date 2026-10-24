import { prisma } from './db';

/** The organisation row of this installation; created empty on first use. */
export async function getOrg() {
  const existing = await prisma.organisation.findUnique({ where: { id: 'org' } });
  if (existing) return existing;
  // Several requests can get here at once on a fresh install (the reports page loads the organisation in
  // parallel): ON CONFLICT DO NOTHING instead of upsert, which is select-then-insert and fails the loser.
  await prisma.organisation.createMany({ data: [{ id: 'org' }], skipDuplicates: true });
  return prisma.organisation.findUniqueOrThrow({ where: { id: 'org' } });
}
