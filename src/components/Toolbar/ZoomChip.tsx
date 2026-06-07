'use client';

import { useReactFlow, useViewport } from '@xyflow/react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export function ZoomChip() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();

  return (
    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-0.5 rounded-xl border border-[#e5e1d8] bg-white px-1.5 py-1 shadow-sm">
      <button
        onClick={() => zoomOut()}
        title="Zoom out"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6b6460] transition-colors hover:bg-[#f4f1ec] hover:text-[#1a1917]"
      >
        <ZoomOut size={14} />
      </button>
      <span className="w-10 text-center text-[11px] font-medium text-[#6b6460] tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={() => zoomIn()}
        title="Zoom in"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6b6460] transition-colors hover:bg-[#f4f1ec] hover:text-[#1a1917]"
      >
        <ZoomIn size={14} />
      </button>
      <div className="mx-1 h-3.5 w-px bg-[#e5e1d8]" />
      <button
        onClick={() => fitView({ padding: 0.1 })}
        title="Fit view"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6b6460] transition-colors hover:bg-[#f4f1ec] hover:text-[#1a1917]"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );
}
