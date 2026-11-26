import { getTier } from './tierLimits';
import { TIER_CONFIG } from './tierConfig';
import { runCveScan } from './cveScan';
import { runReminders } from './reminders';

// Background jobs inside the server process, on by default. The database lock of runCveScan keeps
// several instances (or the optional external trigger) from running the same job twice.

const HOUR_MS = 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 5 * 60 * 1000;

function hours(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

async function guarded(name: string, job: () => Promise<void>) {
  try {
    await job();
  } catch (err) {
    console.error(`[scheduler] ${name} failed:`, err instanceof Error ? err.message : err);
  }
}

export function startBackgroundJobs() {
  // Vulnerability monitoring: re-scan all SBOMs against OSV. CVE_SCAN_INTERVAL_HOURS=0 turns it off.
  const scanHours = hours('CVE_SCAN_INTERVAL_HOURS', 24);
  if (scanHours > 0) {
    const scan = () => guarded('cve-scan', async () => {
      if (!TIER_CONFIG[await getTier()].sbom) return; // needs the Pro licence, like the manual scan
      const r = await runCveScan();
      if (r.status === 'completed') console.warn(`[scheduler] CVE scan done: ${r.scannedCount} components, ${r.newCount} new findings`);
    });
    setTimeout(scan, FIRST_RUN_DELAY_MS).unref();
    setInterval(scan, scanHours * HOUR_MS).unref();
    console.warn(`[scheduler] CVE monitoring every ${scanHours} h (CVE_SCAN_INTERVAL_HOURS=0 disables it)`);
  }

  // Reminders for Art. 14 deadlines and the end of the support period, checked hourly. Always on:
  // they cost nothing without open cases or support dates.
  const remind = () => guarded('reminders', async () => {
    const r = await runReminders();
    if (r.incidents + r.support > 0) console.warn(`[scheduler] reminders sent: ${r.incidents} Art. 14, ${r.support} support`);
  });
  setTimeout(remind, 2 * 60 * 1000).unref();
  setInterval(remind, HOUR_MS).unref();
}
