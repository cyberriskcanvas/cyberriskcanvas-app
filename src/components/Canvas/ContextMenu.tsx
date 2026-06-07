import { useEffect, useRef } from 'react';
import {
  BringToFront, SendToBack, ChevronUp, ChevronDown,
  Copy, Trash2, Info,
} from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import { useT } from '@/hooks/useT';

interface Props {
  nodeId: string;
  x: number;
  y: number;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ElementType;
  action: () => void;
  danger?: boolean;
  separator?: never;
}
interface Separator { separator: true }
type Item = MenuItem | Separator;

export function ContextMenu({ nodeId, x, y, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const {
    bringToFront, sendToBack, bringForward, sendBackward,
    duplicateNode, deleteNode, selectNode, nodes,
  } = useDiagramStore();
  const t = useT();
  const nodeType = nodes.find((n) => n.id === nodeId)?.type;

  // Close on outside click or Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  // Clamp position so menu stays inside viewport
  const menuW = 200;
  const menuH = 260;
  const left = Math.min(x, window.innerWidth - menuW - 8);
  const top = Math.min(y, window.innerHeight - menuH - 8);

  const run = (fn: () => void) => { fn(); onClose(); };

  const items: Item[] = [
    ...(nodeType !== 'note' ? [
      { label: t.contextMenu.details, icon: Info, action: () => selectNode(nodeId) } as MenuItem,
      { separator: true } as Separator,
    ] : []),
    { label: t.contextMenu.bringToFront,  icon: BringToFront, action: () => bringToFront(nodeId) },
    { label: t.contextMenu.bringForward,  icon: ChevronUp,    action: () => bringForward(nodeId) },
    { label: t.contextMenu.sendBackward,  icon: ChevronDown,  action: () => sendBackward(nodeId) },
    { label: t.contextMenu.sendToBack,    icon: SendToBack,   action: () => sendToBack(nodeId) },
    { separator: true },
    { label: t.contextMenu.duplicate,     icon: Copy,         action: () => duplicateNode(nodeId) },
    { separator: true },
    { label: t.contextMenu.delete,        icon: Trash2,       action: () => deleteNode(nodeId), danger: true },
  ];

  return (
    <div
      ref={ref}
      style={{ left, top, position: 'fixed', zIndex: 9999, width: menuW }}
      className="rounded-xl border border-[#e5e1d8] bg-white py-1 shadow-lg"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => {
        if ('separator' in item) {
          return <div key={i} className="my-1 h-px bg-[#e5e1d8] mx-2" />;
        }
        const Icon = item.icon;
        return (
          <button
            key={i}
            onClick={() => run(item.action)}
            className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-[#f4f1ec] ${
              item.danger ? 'text-red-600 hover:text-red-700' : 'text-[#1a1917]'
            }`}
          >
            <Icon size={14} className={item.danger ? 'text-red-500' : 'text-[#6b6460]'} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
