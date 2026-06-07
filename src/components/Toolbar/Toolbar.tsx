import { useRef, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Save, Upload, Trash2, Shield, Layers, BarChart2, Brain, History, LogOut, Route,
  Lock, GitBranch, FileText, ChevronDown, User, ArrowLeft, Settings, StickyNote,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { SubscriptionBadge } from '@/components/Subscription/SubscriptionBadge';
import { AICreditCounter } from '@/components/Subscription/AICreditCounter';
import { useTierGuard } from '@/hooks/useTierGuard';
import { PaywallModal } from '@/components/Paywall/PaywallModal';
import { calculateCompliance, getRequirementsForSL, type SLLevel, type IECPart } from '@/data/iec62443';
import type { IEC62443Mapping, NodeData } from '@/types';
import { cn } from '@/utils/cn';
import { useDiagramStore } from '@/store/diagramStore';
import { useProjectStore, selectIsLocked } from '@/store/projectStore';
import { saveDiagram } from '@/actions/diagrams';
import { importFromDrawio } from '@/utils/drawioImport';
import type { CollabUser } from '@/types';
import { useLanguageStore } from '@/store/languageStore';
import { useT } from '@/hooks/useT';

interface ToolbarProps {
  diagramId: string;
  diagramName: string;
  onOpenTemplates: () => void;
  onOpenAI: () => void;
  onOpenVersions: () => void;
  onOpenAttackPaths: () => void;
  onOpenDocuments: () => void;
  onOpenNotes: () => void;
  versionsOpen: boolean;
  attackPathsOpen: boolean;
  documentsOpen: boolean;
  notesOpen: boolean;
  user?: { id: string; name: string; color: string; tier: string; companyLogo?: string; companyName?: string };
  onFreezeBaseline?: () => void;
  onBranchProject?: () => void;
}

function ToolbarDivider() {
  return <div className="h-5 w-px bg-gray-800" />;
}

function ToolbarBtn({
  onClick,
  title,
  children,
  active,
}: {
  onClick?: () => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-white',
        active && 'bg-indigo-600 text-white',
      )}
    >
      {children}
    </button>
  );
}

function UserAvatar({ user }: { user: Pick<CollabUser, 'username' | 'color'> }) {
  return (
    <div
      title={user.username}
      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow-sm"
      style={{ backgroundColor: user.color }}
    >
      {user.username.slice(0, 2).toUpperCase()}
    </div>
  );
}

function DropdownButton({
  label,
  isOpen,
  onClick,
}: {
  label: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white',
        isOpen && 'bg-gray-800 text-white',
      )}
    >
      {label}
      <ChevronDown
        size={12}
        className={cn('transition-transform duration-150', isOpen && 'rotate-180')}
      />
    </button>
  );
}

function DropdownItem({
  onClick,
  icon,
  label,
  danger,
  active,
  indigo,
  disabled,
  comingSoon,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  active?: boolean;
  indigo?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
        'text-gray-300 hover:bg-gray-800',
        danger && 'text-red-400 hover:bg-red-900/30',
        active && 'bg-gray-800 font-semibold',
        indigo && 'text-indigo-400 hover:bg-indigo-900/30',
        disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {comingSoon && (
        <span className="rounded-full bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
          Beta
        </span>
      )}
    </button>
  );
}

function DropdownSeparator() {
  return <div className="my-1 h-px bg-gray-800" />;
}

