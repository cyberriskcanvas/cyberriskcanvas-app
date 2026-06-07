'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Eye, Pencil, StickyNote, UserRound } from 'lucide-react';
import { updateProjectNotes } from '@/actions/projects';
import { cn } from '@/utils/cn';

interface Props {
  projectId: string;
  initialNotes: string;
  initialUpdatedByName: string | null;
  initialUpdatedAt: string | null;
  currentUserName: string;
  onClose: () => void;
}

// ── Simple inline Markdown renderer (no external deps) ────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={i} className="my-2 overflow-x-auto rounded bg-[#f4f1ec] px-3 py-2 text-xs font-mono text-[#3d3a36]">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Headings
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    if (h1) { nodes.push(<h1 key={i} className="mb-1 mt-3 text-base font-bold text-[#1a1917]">{inlineMarkdown(h1[1])}</h1>); i++; continue; }
    if (h2) { nodes.push(<h2 key={i} className="mb-1 mt-2.5 text-sm font-semibold text-[#1a1917]">{inlineMarkdown(h2[1])}</h2>); i++; continue; }
    if (h3) { nodes.push(<h3 key={i} className="mb-0.5 mt-2 text-sm font-medium text-[#3d3a36]">{inlineMarkdown(h3[1])}</h3>); i++; continue; }

    // Unordered list item
    const ulItem = line.match(/^[-*] (.+)/);
    if (ulItem) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        const m = lines[i].match(/^[-*] (.+)/);
        items.push(<li key={i}>{inlineMarkdown(m![1])}</li>);
        i++;
      }
      nodes.push(<ul key={i} className="my-1 ml-4 list-disc space-y-0.5 text-sm text-[#3d3a36]">{items}</ul>);
      continue;
    }

    // Ordered list item
    const olItem = line.match(/^\d+\. (.+)/);
    if (olItem) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        const m = lines[i].match(/^\d+\. (.+)/);
        items.push(<li key={i}>{inlineMarkdown(m![1])}</li>);
        i++;
      }
      nodes.push(<ol key={i} className="my-1 ml-4 list-decimal space-y-0.5 text-sm text-[#3d3a36]">{items}</ol>);
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      nodes.push(<hr key={i} className="my-2 border-[#e5e1d8]" />);
      i++;
      continue;
    }

    // Empty line → spacing
    if (line.trim() === '') {
      nodes.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // Normal paragraph
    nodes.push(<p key={i} className="text-sm leading-relaxed text-[#3d3a36]">{inlineMarkdown(line)}</p>);
    i++;
  }

  return nodes;
}

function inlineMarkdown(text: string): React.ReactNode {
  // Bold+italic, bold, italic, inline code - split into segments
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2]) parts.push(<strong key={match.index}><em>{match[2]}</em></strong>);
    else if (match[3]) parts.push(<strong key={match.index}>{match[3]}</strong>);
    else if (match[4]) parts.push(<em key={match.index}>{match[4]}</em>);
    else if (match[5]) parts.push(<code key={match.index} className="rounded bg-[#f4f1ec] px-1 py-0.5 text-xs font-mono text-[#b45309]">{match[5]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : parts;
}

// ── Component ─────────────────────────────────────────────────────────────────

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ProjectNotesPanel({ projectId, initialNotes, initialUpdatedByName, initialUpdatedAt, currentUserName, onClose }: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [updatedByName, setUpdatedByName] = useState(initialUpdatedByName);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);

  // Dragging state
  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; origLeft: number; origTop: number } | null>(null);
  const [pos, setPos] = useState({ top: 80, left: window.innerWidth - 440 });

  // Debounced auto-save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSave = useCallback((value: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await updateProjectNotes(projectId, value);
        setUpdatedByName(currentUserName);
        setUpdatedAt(new Date().toISOString());
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } finally {
        setSaving(false);
      }
    }, 1200);
  }, [projectId]);

  const handleChange = (value: string) => {
    setNotes(value);
    triggerSave(value);
  };

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, textarea')) return;
    e.preventDefault();
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragState.current = { startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top };

    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      const newLeft = Math.max(0, Math.min(window.innerWidth - 420, dragState.current.origLeft + dx));
      const newTop = Math.max(0, Math.min(window.innerHeight - 100, dragState.current.origTop + dy));
      setPos({ top: newTop, left: newLeft });
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      ref={panelRef}
      style={{ top: pos.top, left: pos.left, width: 420 }}
      className="fixed z-50 flex flex-col rounded-xl border border-[#e5e1d8] bg-white shadow-lg"
      onMouseDown={onMouseDown}
    >
      {/* Header */}
      <div className="flex cursor-grab items-center gap-2 rounded-t-xl border-b border-[#e5e1d8] bg-[#faf9f7] px-3 py-2 select-none">
        <StickyNote className="h-4 w-4 shrink-0 text-[#9b9590]" />
        <span className="flex-1 text-sm font-medium text-[#3d3a36]">Projekt-Notizen</span>

        {/* Save status */}
        <span className={cn('text-xs transition-opacity', saving || saved ? 'opacity-100' : 'opacity-0',
          saved ? 'text-green-600' : 'text-[#9b9590]')}>
          {saving ? 'Speichern…' : 'Gespeichert'}
        </span>

        {/* Edit / Preview toggle */}
        <button
          onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
          title={mode === 'edit' ? 'Vorschau' : 'Bearbeiten'}
          className="flex h-6 w-6 items-center justify-center rounded text-[#9b9590] hover:bg-[#f4f1ec] hover:text-[#1a1917]"
        >
          {mode === 'edit' ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
        </button>

        <button
          onClick={onClose}
          title="Schließen"
          className="flex h-6 w-6 items-center justify-center rounded text-[#9b9590] hover:bg-[#f4f1ec] hover:text-[#1a1917]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      {mode === 'edit' ? (
        <textarea
          value={notes}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={'# Projektnotizen\n\nMarkdown wird unterstützt:\n- **Fett**, *kursiv*, `Code`\n- Listen, Überschriften…'}
          className="h-72 w-full resize-none bg-white px-3 py-2.5 text-sm font-mono text-[#1a1917] placeholder-[#c0bab4] outline-none"
          spellCheck={false}
        />
      ) : (
        <div className="h-72 overflow-y-auto px-3 py-2.5">
          {notes.trim()
            ? renderMarkdown(notes)
            : <p className="text-sm text-[#c0bab4]">Noch keine Notizen.</p>}
        </div>
      )}

      {/* Footer - last editor */}
      <div className="flex items-center gap-1.5 rounded-b-xl border-t border-[#f0ece6] bg-[#faf9f7] px-3 py-1.5">
        <UserRound className="h-3 w-3 shrink-0 text-[#c0bab4]" />
        {updatedByName ? (
          <span className="text-[11px] text-[#9b9590]">
            Zuletzt bearbeitet von <span className="font-medium text-[#6b6460]">{updatedByName}</span>
            {updatedAt && <span className="ml-1 text-[#c0bab4]">· {formatUpdatedAt(updatedAt)}</span>}
          </span>
        ) : (
          <span className="text-[11px] text-[#c0bab4]">Noch nicht bearbeitet</span>
        )}
      </div>
    </div>
  );
}
