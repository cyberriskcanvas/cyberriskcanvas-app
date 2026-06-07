import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { NodeResizer, type NodeProps, type Node } from '@xyflow/react';
import { StickyNote } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useDiagramStore } from '@/store/diagramStore';
import type { NodeData } from '@/types';

function NoteNode({ data, selected, id }: NodeProps<Node<NodeData>>) {
  const { updateNodeData } = useDiagramStore();
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startEdit = useCallback(() => {
    setEditing(true);
  }, []);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const commitEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditing(false);
    }
  }, []);

  return (
    <>
      <NodeResizer minWidth={160} minHeight={100} isVisible={selected} color="#ca8a04" lineStyle={{ borderWidth: 1 }} />

      <div
        onDoubleClick={startEdit}
        className={cn(
          'min-w-[160px] min-h-[100px] rounded-sm border-2 px-3 py-2.5 transition-all duration-150',
          'bg-yellow-50 border-yellow-300',
          selected ? 'shadow-[0_0_0_2px_#ca8a04,0_4px_16px_rgba(0,0,0,0.12)]' : 'shadow-[0_2px_8px_rgba(0,0,0,0.08)]',
        )}
        style={{ minWidth: 160, minHeight: 100 }}
      >
        {/* Header strip */}
        <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-yellow-200">
          <StickyNote size={12} className="text-yellow-600 shrink-0" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-yellow-700">Note</span>
        </div>

        {editing ? (
          <textarea
            ref={textareaRef}
            defaultValue={String(data.label ?? '')}
            onBlur={(e) => {
              updateNodeData(id, { label: e.target.value });
              commitEdit();
            }}
            onKeyDown={handleKeyDown}
            className="w-full resize-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-yellow-300"
            style={{ minHeight: 64, fieldSizing: 'content' } as React.CSSProperties}
            placeholder="Notiz eingeben..."
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p
            className={cn(
              'whitespace-pre-wrap text-sm leading-snug text-gray-700',
              !data.label && 'text-yellow-300 italic',
            )}
          >
            {String(data.label || 'Doppelklick zum Bearbeiten…')}
          </p>
        )}
      </div>
    </>
  );
}

export default memo(NoteNode);
