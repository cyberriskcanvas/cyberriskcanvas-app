import { prisma } from './db';

/** Version a CI request refers to: ?version=N, else the active one. */
export async function resolveCiVersion(projectId: string, versionParam: string | null) {
  const select = { id: true, number: true, status: true } as const;
  if (versionParam) {
    const num = parseInt(versionParam, 10);
    if (isNaN(num)) return null;
    return prisma.projectVersion.findUnique({ where: { projectId_number: { projectId, number: num } }, select });
  }
  return prisma.projectVersion.findFirst({ where: { projectId, status: 'active' }, orderBy: { number: 'desc' }, select });
}
