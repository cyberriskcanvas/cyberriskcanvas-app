'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertProjectAccess, assertProjectWriteAccess } from '@/lib/access';
import { audit } from '@/lib/audit';
import { validateOwnVulnerability, type OwnVulnStatus } from '@/lib/ownVulnerability';

export interface OwnVulnDto {
  id: string;
  title: string;
  cveId: string | null;
  cweId: string | null;
  cvssVector: string | null;
  description: string;
  affectedVersions: number[];
  status: OwnVulnStatus;
  remediation: { category: string; details: string; url: string };
  acknowledgments: string;
}

type Row = {
  id: string; title: string; cveId: string | null; cweId: string | null; cvssVector: string | null; description: string;
  affectedVersions: unknown; status: string; remediationCategory: string | null; remediationDetails: string | null;
  remediationUrl: string | null; acknowledgments: string | null;
};

const toDto = (r: Row): OwnVulnDto => ({
  id: r.id, title: r.title, cveId: r.cveId, cweId: r.cweId, cvssVector: r.cvssVector, description: r.description,
  affectedVersions: Array.isArray(r.affectedVersions) ? (r.affectedVersions as number[]) : [],
  status: r.status === 'fixed' ? 'fixed' : 'affected',
  remediation: { category: r.remediationCategory ?? '', details: r.remediationDetails ?? '', url: r.remediationUrl ?? '' },
  acknowledgments: r.acknowledgments ?? '',
});

export async function listOwnVulnerabilities(projectId: string): Promise<OwnVulnDto[]> {
  const session = await requireSession();
  await assertProjectAccess(projectId, session.user.id);
  const rows = await prisma.ownVulnerability.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } });
  return rows.map(toDto);
}

export type SaveResult = { ok: true; items: OwnVulnDto[] } | { ok: false; error: string };

/** Creates (no id) or replaces (with id) an own vulnerability. Validation problems are returned, not thrown, so the form can show them. */
export async function saveOwnVulnerability(projectId: string, input: Record<string, unknown>, id?: string): Promise<SaveResult> {
  const session = await requireSession();
  await assertProjectWriteAccess(projectId, session.user.id);
  const parsed = validateOwnVulnerability(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const v = parsed.value;
  const data = {
    title: v.title, cveId: v.cveId, cweId: v.cweId, cvssVector: v.cvssVector, description: v.description,
    affectedVersions: v.affectedVersions, status: v.status,
    remediationCategory: v.remediation.category, remediationDetails: v.remediation.details, remediationUrl: v.remediation.url,
    acknowledgments: v.acknowledgments,
  };
  if (id) {
    const existing = await prisma.ownVulnerability.findFirst({ where: { id, projectId }, select: { id: true } });
    if (!existing) return { ok: false, error: 'Not found' };
    await prisma.ownVulnerability.update({ where: { id }, data });
  } else {
    await prisma.ownVulnerability.create({ data: { projectId, ...data } });
  }
  audit({ action: 'own_vulnerability.save', actorId: session.user.id, actorEmail: session.user.email, targetType: 'project', targetId: projectId, details: { title: v.title, status: v.status } });
  return { ok: true, items: await listOwnVulnerabilities(projectId) };
}

export async function deleteOwnVulnerability(projectId: string, id: string): Promise<OwnVulnDto[]> {
  const session = await requireSession();
  await assertProjectWriteAccess(projectId, session.user.id);
  await prisma.ownVulnerability.deleteMany({ where: { id, projectId } });
  audit({ action: 'own_vulnerability.delete', actorId: session.user.id, actorEmail: session.user.email, targetType: 'project', targetId: projectId });
  return listOwnVulnerabilities(projectId);
}
