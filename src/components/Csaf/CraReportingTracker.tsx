'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, Download, ShieldAlert, Send } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props {
  projectId: string;
  projectName: string;
  vulnId?: string;
  vulnTitle?: string;
  cvssScore?: number | null;
}

export function CraReportingTracker({ projectName, vulnId, vulnTitle, cvssScore }: Props) {
  const [awarenessDate, setAwarenessDate] = useState<string>(
    new Date().toISOString().slice(0, 16),
  );
  const [affectedMemberStates, setAffectedMemberStates] = useState<string>('DE, FR, AT');
  const [isActivelyExploited, setIsActivelyExploited] = useState<boolean>(true);
  const [earlyWarningSubmitted, setEarlyWarningSubmitted] = useState<boolean>(false);
  const [vulnerabilityReportSubmitted, setVulnerabilityReportSubmitted] = useState<boolean>(false);
  const [finalReportSubmitted, setFinalReportSubmitted] = useState<boolean>(false);

  const awarenessTime = new Date(awarenessDate).getTime();
  const now = Date.now();

  // Deadlines in hours
  const earlyWarningDeadline = awarenessTime + 24 * 60 * 60 * 1000;
  const vulnReportDeadline = awarenessTime + 72 * 60 * 60 * 1000;
  const finalReportDeadline = awarenessTime + 14 * 24 * 60 * 60 * 1000;

  const hoursRemainingEarly = Math.round((earlyWarningDeadline - now) / (1000 * 60 * 60));
  const hoursRemainingVuln = Math.round((vulnReportDeadline - now) / (1000 * 60 * 60));
  const daysRemainingFinal = Math.round((finalReportDeadline - now) / (1000 * 60 * 60 * 24));

  const generateEarlyWarningJson = () => {
    const payload = {
      notification_type: 'CRA_ARTICLE_14_EARLY_WARNING',
      regulatory_reference: 'EU CRA (2024/2847) Art. 14(2)(a) & BSI TR-03183-3 §4.4.2',
      timestamp: new Date().toISOString(),
      time_of_awareness: new Date(awarenessDate).toISOString(),
      product: {
        name: projectName,
      },
      vulnerability: {
        id: vulnId ?? 'CVE-2026-XXXX',
        title: vulnTitle ?? `Sicherheitslücke in ${projectName}`,
        actively_exploited: isActivelyExploited,
        tentative_cvss: cvssScore ?? 7.5,
      },
      recipient_authorities: [
        { name: 'CSIRT / CERT-Bund', role: 'Designated National Coordinator (DE)' },
        { name: 'ENISA', role: 'European Single Reporting Platform' },
      ],
      affected_eu_member_states: affectedMemberStates.split(',').map((s) => s.trim()),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cra-art14-early-warning-${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-[#e5e1d8] bg-white p-5 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-[#e5e1d8] pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-amber-50 p-1.5 border border-amber-200">
            <ShieldAlert size={18} className="text-amber-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1a1917]">CRA Art. 14 Gesetzlicher Melde-Tracker</h3>
            <p className="text-[10px] text-[#6b6460]">
              Meldepflicht aktiv ausgenutzter Schwachstellen an CSIRT (CERT-Bund) &amp; ENISA
            </p>
          </div>
        </div>

        <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
          BSI TR-03183-3 §4.4.2
        </span>
      </div>

      {/* Awareness Timestamp and Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#faf9f7] p-3 rounded-lg border border-[#e5e1d8] text-xs">
        <div>
          <label className="block text-[10px] font-bold uppercase text-[#6b6460] mb-1">
            Kenntniserlangung (Time of Awareness):
          </label>
          <input
            type="datetime-local"
            value={awarenessDate}
            onChange={(e) => setAwarenessDate(e.target.value)}
            className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-[#6b6460] mb-1">
            Betroffene EU-Mitgliedstaaten:
          </label>
          <input
            type="text"
            value={affectedMemberStates}
            onChange={(e) => setAffectedMemberStates(e.target.value)}
            placeholder="DE, FR, AT..."
            className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-[#6b6460] mb-1">
            Aktiv ausgenutzt (Exploited):
          </label>
          <button
            type="button"
            onClick={() => setIsActivelyExploited(!isActivelyExploited)}
            className={cn(
              'w-full rounded px-2 py-1 font-semibold text-xs border text-left transition-colors',
              isActivelyExploited
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-gray-50 text-gray-700 border-gray-200',
            )}
          >
            {isActivelyExploited ? '⚠️ Ja, aktiv ausgenutzt' : 'Nein, nur Schwachstelle'}
          </button>
        </div>
      </div>

      {/* Statutory Timeline Cards */}
      <div className="space-y-3">
        {/* Step 1: 24h Early Warning */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#e5e1d8] bg-white p-3.5 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className={cn('rounded-full p-2 mt-0.5', earlyWarningSubmitted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
              {earlyWarningSubmitted ? <CheckCircle2 size={16} /> : <Clock size={16} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-[#1a1917]">Stufe 1: 24h Frühwarnung (Early Warning)</h4>
                <span className="rounded bg-[#f4f1ec] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#6b6460]">
                  CRA Art. 14(2)(a)
                </span>
              </div>
              <p className="text-[11px] text-[#6b6460] mt-0.5">
                Meldung an nationales CSIRT (CERT-Bund) und ENISA ohne schuldhaftes Zögern.
              </p>
              <p className="text-[10px] font-mono mt-1 text-[#1a1917]">
                Frist: {new Date(earlyWarningDeadline).toLocaleString('de-DE')} (
                {earlyWarningSubmitted ? (
                  <span className="text-green-600 font-bold">Erledigt</span>
                ) : hoursRemainingEarly > 0 ? (
                  <span className="text-amber-600 font-bold">Noch {hoursRemainingEarly} Std.</span>
                ) : (
                  <span className="text-red-600 font-bold">Frist abgelaufen!</span>
                )}
                )
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={generateEarlyWarningJson}
              className="flex items-center gap-1.5 rounded border border-[#e5e1d8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1a1917] hover:bg-[#faf9f7]"
            >
              <Download size={13} /> JSON
            </button>
            <button
              onClick={() => setEarlyWarningSubmitted(!earlyWarningSubmitted)}
              className={cn(
                'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors',
                earlyWarningSubmitted ? 'bg-green-600 hover:bg-green-700' : 'bg-[#1e293b] hover:bg-[#334155]',
              )}
            >
              <Send size={13} /> {earlyWarningSubmitted ? 'Eingereicht' : 'Als gemeldet markieren'}
            </button>
          </div>
        </div>

        {/* Step 2: 72h Notification */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#e5e1d8] bg-white p-3.5 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className={cn('rounded-full p-2 mt-0.5', vulnerabilityReportSubmitted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
              {vulnerabilityReportSubmitted ? <CheckCircle2 size={16} /> : <Clock size={16} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-[#1a1917]">Stufe 2: 72h Schwachstellenmeldung (Vulnerability Notification)</h4>
                <span className="rounded bg-[#f4f1ec] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#6b6460]">
                  CRA Art. 14(2)(b)
                </span>
              </div>
              <p className="text-[11px] text-[#6b6460] mt-0.5">
                Detaillierte Analyse, Art des Exploits, erste Abhilfemaßnahmen und Anwenderleitfaden.
              </p>
              <p className="text-[10px] font-mono mt-1 text-[#1a1917]">
                Frist: {new Date(vulnReportDeadline).toLocaleString('de-DE')} (
                {vulnerabilityReportSubmitted ? (
                  <span className="text-green-600 font-bold">Erledigt</span>
                ) : hoursRemainingVuln > 0 ? (
                  <span className="text-amber-600 font-bold">Noch {hoursRemainingVuln} Std.</span>
                ) : (
                  <span className="text-red-600 font-bold">Frist abgelaufen!</span>
                )}
                )
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVulnerabilityReportSubmitted(!vulnerabilityReportSubmitted)}
              className={cn(
                'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors',
                vulnerabilityReportSubmitted ? 'bg-green-600 hover:bg-green-700' : 'bg-[#1e293b] hover:bg-[#334155]',
              )}
            >
              <Send size={13} /> {vulnerabilityReportSubmitted ? 'Eingereicht' : 'Als gemeldet markieren'}
            </button>
          </div>
        </div>

        {/* Step 3: 14 Days Final Report */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#e5e1d8] bg-white p-3.5 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className={cn('rounded-full p-2 mt-0.5', finalReportSubmitted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
              {finalReportSubmitted ? <CheckCircle2 size={16} /> : <Clock size={16} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-[#1a1917]">Stufe 3: 14 Tage Abschlussbericht (Final Report)</h4>
                <span className="rounded bg-[#f4f1ec] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#6b6460]">
                  CRA Art. 14(2)(c)
                </span>
              </div>
              <p className="text-[11px] text-[#6b6460] mt-0.5">
                Spätestens 14 Tage nach Bereitstellung der Behebungsmaßnahme / des Patches (CSAF Advisory).
              </p>
              <p className="text-[10px] font-mono mt-1 text-[#1a1917]">
                Frist: {new Date(finalReportDeadline).toLocaleString('de-DE')} (
                {finalReportSubmitted ? (
                  <span className="text-green-600 font-bold">Erledigt</span>
                ) : daysRemainingFinal > 0 ? (
                  <span className="text-blue-600 font-bold">Noch {daysRemainingFinal} Tage</span>
                ) : (
                  <span className="text-red-600 font-bold">Frist abgelaufen!</span>
                )}
                )
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFinalReportSubmitted(!finalReportSubmitted)}
              className={cn(
                'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors',
                finalReportSubmitted ? 'bg-green-600 hover:bg-green-700' : 'bg-[#1e293b] hover:bg-[#334155]',
              )}
            >
              <Send size={13} /> {finalReportSubmitted ? 'Eingereicht' : 'Als gemeldet markieren'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
