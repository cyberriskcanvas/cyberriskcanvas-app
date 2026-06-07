import { useStore } from '@xyflow/react';
import { useDiagramStore } from '@/store/diagramStore';

// Converts flow coordinates to screen coordinates using React Flow viewport
export function CursorOverlay() {
  const { cursors } = useDiagramStore();
  const transform = useStore((s) => s.transform);

  if (cursors.size === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {Array.from(cursors.values()).map((cursor) => {
        // Convert flow position to screen position
        const screenX = cursor.x * transform[2] + transform[0];
        const screenY = cursor.y * transform[2] + transform[1];

        return (
          <div
            key={cursor.userId}
            className="absolute flex items-start gap-1 transition-transform duration-75"
            style={{ left: screenX, top: screenY }}
          >
            {/* Cursor arrow */}
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className="drop-shadow-sm">
              <path
                d="M0 0L0 14L4 10L7 18L9.5 17L6.5 9L12 9L0 0Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>

            {/* Name tag */}
            <span
              className="mt-4 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold text-white shadow-md"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.username}
            </span>
          </div>
        );
      })}
    </div>
  );
}
