import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { NodeResizer, type NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/utils/cn';
import type { NodeData, BoundaryType } from '@/types';
import { useDiagramStore } from '@/store/diagramStore';

const BOUNDARY_STYLES: Record<string, { border: string; bg: string; label: string; dot: string }> = {
  'trust-zone':      { border: 'border-red-400',    bg: 'bg-red-50/40',    label: 'Trust Zone',      dot: 'bg-red-400' },
  'network-segment': { border: 'border-blue-400',   bg: 'bg-blue-50/40',   label: 'Network Segment', dot: 'bg-blue-400' },
  'physical-zone':   { border: 'border-green-400',  bg: 'bg-green-50/40',  label: 'Physical Zone',   dot: 'bg-green-400' },
  'logical-zone':    { border: 'border-purple-400', bg: 'bg-purple-50/40', label: 'Logical Zone',    dot: 'bg-purple-400' },
  'cloud-zone':      { border: 'border-sky-400',    bg: 'bg-sky-50/40',    label: 'Cloud Zone',      dot: 'bg-sky-400' },
};

function BoundaryNode({ data, selected, id }: NodeProps<Node<NodeData>>) {
  const { updateNodeData } = useDiagramStore();
  const bt: BoundaryType = (data.boundaryType as BoundaryType) ?? 'logical-zone';
  const style = BOUNDARY_STYLES[bt] ?? BOUNDARY_STYLES['logical-zone'];
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditLabel(data.label ? String(data.label) : style.label);
    setEditing(true);
  }, [data.label, style.label]);

  const commitEdit = useCallback(() => {
    updateNodeData(id, { label: editLabel.trim() || (data.label ? String(data.label) : style.label) });
    setEditing(false);
  }, [editLabel, id, updateNodeData, data.label, style.label]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') setEditing(false);
  }, [commitEdit]);

  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={true}
        color={selected ? '#6366f1' : 'transparent'}
        lineStyle={{ borderWidth: 1 }}
      />
      <div
        className={cn(
          'h-full w-full rounded-2xl border-2 border-dashed transition-all duration-150',
          style.border,
          style.bg,
          selected && 'ring-2 ring-indigo-500 ring-offset-1',
        )}
      >
        <div className="flex items-center gap-1.5 px-3 py-2">
          <span className={cn('h-2.5 w-2.5 rounded-full', style.dot)} />
          {editing ? (
            <input
              ref={inputRef}
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="rounded border border-indigo-400 bg-white px-1 py-0.5 text-xs font-semibold text-gray-600 uppercase tracking-wider outline-none"
            />
          ) : (
            <span
              className="text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-text"
              onDoubleClick={startEdit}
              title="Doppelklick zum Umbenennen"
            >
              {data.label ? String(data.label) : style.label}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export default memo(BoundaryNode);
