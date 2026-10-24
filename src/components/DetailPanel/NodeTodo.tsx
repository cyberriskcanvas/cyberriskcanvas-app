'use client';

import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import { useJourneyT } from '@/i18n/journey';
import { usePanelsT } from '@/i18n/panels';
import { deriveTasks } from '@/utils/deriveTasks';

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** What is still open for the selected component, with a jump to the tab that fixes it. */
export function NodeTodo({ nodeId, onOpen }: { nodeId: string; onOpen: (tab: string) => void }) {
  const jt = useJourneyT();
  const f = usePanelsT().t.flow;
  const nodes = useDiagramStore((s) => s.nodes);
  const tasks = useMemo(() => {
    const node = nodes.find((n) => n.id === nodeId);
    return node ? deriveTasks({ nodes: [node] }).filter((t) => t.nodeId === nodeId) : [];
  }, [nodes, nodeId]);

  if (tasks.length === 0) {
    return (
      <p className="flex items-center gap-1.5 border-b border-[#e5e1d8] bg-[#f6fbf6] px-4 py-1.5 text-[11px] text-green-800">
        <CheckCircle2 size={12} />{f.nothingOpen}
      </p>
    );
  }
  return (
    <div className="border-b border-[#e5e1d8] bg-[#fffaf0] px-4 py-2">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">{f.todo(tasks.length)}</p>
      <ul className="max-h-24 space-y-1 overflow-y-auto">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-start gap-2 text-[11px] text-[#3d3a36]">
            <span className="flex-1">{capitalise(jt.tasks.text(task).replace(/^[^:]+: /, ''))}</span>
            {task.tab && <button onClick={() => onOpen(task.tab!)} className="shrink-0 font-medium text-indigo-700 hover:underline">{f.open}</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
