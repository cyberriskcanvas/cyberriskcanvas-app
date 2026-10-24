import { useModelCheckT } from '@/i18n/modelCheck';
import { useState } from 'react';
import { useDiagramStore } from '@/store/diagramStore';
import { useProjectStore } from '@/store/projectStore';
import type { NodeData, HardwareComponentType, SoftwareComponentType, BoundaryType } from '@/types';
import { useT } from '@/hooks/useT';

const SL_OPTIONS = ['SL-1', 'SL-2', 'SL-3', 'SL-4'] as const;
const PART_OPTIONS = ['4-2', '3-3'] as const;

const HW_TYPES: HardwareComponentType[] = ['ecu', 'sensor', 'actuator', 'gateway', 'hsm', 'obd', 'telematics', 'custom'];
const SW_TYPES: SoftwareComponentType[] = ['os', 'firmware', 'application', 'library', 'network_service', 'bootloader', 'custom'];
const B_TYPES: BoundaryType[] = ['trust-zone', 'network-segment', 'physical-zone', 'logical-zone', 'cloud-zone'];

const inputClass = 'w-full rounded-lg border border-[#e5e1d8] bg-white px-3 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none';
const selectClass = 'w-full rounded-lg border border-[#e5e1d8] bg-white px-3 py-1.5 text-sm text-[#1a1917] focus:border-[#1e293b] focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#6b6460] mb-1">{label}</label>
      {children}
    </div>
  );
}

interface Props {
  nodeId: string;
  data: NodeData;
  nodeType: string;
}

export function OverviewTab({ nodeId, data, nodeType }: Props) {
  const { updateNodeData } = useDiagramStore();
  const iec62443 = useProjectStore((s) => s.iec62443);
  const [label, setLabel] = useState(String(data.label ?? ''));
  const [desc, setDesc] = useState(String(data.description ?? ''));
  const [version, setVersion] = useState(String(data.version ?? ''));
  const tr = useT();
  const ov = tr.overview;
  const mc = useModelCheckT();

  const save = (partial: Partial<NodeData>) => updateNodeData(nodeId, partial);

  return (
    <div className="space-y-4 p-4">
      <Field label={ov.name}>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => save({ label })}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save({ label }); } }}
          placeholder={ov.namePlaceholder}
          className={inputClass}
        />
      </Field>

      {nodeType !== 'boundary' && (
        <Field label={ov.componentType}>
          <select
            value={String(data.componentType ?? 'custom')}
            onChange={(v) => save({ componentType: v.target.value as HardwareComponentType | SoftwareComponentType })}
            className={selectClass}
          >
            {(nodeType === 'hardware' ? HW_TYPES : SW_TYPES).map((t) => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </Field>
      )}

      {nodeType === 'boundary' && (
        <Field label={ov.boundaryType}>
          <select
            value={String(data.boundaryType ?? 'logical-zone')}
            onChange={(v) => save({ boundaryType: v.target.value as BoundaryType })}
            className={selectClass}
          >
            {B_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace('-', ' ')}</option>
            ))}
          </select>
        </Field>
      )}

      {nodeType === 'software' && (
        <Field label={ov.version}>
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            onBlur={() => save({ version })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save({ version }); } }}
            placeholder={ov.versionPlaceholder}
            className={inputClass}
          />
        </Field>
      )}

      <Field label={ov.description}>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => save({ description: desc })}
          placeholder={ov.descPlaceholder}
          rows={3}
          className="w-full rounded-lg border border-[#e5e1d8] bg-white px-3 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none resize-none"
        />
      </Field>

      {nodeType !== 'boundary' && (
        <>
          {iec62443 && <Field label={ov.securityLevel}>
            <select
              value={String(data.securityLevel ?? '')}
              onChange={(v) => save({ securityLevel: v.target.value as NodeData['securityLevel'] })}
              className={selectClass}
            >
              <option value="">{ov.notSet}</option>
              {SL_OPTIONS.map((sl) => (
                <option key={sl} value={sl}>{sl}</option>
              ))}
            </select>
          </Field>}

          <div className="space-y-3 rounded-lg border border-[#e5e1d8] bg-[#faf9f7] p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6460]">{mc.facts.title}</p>
            <Field label={mc.facts.exposure}>
              <select value={String(data.exposure ?? '')} onChange={(v) => save({ exposure: (v.target.value || undefined) as NodeData['exposure'] })} className={selectClass}>
                <option value="">{mc.facts.notSet}</option>
                {(Object.keys(mc.facts.exposureOptions) as Array<keyof typeof mc.facts.exposureOptions>).map((k) => <option key={k} value={k}>{mc.facts.exposureOptions[k]}</option>)}
              </select>
            </Field>
            <Field label={mc.facts.authentication}>
              <select value={String(data.authentication ?? '')} onChange={(v) => save({ authentication: (v.target.value || undefined) as NodeData['authentication'] })} className={selectClass}>
                <option value="">{mc.facts.notSet}</option>
                {(Object.keys(mc.facts.authenticationOptions) as Array<keyof typeof mc.facts.authenticationOptions>).map((k) => <option key={k} value={k}>{mc.facts.authenticationOptions[k]}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-xs text-[#3d3a36]">
              <input type="checkbox" checked={!!data.personalData} onChange={(e) => save({ personalData: e.target.checked || undefined })} />
              {mc.facts.personalData}
            </label>
          </div>

          {iec62443 && <Field label={ov.iecPart}>
            <select
              value={String(data.iecPart ?? '4-2')}
              onChange={(v) => save({ iecPart: v.target.value as '4-2' | '3-3' })}
              className={selectClass}
            >
              {PART_OPTIONS.map((p) => (
                <option key={p} value={p}>IEC 62443-{p}</option>
              ))}
            </select>
          </Field>}
        </>
      )}
    </div>
  );
}