export function Toolbar({
  diagramId,
  diagramName,
  onOpenTemplates,
  onOpenAI,
  onOpenVersions,
  onOpenAttackPaths,
  onOpenDocuments,
  onOpenNotes,
  versionsOpen,
  attackPathsOpen,
  documentsOpen,
  notesOpen,
  user,
  onFreezeBaseline,
  onBranchProject,
}: ToolbarProps) {
  const { nodes, edges, viewport, collaborators, setNodes, setEdges } = useDiagramStore();
  const isLocked = useProjectStore(selectIsLocked);
  const { lang, toggleLang } = useLanguageStore();
  const t = useT();

  const [fileOpen, setFileOpen] = useState(false);
  const [analyseOpen, setAnalyseOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const fileRef = useRef<HTMLDivElement>(null);
  const analyseRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fileRef.current && !fileRef.current.contains(e.target as Node)) setFileOpen(false);
      if (analyseRef.current && !analyseRef.current.contains(e.target as Node)) setAnalyseOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const complianceScore = useMemo(() => {
    const allMappings: { requirementId: string; status: IEC62443Mapping['status'] }[] = [];
    let totalReqs = 0;
    for (const node of nodes) {
      const data = node.data as NodeData;
      if (!data.securityLevel) continue;
      const sl = Number(String(data.securityLevel).replace('SL-', '')) as SLLevel;
      const part = (data.iecPart ?? '4-2') as IECPart;
      const reqs = getRequirementsForSL(sl, part);
      totalReqs += reqs.length;
      const mappings = (data.iec62443 ?? []) as IEC62443Mapping[];
      allMappings.push(...mappings.map((m) => ({ requirementId: m.requirementId, status: m.status })));
    }
    if (totalReqs === 0) return null;
    const allReqs = nodes.flatMap((n) => {
      const data = n.data as NodeData;
      if (!data.securityLevel) return [];
      const sl = Number(String(data.securityLevel).replace('SL-', '')) as SLLevel;
      const part = (data.iecPart ?? '4-2') as IECPart;
      return getRequirementsForSL(sl, part);
    });
    return calculateCompliance(allMappings, allReqs).score;
  }, [nodes]);

  const aiGuard = useTierGuard('ai');
  const attackGuard = useTierGuard('attackPaths');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDiagram(diagramId, { nodes, edges, viewport });
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDrawioImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const xml = ev.target?.result as string;
      const { nodes: n, edges: ed } = importFromDrawio(xml);
      setNodes(n);
      setEdges(ed);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearCanvas = () => {
    if (window.confirm(t.clearConfirm)) {
      setNodes([]);
      setEdges([]);
    }
  };

  const collabCount = collaborators.size;

  return (
    <header className="relative flex h-12 shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-3 gap-2">
      {/* Logo + diagram name */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/dashboard"
          title={t.toolbar.backToProjects}
          className="flex items-center gap-1 shrink-0 rounded-lg px-2 h-8 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">{t.toolbar.backToProjects}</span>
        </Link>
        <ToolbarDivider />
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
            <Shield size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-white hidden md:block">CyberRisk Canvas</span>
        </div>
        <ToolbarDivider />
        <span className="text-sm font-medium text-gray-400 truncate max-w-[200px]">{diagramName}</span>
      </div>

      {/* Center actions */}
      <div className="flex items-center gap-0.5">
        {!isLocked && (
          <>
            <ToolbarBtn title={t.toolbar.save} onClick={handleSave} active={saving}>
              <Save size={16} className={saving ? 'animate-pulse' : ''} />
            </ToolbarBtn>

            <ToolbarDivider />

            {/* File dropdown */}
            <div ref={fileRef} className="relative">
              <DropdownButton
                label={t.toolbar.fileMenu}
                isOpen={fileOpen}
                onClick={() => { setFileOpen((v) => !v); setAnalyseOpen(false); setAccountOpen(false); }}
              />
              {fileOpen && (
                <div className="absolute left-0 top-full mt-1 w-52 rounded-xl border border-gray-800 bg-gray-900 py-1.5 shadow-lg z-50 px-1.5">
                  <DropdownItem
                    onClick={() => { fileInputRef.current?.click(); setFileOpen(false); }}
                    icon={<Upload size={14} />}
                    label={t.toolbar.importDrawio}
                  />
                  <DropdownItem
                    onClick={() => { onOpenTemplates(); setFileOpen(false); }}
                    icon={<Layers size={14} />}
                    label={t.toolbar.loadTemplate}
                  />
                  <DropdownItem
                    onClick={() => { onOpenVersions(); setFileOpen(false); }}
                    icon={<History size={14} />}
                    label={t.toolbar.versionHistory}
                    active={versionsOpen}
                  />
                  <DropdownSeparator />
                  <DropdownItem
                    onClick={() => { handleClearCanvas(); setFileOpen(false); }}
                    icon={<Trash2 size={14} />}
                    label={t.toolbar.clearCanvas}
                    danger
                  />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.drawio"
              className="hidden"
              onChange={handleDrawioImport}
            />

            {/* Analyse dropdown */}
            <div ref={analyseRef} className="relative">
              <DropdownButton
                label={t.toolbar.analyseMenu}
                isOpen={analyseOpen}
                onClick={() => { setAnalyseOpen((v) => !v); setFileOpen(false); setAccountOpen(false); }}
              />
              {analyseOpen && (
                <div className="absolute left-0 top-full mt-1 w-52 rounded-xl border border-gray-800 bg-gray-900 py-1.5 shadow-lg z-50 px-1.5">
                  <DropdownItem
                    onClick={() => { if (aiGuard.allowed) onOpenAI(); else aiGuard.showPaywall(); setAnalyseOpen(false); }}
                    icon={<Brain size={14} />}
                    label={t.toolbar.aiAnalysisLabel}
                    indigo
                    disabled
                    comingSoon
                  />
                  <DropdownItem
                    onClick={() => { if (attackGuard.allowed) onOpenAttackPaths(); else attackGuard.showPaywall(); setAnalyseOpen(false); }}
                    icon={<Route size={14} />}
                    label={t.toolbar.attackPaths}
                    active={attackPathsOpen}
                  />
                  <DropdownItem
                    onClick={() => { onOpenDocuments(); setAnalyseOpen(false); }}
                    icon={<FileText size={14} />}
                    label={t.toolbar.documents}
                    active={documentsOpen}
                  />
                  <DropdownItem
                    onClick={() => { onOpenNotes(); setAnalyseOpen(false); }}
                    icon={<StickyNote size={14} />}
                    label="Notizen"
                    active={notesOpen}
                  />
                </div>
              )}
            </div>

            {aiGuard.paywallVisible && (
              <PaywallModal
                currentTier={aiGuard.tier}
                requiredTier={aiGuard.requiredTier}
                onClose={aiGuard.hidePaywall}
              />
            )}
            {attackGuard.paywallVisible && (
              <PaywallModal
                currentTier={attackGuard.tier}
                requiredTier={attackGuard.requiredTier}
                onClose={attackGuard.hidePaywall}
              />
            )}

            <ToolbarDivider />
          </>
        )}

        {isLocked && (
          <>
            <ToolbarBtn title={t.toolbar.versionHistory} onClick={onOpenVersions} active={versionsOpen}>
              <History size={16} />
            </ToolbarBtn>
            <ToolbarDivider />
          </>
        )}

        <Link
          href={`/diagram/${diagramId}/dashboard`}
          title={t.toolbar.dashboard}
          data-tour="export-btn"
          className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[#6b6460] transition-colors hover:bg-[#f4f1ec] hover:text-[#1a1917]"
        >
          <BarChart2 size={15} />
          <span className="hidden md:inline">{t.toolbar.dashboard}</span>
        </Link>

        <ToolbarDivider />

        {isLocked ? (
          <button
            onClick={onBranchProject}
            title={t.toolbar.branchProject}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-100 px-2.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-600 hover:text-white"
          >
            <GitBranch size={14} />
            <span className="hidden md:inline">{t.toolbar.branchProject}</span>
          </button>
        ) : (
          <button
            onClick={onFreezeBaseline}
            title={t.toolbar.freezeBaseline}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500 hover:text-white"
          >
            <Lock size={14} />
            <span className="hidden md:inline">{t.toolbar.freezeBaseline}</span>
          </button>
        )}
      </div>

      {/* Right side: badges + collaborators + account */}
      <div className="flex items-center gap-2 shrink-0">
        <SubscriptionBadge />
        <AICreditCounter />

        {complianceScore !== null && (
          <div
            title={t.toolbar.complianceScore}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold shrink-0',
              complianceScore >= 80 && 'bg-green-100 text-green-700',
              complianceScore >= 50 && complianceScore < 80 && 'bg-yellow-100 text-yellow-700',
              complianceScore < 50 && 'bg-red-100 text-red-700',
            )}
          >
            <Shield size={12} />
            {complianceScore}%
          </div>
        )}

        {/* Collaborators */}
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-2">
            {user && <UserAvatar user={{ username: user.name, color: user.color }} />}
            {Array.from(collaborators.values()).slice(0, 3).map((u) => (
              <UserAvatar key={u.userId} user={u} />
            ))}
            {collabCount > 3 && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f4f1ec] text-[11px] font-bold text-[#6b6460] border-2 border-white">
                +{collabCount - 3}
              </span>
            )}
          </div>
          {collabCount > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              {collabCount + 1} {t.toolbar.online}
            </div>
          )}
        </div>

        {/* Account dropdown */}
        {user && (
          <div ref={accountRef} className="relative">
            <button
              onClick={() => { setAccountOpen((v) => !v); setFileOpen(false); setAnalyseOpen(false); }}
              title={t.toolbar.accountSettings}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg text-[#6b6460] transition-colors hover:bg-[#f4f1ec] hover:text-[#1a1917]',
                accountOpen && 'bg-[#f4f1ec] text-[#1a1917]',
              )}
            >
              <User size={14} />
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-[#e5e1d8] bg-white py-1.5 shadow-lg z-50 px-1.5">
                {/* User info */}
                {user && (
                  <div className="px-3 py-2 mb-0.5">
                    <p className="text-xs font-semibold text-[#1a1714] truncate">{user.name}</p>
                    <p className="text-[11px] text-[#9b9590] truncate">{user.tier === 'pro' ? 'Pro' : 'Free'}</p>
                  </div>
                )}
                <DropdownSeparator />
                <Link
                  href="/settings"
                  onClick={() => setAccountOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#3d3937] transition-colors hover:bg-[#f4f1ec]"
                >
                  <Settings size={14} />
                  {t.toolbar.accountSettings}
                </Link>
                <DropdownSeparator />
                <button
                  onClick={() => { toggleLang(); setAccountOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#3d3937] transition-colors hover:bg-[#f4f1ec]"
                >
                  <span>{lang === 'en' ? '🇬🇧' : '🇩🇪'}</span>
                  <span>{lang === 'en' ? 'English' : 'Deutsch'}</span>
                </button>
                <DropdownSeparator />
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut size={14} />
                  {t.toolbar.signOut}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
