'use client';

import { useMemo } from 'react';
import { CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import { deriveTasks, type Task } from '@/utils/deriveTasks';
import { useJourneyT } from '@/i18n/journey';
import type { Asset, Threat } from '@/types';
import type { Finding } from '@/utils/modelCheck';

interface Props {
  /** Release gate reasons (shown as tasks), already loaded by the roadmap. */
  gateReasons: string[];
  modelFindings: Finding[];
  /** Switch to the canvas after a node/tab was requested in the store. */
  onOpenCanvas: () => void;
  onOpenOperations: () => void;
  onOpenModelCheck: () => void;
}

const LEVEL_DOT: Record<Task['level'], string> = { critical: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-sky-500' };

/** Flat to-do list of the risk analysis, built from the diagram and the CI gate. */
export function TaskList({ gateReasons, modelFindings, onOpenCanvas, onOpenOperations, onOpenModelCheck }: Props) {
  const t = useJourneyT().tasks;
  const nodes = useDiagramStore((s) => s.nodes);
  const openNodeTab = useDiagramStore((s) => s.openNodeTab);
  const updateNodeData = useDiagramStore((s) => s.updateNodeData);
  const tasks = useMemo(() => deriveTasks({ nodes, gateReasons, modelFindings }), [nodes, gateReasons, modelFindings]);

  function open(task: Task) {
    if (task.target === 'operations') return onOpenOperations();
    if (task.target === 'modelcheck') {
      onOpenCanvas();
      return onOpenModelCheck();
    }
    if (task.nodeId && task.tab) {
      openNodeTab(task.nodeId, task.tab);
      onOpenCanvas();
    }
  }

  function confirmDrafts(nodeId: string) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    updateNodeData(nodeId, {
      threats: ((node.data.threats ?? []) as Threat[]).map(({ draft: _d, ...x }) => x),
      assets: ((node.data.assets ?? []) as Asset[]).map(({ draft: _d, ...x }) => x),
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        <CheckCircle2 className="h-4 w-4" />{t.empty}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-3 rounded-xl border border-[#e5e1d8] bg-white px-4 py-3">
            <span className={`h-2 w-2 shrink-0 rounded-full ${LEVEL_DOT[task.level]}`} />
            <p className="flex-1 text-sm text-[#1a1714]">{t.text(task)}</p>
            {task.kind === 'confirm_draft' && task.nodeId && (
              <button onClick={() => confirmDrafts(task.nodeId!)} className="shrink-0 rounded-lg border border-[#e5e1d8] px-2.5 py-1 text-xs font-medium text-[#6b6460] hover:bg-[#f4f1ec]">
                {t.confirmAll}
              </button>
            )}
            <button onClick={() => open(task)} className="flex shrink-0 items-center gap-1 rounded-lg bg-[#1a1714] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#3d3a36]">
              {t.open}<ChevronRight className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
      {tasks.some((x) => x.kind === 'confirm_draft') && (
        <p className="flex items-start gap-2 text-xs text-[#9b9590]"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t.draftNote}</p>
      )}
    </div>
  );
}
