'use client';

import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Cpu, Car, Factory, Globe, Wifi, Bluetooth, Signal, Network, MessageSquare, Wrench, Cloud, Server, HardDrive, Users, ShieldAlert, Plug, Check, ShieldCheck } from 'lucide-react';
import type { SystemType, ConnectionType, StorageType, BoundaryType, WizardAnswers } from './generateDiagram';

interface Props {
  initialName?: string;
  initialDescription?: string;
  onComplete: (answers: WizardAnswers) => void;
  onSkip: (name: string, description: string) => void;
  onCancel: () => void;
}

// ─── Step data ────────────────────────────────────────────────────────────────

const SYSTEM_TYPES: { value: SystemType; label: string; desc: string; Icon: React.ElementType }[] = [
  { value: 'iot',       label: 'IoT Device',            desc: 'Sensor, Actuator, Smart Home Device',  Icon: Cpu },
  { value: 'vehicle',   label: 'Vehicle Control Unit',  desc: 'ECU, Gateway, Telematics Unit',         Icon: Car },
  { value: 'industrial',label: 'Industrial System',     desc: 'PLC, SCADA, OT Network',               Icon: Factory },
  { value: 'web',       label: 'Web Software',          desc: 'Web App, API, Cloud Service',           Icon: Globe },
];

const CONNECTION_TYPES: { value: ConnectionType; label: string; Icon: React.ElementType }[] = [
  { value: 'wifi',      label: 'Wi-Fi',         Icon: Wifi },
  { value: 'bluetooth', label: 'Bluetooth',     Icon: Bluetooth },
  { value: 'cellular',  label: 'Cellular',      Icon: Signal },
  { value: 'lan',       label: 'Wired Network', Icon: Network },
  { value: 'mqtt',      label: 'MQTT',          Icon: MessageSquare },
  { value: 'obd',       label: 'OBD / CAN Bus', Icon: Wrench },
];

const STORAGE_TYPES: { value: StorageType; label: string; desc: string; Icon: React.ElementType }[] = [
  { value: 'cloud',  label: 'Cloud',           desc: 'Data stored at cloud provider',            Icon: Cloud },
  { value: 'local',  label: 'Local Server',    desc: 'On-premises server in own network',        Icon: Server },
  { value: 'device', label: 'On Device Only',  desc: 'No external storage',                      Icon: HardDrive },
  { value: 'none',   label: 'No Data Storage', desc: 'System stores no data',                    Icon: HardDrive },
];

const BOUNDARY_TYPES: { value: BoundaryType; label: string; desc: string; Icon: React.ElementType }[] = [
  { value: 'external',    label: 'External Users / Internet',   desc: 'Users or attackers from outside',   Icon: Users },
  { value: 'maintenance', label: 'Maintenance Staff',           desc: 'Physical access by technicians',    Icon: ShieldAlert },
  { value: 'thirdparty',  label: 'External APIs / Third Parties', desc: 'Third-party services',           Icon: Plug },
];

const STEPS = ['Project', 'System Type', 'Connections', 'Data Storage', 'Trust Boundaries', 'CRA Classification'];

// ─── CRA Classification data ──────────────────────────────────────────────────

type CRAClass = 'default' | 'class-i' | 'class-ii' | 'critical';

interface AnnexOption { value: string; label: string }

const ANNEX_III_CLASS_I: AnnexOption[] = [
  { value: 'identity_mgmt',     label: 'Identity & access management software' },
  { value: 'password_mgmt',     label: 'Password managers' },
  { value: 'network_monitoring', label: 'Network monitoring & management tools' },
  { value: 'siem_edr',          label: 'Security monitoring (SIEM / EDR / AV)' },
  { value: 'firewall_ids',      label: 'Firewalls / IDS / IPS' },
  { value: 'vpn',               label: 'VPN software' },
  { value: 'smart_home',        label: 'Smart home / consumer IoT devices' },
  { value: 'microcontrollers',  label: 'Microcontrollers / microprocessors with security functions' },
];

