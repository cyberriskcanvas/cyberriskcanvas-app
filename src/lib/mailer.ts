import nodemailer from 'nodemailer';
import { prisma } from './db';

// Optional email notifications next to the webhooks. Off unless SMTP_URL is set, e.g.
//   SMTP_URL=smtps://user:password@smtp.example.com:465   MAIL_FROM="Canvas <canvas@example.com>"
// Recipients: ALERT_EMAIL_TO (comma separated), otherwise all administrators.
// A failed delivery is logged, never thrown.

export function mailConfigured(): boolean {
  return !!process.env.SMTP_URL?.trim();
}

/** Pure: recipients from the environment, falling back to the admin addresses. */
export function pickRecipients(envList: string | undefined, adminEmails: string[]): string[] {
  const fromEnv = (envList ?? '').split(',').map((s) => s.trim()).filter((s) => /^[^\s@]+@[^\s@]+$/.test(s));
  return [...new Set(fromEnv.length > 0 ? fromEnv : adminEmails)];
}

export async function sendNoticeMail(subject: string, lines: string[], link: string): Promise<boolean> {
  if (!mailConfigured()) return false;
  try {
    const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { email: true } });
    const to = pickRecipients(process.env.ALERT_EMAIL_TO, admins.map((a) => a.email).filter((e): e is string => !!e));
    if (to.length === 0) return false;
    const transport = nodemailer.createTransport(process.env.SMTP_URL!);
    await transport.sendMail({
      from: process.env.MAIL_FROM || 'CyberRisk Canvas <noreply@localhost>',
      to,
      subject: `[CyberRisk Canvas] ${subject}`,
      text: `${subject}\n\n${lines.map((l) => `- ${l}`).join('\n')}\n\n${link}\n`,
    });
    return true;
  } catch (err) {
    console.error('[mailer] delivery failed:', err instanceof Error ? err.message : err);
    return false;
  }
}
