'use client';

import { useState } from 'react';
import { X, Copy, Check, Download, Shield } from 'lucide-react';
import { generateBsiSecurityTxt, generateBsiCvdPolicy, type SecurityTxtConfig } from '@/data/securityTxt';
import { cn } from '@/utils/cn';
import { copyText } from '@/lib/insecureContext';
import { useChromeT } from '@/i18n/chrome';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  companyName?: string;
}

export function SecurityTxtModal({ isOpen, onClose, projectName, companyName }: Props) {
  const { t } = useChromeT();
  const [domain, setDomain] = useState('example.com');
  const [psirtEmail, setPsirtEmail] = useState('psirt@example.com');
  const [csirtEmail, setCsirtEmail] = useState('csirt@example.com');
  const [reportWebUri, setReportWebUri] = useState('https://example.com/security-contact');
  const [openPgpKeyUri, setOpenPgpKeyUri] = useState('https://example.com/openpgp-key_psirt.asc');
  const [policyUri, setPolicyUri] = useState('https://example.com/security-policy.html');
  const [csafUri, setCsafUri] = useState('https://example.com/.well-known/csaf/provider-metadata.json');
  const [expiresDays, setExpiresDays] = useState(365);
  const [activeTab, setActiveTab] = useState<'security_txt' | 'cvd_policy'>('security_txt');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const config: SecurityTxtConfig = {
    domain,
    psirtEmail,
    csirtEmail,
    reportWebUri,
    openPgpKeyUri,
    policyUri,
    csafProviderUri: csafUri,
    preferredLanguages: ['en', 'de'],
    expiresDays,
  };

  const securityTxtContent = generateBsiSecurityTxt(config);
  const cvdPolicyContent = generateBsiCvdPolicy(companyName || projectName, config);
  const currentContent = activeTab === 'security_txt' ? securityTxtContent : cvdPolicyContent;

  const handleCopy = () => {
    void copyText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = activeTab === 'security_txt' ? 'security.txt' : 'CVD-POLICY.md';
    const mime = activeTab === 'security_txt' ? 'text/plain' : 'text/markdown';
    const blob = new Blob([currentContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="flex h-[90vh] max-h-[850px] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-[#e5e1d8]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e1d8] px-6 py-4 bg-[#faf9f7]">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-indigo-50 p-2 border border-indigo-200">
              <Shield size={20} className="text-indigo-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1a1917]">
                {t.txt.title}
              </h2>
              <p className="text-xs text-[#6b6460]">
                {t.txt.subtitle}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#6b6460] hover:bg-[#f4f1ec]">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Settings Column */}
          <div className="md:col-span-5 border-r border-[#e5e1d8] p-5 overflow-y-auto space-y-3 bg-[#faf9f7] text-xs">
            <h3 className="font-bold text-[#1a1917] uppercase tracking-wide text-[11px]">
              {t.txt.section}
            </h3>

            <div>
              <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-0.5">{t.txt.domain}</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-0.5">
                {t.txt.psirt}
              </label>
              <input
                type="email"
                value={psirtEmail}
                onChange={(e) => setPsirtEmail(e.target.value)}
                className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-0.5">
                {t.txt.csirt}
              </label>
              <input
                type="email"
                value={csirtEmail}
                onChange={(e) => setCsirtEmail(e.target.value)}
                className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-0.5">
                {t.txt.web}
              </label>
              <input
                type="url"
                value={reportWebUri}
                onChange={(e) => setReportWebUri(e.target.value)}
                className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-0.5">
                {t.txt.pgp}
              </label>
              <input
                type="url"
                value={openPgpKeyUri}
                onChange={(e) => setOpenPgpKeyUri(e.target.value)}
                className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-0.5">
                {t.txt.policy}
              </label>
              <input
                type="url"
                value={policyUri}
                onChange={(e) => setPolicyUri(e.target.value)}
                className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-0.5">
                {t.txt.csaf}
              </label>
              <input
                type="url"
                value={csafUri}
                onChange={(e) => setCsafUri(e.target.value)}
                className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#6b6460] uppercase mb-0.5">
                {t.txt.expires}
              </label>
              <input
                type="number"
                min={30}
                max={365}
                value={expiresDays}
                onChange={(e) => setExpiresDays(parseInt(e.target.value, 10))}
                className="w-full rounded border border-[#e5e1d8] bg-white px-2 py-1 text-xs text-[#1a1917]"
              />
            </div>
          </div>

          {/* Preview Column */}
          <div className="md:col-span-7 flex flex-col h-full bg-white p-5 overflow-hidden">
            {/* View Tabs */}
            <div className="flex items-center justify-between border-b border-[#e5e1d8] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('security_txt')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                    activeTab === 'security_txt'
                      ? 'bg-[#1e293b] text-white'
                      : 'bg-[#faf9f7] text-[#6b6460] hover:bg-[#e5e1d8]',
                  )}
                >
                  security.txt (RFC 9116)
                </button>
                <button
                  onClick={() => setActiveTab('cvd_policy')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                    activeTab === 'cvd_policy'
                      ? 'bg-[#1e293b] text-white'
                      : 'bg-[#faf9f7] text-[#6b6460] hover:bg-[#e5e1d8]',
                  )}
                >
                  CVD Policy (TR-03183-3 §4.4)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded border border-[#e5e1d8] px-2.5 py-1 text-xs font-semibold text-[#1a1917] hover:bg-[#faf9f7]"
                >
                  {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                  {copied ? t.txt.copied : t.txt.copy}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  <Download size={13} />
                  {t.txt.download}
                </button>
              </div>
            </div>

            {/* Code / Text Preview */}
            <div className="flex-1 overflow-auto rounded-lg border border-[#e5e1d8] bg-[#faf9f7] p-4 font-mono text-xs text-[#1a1917] whitespace-pre leading-relaxed">
              {currentContent}
            </div>

            <p className="mt-2 text-[10px] text-[#6b6460]">
              {t.txt.hintA}<code>security.txt</code>{t.txt.hintB}<code>https://{domain}/.well-known/security.txt</code>{t.txt.hintC}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