const ANNEX_III_CLASS_II: AnnexOption[] = [
  { value: 'industrial_routers', label: 'Routers / switches for industrial use' },
  { value: 'industrial_iot',     label: 'Industrial IoT / OT devices' },
];

const ANNEX_IV: AnnexOption[] = [
  { value: 'hsm',          label: 'Hardware Security Modules (HSM)' },
  { value: 'tpm',          label: 'Trusted Platform Modules (TPM)' },
  { value: 'smartcards',   label: 'Smart cards / secure elements' },
];

function computeCRAClass(annexIII: string[], annexIV: string[]): CRAClass {
  if (annexIV.length > 0) return 'critical';
  if (ANNEX_III_CLASS_II.some((o) => annexIII.includes(o.value))) return 'class-ii';
  if (annexIII.length > 0) return 'class-i';
  return 'default';
}

const CRA_CLASS_CONFIG: Record<CRAClass, { label: string; color: string; path: string }> = {
  default:  { label: 'Default Product',               color: 'bg-gray-100 text-gray-700 border-gray-300',     path: 'Self-assessment + technical documentation' },
  'class-i':  { label: 'Important Product (Class I)',  color: 'bg-blue-100 text-blue-700 border-blue-300',     path: 'Self-assessment with harmonised standard OR notified body' },
  'class-ii': { label: 'Important Product (Class II)', color: 'bg-amber-100 text-amber-700 border-amber-300',  path: 'Notified body assessment required (Annex VI)' },
  critical:   { label: 'Critical Product (Annex IV)',  color: 'bg-red-100 text-red-700 border-red-300',        path: 'Notified body assessment under Annex IV scheme' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SetupWizard({ initialName = '', initialDescription = '', onComplete, onSkip, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [projectName, setProjectName] = useState(initialName);
  const [projectDescription, setProjectDescription] = useState(initialDescription);
  const [systemType, setSystemType] = useState<SystemType | null>(null);
  const [connections, setConnections] = useState<ConnectionType[]>([]);
  const [storage, setStorage] = useState<StorageType | null>(null);
  const [boundaries, setBoundaries] = useState<BoundaryType[]>([]);
  const [annexIII, setAnnexIII] = useState<string[]>([]);
  const [annexIV, setAnnexIV] = useState<string[]>([]);

  const totalSteps = STEPS.length;

  const canAdvance = () => {
    if (step === 0) return projectName.trim().length > 0;
    if (step === 1) return systemType !== null;
    if (step === 2) return true; // connections optional
    if (step === 3) return storage !== null;
    if (step === 4) return true; // boundaries optional
    if (step === 5) return true; // classification optional
    return false;
  };

  const toggleConnection = (v: ConnectionType) =>
    setConnections((c) => c.includes(v) ? c.filter((x) => x !== v) : [...c, v]);

  const toggleBoundary = (v: BoundaryType) =>
    setBoundaries((b) => b.includes(v) ? b.filter((x) => x !== v) : [...b, v]);

  const toggleAnnexIII = (v: string) =>
    setAnnexIII((a) => a.includes(v) ? a.filter((x) => x !== v) : [...a, v]);

  const toggleAnnexIV = (v: string) =>
    setAnnexIV((a) => a.includes(v) ? a.filter((x) => x !== v) : [...a, v]);

  const handleFinish = () => {
    onComplete({
      projectName: projectName.trim(),
      projectDescription: projectDescription.trim(),
      systemType: systemType!,
      connections,
      storage: storage!,
      boundaries,
    });
  };

  const inputClass = 'w-full rounded-lg border border-[#e5e1d8] bg-white px-3 py-2 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e1d8] px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#1a1917]">New Project</h2>
            <p className="text-xs text-[#6b6460] mt-0.5">Step {step + 1} of {totalSteps}: {STEPS[step]}</p>
          </div>
          <button onClick={onCancel} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#c8c0b0] hover:bg-[#f4f1ec] hover:text-[#6b6460] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#f4f1ec] shrink-0">
          <div
            className="h-1 bg-[#1e293b] transition-all duration-300"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step 0: Project name */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-[#44403c]">What is your project called and what will be analyzed?</p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#6b6460]">Project Name *</label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="e.g. Smart Charger v2"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && canAdvance() && setStep(1)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#6b6460]">Description (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Risk assessment for EV charging protocol"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: System type */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-[#44403c]">What do you want to analyze?</p>
              <div className="grid grid-cols-2 gap-3">
                {SYSTEM_TYPES.map(({ value, label, desc, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setSystemType(value)}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
                      systemType === value
                        ? 'border-[#1e293b] bg-[#1e293b] text-white'
                        : 'border-[#e5e1d8] bg-white text-[#1a1917] hover:border-[#1e293b] hover:bg-[#f4f1ec]'
                    }`}
                  >
                    <Icon size={20} className={systemType === value ? 'text-white' : 'text-[#6b6460]'} />
                    <div>
                      <div className="text-sm font-semibold">{label}</div>
                      <div className={`text-xs mt-0.5 ${systemType === value ? 'text-white/70' : 'text-[#6b6460]'}`}>{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Connections */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-[#44403c]">How does the system exchange data? <span className="text-[#9ca3af]">(multiple selection)</span></p>
              <div className="grid grid-cols-2 gap-2">
                {CONNECTION_TYPES.map(({ value, label, Icon }) => {
                  const active = connections.includes(value);
                  return (
                    <button
                      key={value}
                      onClick={() => toggleConnection(value)}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                        active
                          ? 'border-[#1e293b] bg-[#1e293b] text-white'
                          : 'border-[#e5e1d8] bg-white text-[#1a1917] hover:border-[#1e293b] hover:bg-[#f4f1ec]'
                      }`}
                    >
                      <Icon size={16} className={active ? 'text-white' : 'text-[#6b6460]'} />
                      <span className="text-sm font-medium">{label}</span>
                      {active && <Check size={14} className="ml-auto text-white" />}
                    </button>
                  );
                })}
              </div>
              {connections.length === 0 && (
                <p className="text-xs text-[#9ca3af]">Skip if no external communication.</p>
              )}
            </div>
          )}

          {/* Step 3: Storage */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-[#44403c]">Where does the system store data?</p>
              <div className="space-y-2">
                {STORAGE_TYPES.map(({ value, label, desc, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setStorage(value)}
                    className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all ${
                      storage === value
                        ? 'border-[#1e293b] bg-[#1e293b] text-white'
                        : 'border-[#e5e1d8] bg-white text-[#1a1917] hover:border-[#1e293b] hover:bg-[#f4f1ec]'
                    }`}
                  >
                    <Icon size={18} className={storage === value ? 'text-white' : 'text-[#6b6460]'} />
                    <div>
                      <div className="text-sm font-semibold">{label}</div>
                      <div className={`text-xs mt-0.5 ${storage === value ? 'text-white/70' : 'text-[#6b6460]'}`}>{desc}</div>
                    </div>
                    {storage === value && <Check size={16} className="ml-auto text-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Trust boundaries */}
          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-[#44403c]">Which parties have access to the system? <span className="text-[#9ca3af]">(multiple selection)</span></p>
              <div className="space-y-2">
                {BOUNDARY_TYPES.map(({ value, label, desc, Icon }) => {
                  const active = boundaries.includes(value);
                  return (
                    <button
                      key={value}
                      onClick={() => toggleBoundary(value)}
                      className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all ${
                        active
                          ? 'border-[#1e293b] bg-[#1e293b] text-white'
                          : 'border-[#e5e1d8] bg-white text-[#1a1917] hover:border-[#1e293b] hover:bg-[#f4f1ec]'
                      }`}
                    >
                      <Icon size={18} className={active ? 'text-white' : 'text-[#6b6460]'} />
                      <div>
                        <div className="text-sm font-semibold">{label}</div>
                        <div className={`text-xs mt-0.5 ${active ? 'text-white/70' : 'text-[#6b6460]'}`}>{desc}</div>
                      </div>
                      {active && <Check size={16} className="ml-auto text-white" />}
                    </button>
                  );
                })}
              </div>
              {boundaries.length === 0 && (
                <p className="text-xs text-[#9ca3af]">Skip if no external access is expected.</p>
              )}
            </div>
          )}

          {/* Step 5: CRA Classification */}
          {step === 5 && (() => {
            const craClass = computeCRAClass(annexIII, annexIV);
            const cfg = CRA_CLASS_CONFIG[craClass];
            return (
              <div className="space-y-5">
                <p className="text-sm text-[#44403c]">
                  Does your product fall into any regulated categories? <span className="text-[#9ca3af]">(optional, multiple selection)</span>
                </p>

                {/* Annex III Class I */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6b6460]">Annex III - Class I</p>
                  <div className="space-y-1.5">
                    {ANNEX_III_CLASS_I.map(({ value, label }) => {
                      const active = annexIII.includes(value);
                      return (
                        <button
                          key={value}
                          onClick={() => toggleAnnexIII(value)}
                          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                            active
                              ? 'border-[#1e293b] bg-[#1e293b] text-white'
                              : 'border-[#e5e1d8] bg-white text-[#1a1917] hover:border-[#1e293b] hover:bg-[#f4f1ec]'
                          }`}
                        >
                          <span className="flex-1">{label}</span>
                          {active && <Check size={14} className="shrink-0 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Annex III Class II */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6b6460]">Annex III - Class II</p>
                  <div className="space-y-1.5">
                    {ANNEX_III_CLASS_II.map(({ value, label }) => {
                      const active = annexIII.includes(value);
                      return (
                        <button
                          key={value}
                          onClick={() => toggleAnnexIII(value)}
                          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                            active
                              ? 'border-amber-600 bg-amber-600 text-white'
                              : 'border-[#e5e1d8] bg-white text-[#1a1917] hover:border-amber-400 hover:bg-amber-50'
                          }`}
                        >
                          <span className="flex-1">{label}</span>
                          {active && <Check size={14} className="shrink-0 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Annex IV */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6b6460]">Annex IV - Critical Products</p>
                  <div className="space-y-1.5">
                    {ANNEX_IV.map(({ value, label }) => {
                      const active = annexIV.includes(value);
                      return (
                        <button
                          key={value}
                          onClick={() => toggleAnnexIV(value)}
                          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                            active
                              ? 'border-red-600 bg-red-600 text-white'
                              : 'border-[#e5e1d8] bg-white text-[#1a1917] hover:border-red-400 hover:bg-red-50'
                          }`}
                        >
                          <span className="flex-1">{label}</span>
                          {active && <Check size={14} className="shrink-0 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Result badge */}
                <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cfg.color}`}>
                  <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{cfg.label}</p>
                    <p className="text-xs mt-0.5 opacity-80">Conformity path: {cfg.path}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#e5e1d8] px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 rounded-lg border border-[#e5e1d8] px-3 py-2 text-sm text-[#6b6460] hover:bg-[#f4f1ec] transition-colors"
              >
                <ChevronLeft size={15} /> Back
              </button>
            )}
            <button
              onClick={() => onSkip(projectName.trim(), projectDescription.trim())}
              className="rounded-lg px-3 py-2 text-xs text-[#9ca3af] hover:text-[#6b6460] transition-colors"
            >
              Empty Project
            </button>
          </div>

          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-1.5 rounded-lg bg-[#1e293b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#374151] disabled:opacity-40 transition-colors"
            >
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 rounded-lg bg-[#1e293b] px-5 py-2 text-sm font-semibold text-white hover:bg-[#374151] transition-colors"
            >
              Generate Canvas
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
