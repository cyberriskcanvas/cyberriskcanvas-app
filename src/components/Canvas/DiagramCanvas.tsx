import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useReactFlow,
  type Connection,
  type NodeTypes,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  BackgroundVariant,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import HardwareNode from './nodes/HardwareNode';
import SoftwareNode from './nodes/SoftwareNode';
import BoundaryNode from './nodes/BoundaryNode';
import NoteNode from './nodes/NoteNode';
import { CursorOverlay } from '../Collaboration/CursorOverlay';
import { ContextMenu } from './ContextMenu';
import { useDiagramStore } from '@/store/diagramStore';
import { useCollaboration } from '@/hooks/useCollaboration';
import { saveDiagram } from '@/actions/diagrams';
import type { DiagramNode, DiagramEdge, DragData, HardwareNodeData, SoftwareNodeData, BoundaryNodeData, NoteNodeData } from '@/types';
import type { AttackPath } from '@/utils/attackPaths';
import { detectEdgeProtocol } from '@/utils/detectEdgeProtocol';

const nodeTypes: NodeTypes = {
  hardware: HardwareNode,
  software: SoftwareNode,
  boundary: BoundaryNode,
  note: NoteNode,
};

const DEFAULT_EDGE_OPTIONS = {
  animated: false,
  style: { strokeWidth: 2, stroke: '#94a3b8' },
  interactionWidth: 20,
};

interface DiagramCanvasProps {
  diagramId: string;
  userId?: string;
  userName?: string;
  userColor?: string;
  highlightedPath?: AttackPath | null;
}

// Returns the smallest boundary node whose bounding box contains the given point
function findContainingBoundary(
  boundaries: DiagramNode[],
  point: { x: number; y: number },
): DiagramNode | null {
  const containing = boundaries.filter((b) => {
    const bw = (b.style?.width as number) ?? 300;
    const bh = (b.style?.height as number) ?? 200;
    return (
      point.x >= b.position.x &&
      point.x <= b.position.x + bw &&
      point.y >= b.position.y &&
      point.y <= b.position.y + bh
    );
  });
  if (containing.length === 0) return null;
  return containing.reduce((smallest, b) => {
    const bw = (b.style?.width as number) ?? 300;
    const bh = (b.style?.height as number) ?? 200;
    const sw = (smallest.style?.width as number) ?? 300;
    const sh = (smallest.style?.height as number) ?? 200;
    return bw * bh < sw * sh ? b : smallest;
  });
}

// Score → color for path highlighting
function pathEdgeStyle(score: number): React.CSSProperties {
  if (score >= 70) return { stroke: '#ef4444', strokeWidth: 3 };
  if (score >= 50) return { stroke: '#f97316', strokeWidth: 3 };
  if (score >= 30) return { stroke: '#eab308', strokeWidth: 2.5 };
  return { stroke: '#22c55e', strokeWidth: 2.5 };
}

