'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, Shield, Folder, Calendar, ChevronRight, ChevronDown,
  AlertCircle, Settings, LogOut, Lock, ShieldCheck, ShieldAlert, GitCommitHorizontal,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { createProject, deleteProject } from '@/actions/projects';
import { usePaywallStore } from '@/store/paywallStore';
import { SetupWizard } from '@/components/Wizard/SetupWizard';
import { generateDiagram } from '@/components/Wizard/generateDiagram';
import type { WizardAnswers } from '@/components/Wizard/generateDiagram';
import type { Project } from '@/types';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';

type ProjectWithMeta = Project & {
  _count?: { diagrams: number };
  diagrams?: { id: string }[];
};

function ProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: ProjectWithMeta;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const versions = project.versions ?? [];
  const activeVersion = versions.find((v) => v.status === 'active');
  const frozenCount = versions.filter((v) => v.status === 'frozen').length;
  const hasVersions = versions.length > 0;

  return (
    <div
      onClick={onOpen}
      className="group relative cursor-pointer rounded-xl border border-[#e5e1d8] bg-white p-5 transition-all hover:border-[#1e293b] hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e5e1d8] bg-[#f4f1ec]">
            <Shield size={17} className="text-[#1e293b]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold truncate text-[#1a1917] group-hover:text-[#1e293b]">
                {project.name}
              </span>
              {hasVersions && activeVersion && (
                <span className="shrink-0 rounded-full bg-[#f4f1ec] px-2 py-0.5 text-[10px] font-semibold text-[#6b6460]">
                  v{activeVersion.number}
                </span>
              )}
              {frozenCount > 0 && (
                <span className="shrink-0 flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  <Lock size={9} />
                  {frozenCount} eingefroren
                </span>
              )}
            </div>
            {project.description && (
              <p className="mt-0.5 text-xs text-[#6b6460] line-clamp-1">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div className="flex items-center gap-1 text-[11px] text-[#c8c0b0]">
            <Calendar size={11} />
            <span className="hidden sm:inline">{formatDate(project.updatedAt)}</span>
          </div>
          <button
            onClick={onDelete}
            className="ml-1 opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-lg text-[#c8c0b0] hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <Trash2 size={13} />
          </button>
          <ChevronRight size={14} className="text-[#c8c0b0] group-hover:text-[#1e293b] transition-colors" />
        </div>
      </div>

      {/* Version timeline strip */}
      {frozenCount > 0 && (
        <div className="mt-3 flex items-center gap-1 overflow-x-auto">
          {versions
            .slice()
            .sort((a, b) => a.number - b.number)
            .map((v) => (
              <div
                key={v.id}
                title={v.label ? `v${v.number}: ${v.label}` : `v${v.number}`}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0',
                  v.status === 'frozen'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-[#f4f1ec] text-[#6b6460]',
                )}
              >
                <GitCommitHorizontal size={9} />
                v{v.number}{v.label ? ` · ${v.label}` : ''}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  initialProjects: ProjectWithMeta[];
  canViewSecurity?: boolean;
}

export default function ProjectListClient({ initialProjects, canViewSecurity }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';
  const [isPending, startTransition] = useTransition();
  const [projects, setProjects] = useState(initialProjects);
  const [showWizard, setShowWizard] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showPaywall = usePaywallStore((s) => s.showPaywall);
  void showPaywall;
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserMenu]);

  const doCreate = (name: string, description: string, nodes?: ReturnType<typeof generateDiagram>['nodes'], edges?: ReturnType<typeof generateDiagram>['edges']) => {
    startTransition(async () => {
      try {
        const project = await createProject(name, description || undefined, undefined, nodes, edges);
        router.push(`/diagram/${(project as unknown as { diagrams?: { id: string }[] }).diagrams?.[0]?.id ?? ''}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create project');
      }
    });
  };

  const handleWizardComplete = (answers: WizardAnswers) => {
    const { nodes, edges } = generateDiagram(answers);
    setShowWizard(false);
    doCreate(answers.projectName, answers.projectDescription, nodes, edges);
  };

  const handleWizardSkip = (name: string, description: string) => {
    setShowWizard(false);
    doCreate(name, description);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Dieses Projekt und alle Diagramme löschen?')) return;
    startTransition(async () => {
      try {
        await deleteProject(id);
        setProjects((p) => p.filter((proj) => proj.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete project');
      }
    });
  };

  const openProject = (project: ProjectWithMeta) => {
    router.push(`/diagram/${project.diagrams?.[0]?.id ?? ''}`);
  };

  const navBtnClass = 'flex items-center gap-1.5 rounded-lg border border-[#e5e1d8] px-3 py-2 text-sm text-[#6b6460] hover:bg-[#f4f1ec] hover:text-[#1a1917] transition-colors';
  const userName = session?.user?.name ?? session?.user?.email ?? '';
  const userInitials = (userName || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {showWizard && (
        <SetupWizard
          onComplete={handleWizardComplete}
          onSkip={handleWizardSkip}
          onCancel={() => setShowWizard(false)}
        />
      )}

      <header className="border-b border-[#e5e1d8] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e293b]">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#1a1917]">CyberRisk Canvas</h1>
              <p className="text-[11px] text-[#6b6460]">Cybersecurity Platform · IEC 62443</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => router.push('/admin')} className={navBtnClass}>
                <ShieldCheck size={15} /> <span className="hidden md:inline">Administration</span>
              </button>
            )}
            {canViewSecurity && (
              <button onClick={() => router.push('/security')} className={navBtnClass}>
                <ShieldAlert size={15} /> <span className="hidden md:inline">Security Overview</span>
              </button>
            )}
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 rounded-lg bg-[#1e293b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#374151] transition-colors"
            >
              <Plus size={16} /> New Project
            </button>

            <div className="relative ml-1" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-[#e5e1d8] py-1.5 pl-1.5 pr-2 text-sm text-[#6b6460] hover:bg-[#f4f1ec] hover:text-[#1a1917] transition-colors"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1e293b] text-[11px] font-semibold text-white">
                  {userInitials}
                </span>
                <ChevronDown size={14} className={cn('transition-transform', showUserMenu && 'rotate-180')} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full z-10 mt-2 w-56 overflow-hidden rounded-lg border border-[#e5e1d8] bg-white shadow-lg">
                  <div className="border-b border-[#e5e1d8] px-3.5 py-3">
                    <p className="truncate text-sm font-semibold text-[#1a1917]">{userName || 'Account'}</p>
                    {session?.user?.email && (
                      <p className="truncate text-xs text-[#6b6460]">{session.user.email}</p>
                    )}
                  </div>
                  <button
                    onClick={() => { setShowUserMenu(false); router.push('/settings'); }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-[#6b6460] hover:bg-[#f4f1ec] hover:text-[#1a1917] transition-colors"
                  >
                    <Settings size={15} /> Account Settings
                  </button>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-[#6b6460] hover:bg-[#f4f1ec] hover:text-[#1a1917] transition-colors"
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {isPending && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#e5e1d8] bg-white px-5 py-4 text-sm text-[#6b6460]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1e293b] border-t-transparent" />
            Creating project…
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} />{error}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e5e1d8] bg-white">
              <Folder size={28} className="text-[#c8c0b0]" />
            </div>
            <p className="text-[#6b6460]">No projects yet</p>
            <button onClick={() => setShowWizard(true)}
              className="mt-4 flex items-center gap-2 rounded-lg bg-[#1e293b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#374151] transition-colors">
              <Plus size={16} /> Create Project
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => openProject(project)}
                onDelete={(e) => handleDelete(project.id, e)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
