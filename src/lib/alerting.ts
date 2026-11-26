import { prisma } from './db';
import { sendNoticeMail } from './mailer';
import { severityRank } from './cvss';

// Outgoing webhook notifications for newly discovered CVE findings
// (Slack incoming webhooks, MS Teams connectors, or a generic JSON POST).
// A failed delivery is logged but never thrown - a broken webhook must not
// affect the scan run that triggered it.

export interface AlertFinding {
  projectName: string;
  componentName: string;
  componentVersion: string | null;
  cveId: string | null;
  osvId: string;
  severity: string | null;
  cvssScore: number | null;
}

export interface WebhookResult {
  ok: boolean;
  status?: number;
  error?: string;
}

function meetsThreshold(severity: string | null, minSeverity: string): boolean {
  return severityRank(severity) >= severityRank(minSeverity);
}

function securityOverviewUrl(): string {
  const base = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/security`;
}

function findingLine(f: AlertFinding): string {
  const id = f.cveId ?? f.osvId;
  const component = f.componentVersion ? `${f.componentName}@${f.componentVersion}` : f.componentName;
  const score = f.cvssScore != null ? `, CVSS ${f.cvssScore}` : '';
  return `${id} (${f.severity ?? 'UNKNOWN'}${score}) in ${component} - ${f.projectName}`;
}

function buildPayload(type: string, findings: AlertFinding[], overviewUrl: string): unknown {
  const summary = `${findings.length} new vulnerabilit${findings.length === 1 ? 'y' : 'ies'} found by CyberRisk Canvas CVE monitoring`;
  const lines = findings.map(findingLine);

  if (type === 'slack') {
    return {
      text: summary,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: `*${summary}*\n${lines.map((l) => `• ${l}`).join('\n')}` } },
        { type: 'context', elements: [{ type: 'mrkdwn', text: `<${overviewUrl}|Open Security Overview>` }] },
      ],
    };
  }

  if (type === 'teams') {
    return {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      summary,
      themeColor: 'D9534F',
      title: summary,
      text: `${lines.join('\n\n')}\n\n[Open Security Overview](${overviewUrl})`,
    };
  }

  return {
    summary,
    overviewUrl,
    findings: findings.map((f) => ({
      cveId: f.cveId,
      osvId: f.osvId,
      severity: f.severity,
      cvssScore: f.cvssScore,
      component: f.componentVersion ? `${f.componentName}@${f.componentVersion}` : f.componentName,
      project: f.projectName,
    })),
  };
}

async function postWebhook(url: string, payload: unknown): Promise<WebhookResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Request failed' };
  }
}

/** Notifies all active channels about newly discovered findings, filtered to each channel's severity threshold. */
export async function dispatchNewFindingAlerts(findings: AlertFinding[]): Promise<void> {
  if (findings.length === 0) return;

  // Email only for the serious ones (ALERT_EMAIL_MIN_SEVERITY, default HIGH)
  const mailMin = (process.env.ALERT_EMAIL_MIN_SEVERITY ?? 'HIGH').toUpperCase();
  const serious = findings.filter((f) => meetsThreshold(f.severity, mailMin));
  if (serious.length > 0) {
    await sendNoticeMail(`${serious.length} new vulnerabilit${serious.length === 1 ? 'y' : 'ies'} found`, serious.map(findingLine), securityOverviewUrl());
  }

  const channels = await prisma.alertChannel.findMany({ where: { active: true } });
  if (channels.length === 0) return;

  const overviewUrl = securityOverviewUrl();

  for (const channel of channels) {
    const relevant = findings.filter((f) => meetsThreshold(f.severity, channel.minSeverity));
    if (relevant.length === 0) continue;

    const result = await postWebhook(channel.url, buildPayload(channel.type, relevant, overviewUrl));
    if (!result.ok) {
      console.error(`[alerting] channel ${channel.id} (${channel.type}) delivery failed:`, result.error ?? `HTTP ${result.status}`);
    }
  }
}

/** Sends a synthetic finding to the given URL so admins can verify a channel is wired up correctly. */
export async function sendTestAlert(url: string, type: string): Promise<WebhookResult> {
  const payload = buildPayload(type, [{
    projectName: 'Demo Project',
    componentName: 'openssl',
    componentVersion: '1.1.1k',
    cveId: 'CVE-2024-TEST',
    osvId: 'CVE-2024-TEST',
    severity: 'CRITICAL',
    cvssScore: 9.8,
  }], securityOverviewUrl());
  return postWebhook(url, payload);
}

/**
 * Sends a free-form notice (e.g. a reporting deadline) to every active channel, ignoring the severity
 * threshold: these are obligations, not findings. A failed delivery is logged, never thrown.
 */
export async function dispatchNotice(title: string, lines: string[], path = '/'): Promise<void> {
  const base = (process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const url = `${base}${path}`;
  await sendNoticeMail(title, lines, url); // optional, no-op without SMTP_URL

  const channels = await prisma.alertChannel.findMany({ where: { active: true } });
  if (channels.length === 0) return;

  for (const channel of channels) {
    let payload: unknown;
    if (channel.type === 'slack') {
      payload = {
        text: title,
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: `*${title}*\n${lines.map((l) => `• ${l}`).join('\n')}` } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `<${url}|Open CyberRisk Canvas>` }] },
        ],
      };
    } else if (channel.type === 'teams') {
      payload = { '@type': 'MessageCard', '@context': 'http://schema.org/extensions', summary: title, themeColor: 'D9534F', title, text: `${lines.join('\n\n')}\n\n[Open CyberRisk Canvas](${url})` };
    } else {
      payload = { summary: title, lines, url };
    }
    const result = await postWebhook(channel.url, payload);
    if (!result.ok) console.error(`[alerting] channel ${channel.id} (${channel.type}) notice failed:`, result.error ?? `HTTP ${result.status}`);
  }
}