export function DiagramCanvas({ diagramId, highlightedPath }: DiagramCanvasProps) {
  const {
    nodes, edges, viewport,
    onNodesChange, onEdgesChange,
    setEdges, setViewport,
    addNode, selectNode, selectEdge, reparentNode,
  } = useDiagramStore();

  const { getIntersectingNodes, getNode } = useReactFlow<DiagramNode, DiagramEdge>();
  const { emitCursor, broadcastNodes, broadcastEdges } = useCollaboration(diagramId);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rfWrapper = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { bringForward, sendBackward, bringToFront, sendToBack, selectedNodeId } = useDiagramStore();

  // Compute highlighted edges/nodes when an attack path is active
  const visualEdges = useMemo<DiagramEdge[]>(() => {
    if (!highlightedPath) return edges;
    const pathEdgeIds = new Set(highlightedPath.edgeIds);
    const edgeStyle = pathEdgeStyle(highlightedPath.score);

    return edges.map((e) => {
      if (!pathEdgeIds.has(e.id)) {
        // Dim non-path edges
        return { ...e, style: { ...e.style, opacity: 0.15 } };
      }
      return {
        ...e,
        animated: true,
        style: { ...edgeStyle, opacity: 1 },
        className: undefined,
      };
    });
  }, [edges, highlightedPath]);

  const visualNodes = useMemo<DiagramNode[]>(() => {
    if (!highlightedPath) return nodes;
    const pathNodeIds = new Set(highlightedPath.nodeIds);
    return nodes.map((n) => {
      if (pathNodeIds.has(n.id)) {
        const isEntry = n.id === highlightedPath.entryNodeId;
        const isTarget = n.id === highlightedPath.targetNodeId;
        const ring = isEntry
          ? '0 0 0 3px #3b82f6, 0 0 12px 4px #3b82f680'
          : isTarget
          ? '0 0 0 3px #ef4444, 0 0 14px 6px #ef444480'
          : '0 0 0 2px #f97316, 0 0 8px 2px #f9731660';
        return { ...n, style: { ...n.style, boxShadow: ring, opacity: 1 } };
      }
      return { ...n, style: { ...n.style, opacity: 0.25 } };
    });
  }, [nodes, highlightedPath]);

  // Keyboard shortcuts for layer ordering
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const id = selectedNodeId;
      if (!id) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ']' && e.shiftKey) { e.preventDefault(); bringToFront(id); }
      else if (e.key === '[' && e.shiftKey) { e.preventDefault(); sendToBack(id); }
      else if (e.key === ']') { e.preventDefault(); bringForward(id); }
      else if (e.key === '[') { e.preventDefault(); sendBackward(id); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId, bringForward, sendBackward, bringToFront, sendToBack]);

  // Data is pre-loaded by the Server Component (DiagramEditorClient) via store.
  // No fetch needed here - the canvas reads from the Zustand store.

  // Auto-save with debounce
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const { nodes: n, edges: e, viewport: vp } = useDiagramStore.getState();
      saveDiagram(diagramId, { nodes: n, edges: e, viewport: vp })
        .then(() => setSaveError(null))
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Save failed';
          setSaveError(msg);
          console.error('[autosave]', err);
        });
    }, 1500);
  }, [diagramId]);

  const handleNodesChange: OnNodesChange<DiagramNode> = useCallback(
    (changes) => {
      onNodesChange(changes);
      const updated = useDiagramStore.getState().nodes;
      broadcastNodes(updated);
      scheduleSave();
    },
    [onNodesChange, broadcastNodes, scheduleSave],
  );

  const handleEdgesChange: OnEdgesChange<DiagramEdge> = useCallback(
    (changes) => {
      onEdgesChange(changes);
      const updated = useDiagramStore.getState().edges;
      broadcastEdges(updated);
      scheduleSave();
    },
    [onEdgesChange, broadcastEdges, scheduleSave],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const currentNodes = useDiagramStore.getState().nodes;
      const sourceNode = currentNodes.find((n) => n.id === connection.source);
      const targetNode = currentNodes.find((n) => n.id === connection.target);
      const detected = sourceNode && targetNode
        ? detectEdgeProtocol(sourceNode, targetNode)
        : null;

      const edgeBase = {
        ...connection,
        animated: false,
        style: { strokeWidth: 2, stroke: '#94a3b8' },
        ...(detected ? {
          label: detected.label,
          data: { protocol: detected.protocol, port: detected.port || undefined, encrypted: detected.encrypted },
        } : {}),
      };

      const newEdges = addEdge(edgeBase, useDiagramStore.getState().edges) as DiagramEdge[];
      setEdges(newEdges);
      broadcastEdges(newEdges);
      scheduleSave();
    },
    [setEdges, broadcastEdges, scheduleSave],
  );

  // Reparent hardware/software nodes when dropped onto or dragged out of a boundary
  const onNodeDragStop = useCallback(
    (_evt: MouseEvent | TouchEvent, draggedNode: DiagramNode) => {
      if (draggedNode.type === 'boundary' || draggedNode.type === 'note') return;

      const intersecting = getIntersectingNodes(draggedNode).filter(
        (n) => n.type === 'boundary',
      ) as DiagramNode[];
      // pick topmost (last rendered = last in intersecting results)
      const newParent = intersecting.length > 0 ? intersecting[intersecting.length - 1] : null;
      const currentParentId = draggedNode.parentId as string | undefined;

      if (newParent?.id === currentParentId) return;

      // Compute absolute position (node.position is relative when parentId is set)
      let absX = draggedNode.position.x;
      let absY = draggedNode.position.y;
      if (currentParentId) {
        const parent = getNode(currentParentId);
        if (parent) {
          absX += parent.position.x;
          absY += parent.position.y;
        }
      }

      if (newParent) {
        reparentNode(draggedNode.id, newParent.id, {
          x: absX - newParent.position.x,
          y: absY - newParent.position.y,
        });
      } else if (currentParentId) {
        reparentNode(draggedNode.id, null, { x: absX, y: absY });
      }

      broadcastNodes(useDiagramStore.getState().nodes);
      scheduleSave();
    },
    [getIntersectingNodes, getNode, reparentNode, broadcastNodes, scheduleSave],
  );

  // Drag-and-drop from sidebar
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const rawData = e.dataTransfer.getData('application/cyberrisk');
      if (!rawData) return;

      const dragData = JSON.parse(rawData) as DragData;

      // Convert screen coords to flow coords
      const wrapperRect = rfWrapper.current?.getBoundingClientRect();
      if (!wrapperRect) return;
      const { transform } = (window as unknown as { __rf_transform?: [number, number, number] }).__rf_transform
        ? { transform: (window as unknown as { __rf_transform: [number, number, number] }).__rf_transform }
        : { transform: [viewport.x, viewport.y, viewport.zoom] as [number, number, number] };

      const x = (e.clientX - wrapperRect.left - transform[0]) / transform[2];
      const y = (e.clientY - wrapperRect.top - transform[1]) / transform[2];

      const id = crypto.randomUUID();

      let node: DiagramNode;
      if (dragData.nodeType === 'hardware') {
        node = {
          id,
          type: 'hardware',
          position: { x, y },
          data: { label: dragData.label, componentType: dragData.componentType } as HardwareNodeData,
        };
      } else if (dragData.nodeType === 'software') {
        node = {
          id,
          type: 'software',
          position: { x, y },
          data: { label: dragData.label, componentType: dragData.componentType } as SoftwareNodeData,
        };
      } else if (dragData.nodeType === 'note') {
        node = {
          id,
          type: 'note',
          position: { x, y },
          style: { width: 200, height: 120 },
          data: { label: '' } as NoteNodeData,
        };
      } else {
        node = {
          id,
          type: 'boundary',
          position: { x: x - 100, y: y - 75 },
          style: { width: 300, height: 200 },
          data: { label: dragData.label, boundaryType: dragData.componentType } as BoundaryNodeData,
        };
      }

      // Auto-parent component nodes dropped onto a boundary
      if (dragData.nodeType !== 'boundary' && dragData.nodeType !== 'note') {
        const currentNodes = useDiagramStore.getState().nodes;
        const boundaryNodes = currentNodes.filter((n) => n.type === 'boundary');
        const container = findContainingBoundary(boundaryNodes, { x, y });
        if (container) {
          node = {
            ...node,
            parentId: container.id,
            position: {
              x: x - container.position.x,
              y: y - container.position.y,
            },
          };
        }
      }

      addNode(node);
      const updated = useDiagramStore.getState().nodes;
      broadcastNodes(updated);
      scheduleSave();
    },
    [addNode, broadcastNodes, scheduleSave, viewport],
  );

  return (
    <div ref={rfWrapper} className="relative h-full w-full" onMouseMove={emitCursor}>
      {saveError && (
        <div className="absolute top-3 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/90 px-3 py-2 text-xs text-red-300 shadow-lg backdrop-blur-sm">
          <span>⚠ {saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-1 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      <ReactFlow
        nodes={visualNodes}
        edges={visualEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        defaultViewport={viewport}
        onViewportChange={setViewport}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_e, node) => {
          if (node.type !== 'note') selectNode(node.id);
          setContextMenu(null);
        }}
        onEdgeClick={(_e, edge) => { selectEdge(edge.id); setContextMenu(null); }}
        onPaneClick={() => { selectNode(null); selectEdge(null); setContextMenu(null); }}
        onNodeContextMenu={(e, node: Node) => {
          e.preventDefault();
          setContextMenu({ nodeId: node.id, x: e.clientX, y: e.clientY });
        }}
        minZoom={0.1}
        maxZoom={4}
        snapToGrid
        snapGrid={[16, 16]}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={["Delete", "Backspace"]}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          position="bottom-left"
          nodeColor={(n) => {
            if (n.type === 'hardware') return '#3b82f6';
            if (n.type === 'software') return '#22c55e';
            if (n.type === 'note') return '#fde047';
            return '#a855f7';
          }}
          maskColor="rgba(0,0,0,0.05)"
          style={{ width: 160, height: 100 }}
        />
        <CursorOverlay />
      </ReactFlow>

      {contextMenu && (
        <ContextMenu
          nodeId={contextMenu.nodeId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
