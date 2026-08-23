'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireTierFeature } from '@/lib/tierGuard';
import { sendTestAlert, type WebhookResult } from '@/lib/alerting';
import { audit } from '@/lib/audit';

export interface AlertChannelDTO {
  id: string;
  urlPreview: string;
  type: string;
  minSeverity: string;
  active: boolean;
  createdAt: string;
}

const VALID_TYPES = ['slack', 'teams', 'generic'];
const VALID_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

async function requireProAdmin() {
  const session = await requireAdmin();
  await requireTierFeature('sbom');
  return session;
}

/** Shows the host only - the path of a Slack/Teams webhook URL is itself a secret. */
function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/••••`;
  } catch {
    return '••••';
  }
}

function toDTO(c: { id: string; url: string; type: string; minSeverity: string; active: boolean; createdAt: Date }): AlertChannelDTO {
  return {
    id: c.id,
    urlPreview: maskUrl(c.url),
    type: c.type,
    minSeverity: c.minSeverity,
    active: c.active,
    createdAt: c.createdAt.toISOString(),
  };
}

export async function listAlertChannels(): Promise<AlertChannelDTO[]> {
  await requireProAdmin();
  const channels = await prisma.alertChannel.findMany({ orderBy: { createdAt: 'asc' } });
  return channels.map(toDTO);
}

export async function createAlertChannel(input: { url: string; type: string; minSeverity: string }): Promise<AlertChannelDTO> {
  const session = await requireProAdmin();

  const url = input.url.trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('Webhook URL must start with http:// or https://');
  if (!VALID_TYPES.includes(input.type)) throw new Error('Invalid channel type');
  if (!VALID_SEVERITIES.includes(input.minSeverity)) throw new Error('Invalid severity threshold');

  const channel = await prisma.alertChannel.create({
    data: { url, type: input.type, minSeverity: input.minSeverity },
  });

  audit({
    action: 'alert_channel.create',
    actorId: session.user.id,
    actorEmail: session.user.email,
    targetType: 'alert_channel',
    targetId: channel.id,
    // The webhook path is a secret - log only the masked host.
    details: { type: channel.type, url: maskUrl(channel.url), minSeverity: channel.minSeverity },
  });

  revalidatePath('/admin');
  return toDTO(channel);
}

export async function updateAlertChannel(id: string, input: { active?: boolean; minSeverity?: string }): Promise<AlertChannelDTO> {
  const session = await requireProAdmin();

  if (input.minSeverity && !VALID_SEVERITIES.includes(input.minSeverity)) throw new Error('Invalid severity threshold');

  const channel = await prisma.alertChannel.update({
    where: { id },
    data: {
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.minSeverity ? { minSeverity: input.minSeverity } : {}),
    },
  });

  audit({
    action: 'alert_channel.update',
    actorId: session.user.id,
    actorEmail: session.user.email,
    targetType: 'alert_channel',
    targetId: id,
    details: {
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.minSeverity ? { minSeverity: input.minSeverity } : {}),
    },
  });

  revalidatePath('/admin');
  return toDTO(channel);
}

export async function deleteAlertChannel(id: string): Promise<void> {
  const session = await requireProAdmin();
  const channel = await prisma.alertChannel.delete({ where: { id } });

  audit({
    action: 'alert_channel.delete',
    actorId: session.user.id,
    actorEmail: session.user.email,
    targetType: 'alert_channel',
    targetId: id,
    details: { type: channel.type, url: maskUrl(channel.url) },
  });

  revalidatePath('/admin');
}

export async function testAlertChannel(id: string): Promise<WebhookResult> {
  await requireProAdmin();
  const channel = await prisma.alertChannel.findUniqueOrThrow({ where: { id } });
  return sendTestAlert(channel.url, channel.type);
}
