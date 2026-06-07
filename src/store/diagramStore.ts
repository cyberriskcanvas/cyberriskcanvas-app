import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, type NodeChange, type EdgeChange, type Viewport } from '@xyflow/react';
import type { DiagramNode, DiagramEdge, CollabUser, CollabCursor, NodeData, EdgeData } from '@/types';

interface DiagramStore {
  diagramId: string | null;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewport: Viewport;
  collaborators: Map<string, CollabUser>;
  cursors: Map<string, CollabCursor>;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isDetailPanelOpen: boolean;

  setDiagramId: (id: string) => void;
  setNodes: (nodes: DiagramNode[]) => void;
  setEdges: (edges: DiagramEdge[]) => void;
  setViewport: (viewport: Viewport) => void;
  onNodesChange: (changes: NodeChange<DiagramNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<DiagramEdge>[]) => void;
  addNode: (node: DiagramNode) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  updateEdgeData: (id: string, patch: Partial<EdgeData> & { label?: string }) => void;
  duplicateNode: (id: string) => void;
  deleteNode: (id: string) => void;
  reparentNode: (id: string, parentId: string | null, position: { x: number; y: number }) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;

  addCollaborator: (user: CollabUser) => void;
  removeCollaborator: (userId: string) => void;
  setCollaborators: (users: CollabUser[]) => void;
  updateCursor: (cursor: CollabCursor) => void;
  removeCursor: (userId: string) => void;

  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  closeDetailPanel: () => void;
}

export const useDiagramStore = create<DiagramStore>((set) => ({
  diagramId: null,
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  collaborators: new Map(),
  cursors: new Map(),
  selectedNodeId: null,
  selectedEdgeId: null,
  isDetailPanelOpen: false,

  setDiagramId: (id) => set({ diagramId: id }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setViewport: (viewport) => set({ viewport }),

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as DiagramNode[],
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges) as DiagramEdge[],
    })),

  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),

  updateNodeData: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
    })),

  updateEdgeData: (id, patch) =>
    set((state) => ({
      edges: state.edges.map((e) => {
        if (e.id !== id) return e;
        const { label, ...dataPatch } = patch;
        return {
          ...e,
          ...(label !== undefined ? { label } : {}),
          data: { ...e.data, ...dataPatch },
        };
      }),
    })),

  duplicateNode: (id) =>
    set((state) => {
      const src = state.nodes.find((n) => n.id === id);
      if (!src) return {};
      const copy: DiagramNode = {
        ...src,
        id: crypto.randomUUID(),
        position: { x: src.position.x + 32, y: src.position.y + 32 },
        selected: false,
      };
      return { nodes: [...state.nodes, copy] };
    }),

  deleteNode: (id) =>
    set((state) => {
      const nodeToDelete = state.nodes.find((n) => n.id === id);
      return {
        nodes: state.nodes
          .map((n) => {
            if (n.parentId !== id) return n;
            // detach children: convert relative position to absolute
            return {
              ...n,
              parentId: undefined,
              position: {
                x: n.position.x + (nodeToDelete?.position.x ?? 0),
                y: n.position.y + (nodeToDelete?.position.y ?? 0),
              },
            };
          })
          .filter((n) => n.id !== id),
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        selectedEdgeId: null,
        isDetailPanelOpen: state.selectedNodeId === id ? false : state.isDetailPanelOpen,
      };
    }),

  reparentNode: (id, parentId, position) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, parentId: parentId ?? undefined, position } : n,
      ),
    })),

  bringToFront: (id) =>
    set((state) => {
      const maxZ = Math.max(0, ...state.nodes.map((n) => (n.zIndex ?? 0)));
      return {
        nodes: state.nodes.map((n) => n.id === id ? { ...n, zIndex: maxZ + 1 } : n),
      };
    }),

  sendToBack: (id) =>
    set((state) => {
      const minZ = Math.min(0, ...state.nodes.map((n) => (n.zIndex ?? 0)));
      return {
        nodes: state.nodes.map((n) => n.id === id ? { ...n, zIndex: minZ - 1 } : n),
      };
    }),

  bringForward: (id) =>
    set((state) => ({
      nodes: state.nodes.map((n) => n.id === id ? { ...n, zIndex: (n.zIndex ?? 0) + 1 } : n),
    })),

  sendBackward: (id) =>
    set((state) => ({
      nodes: state.nodes.map((n) => n.id === id ? { ...n, zIndex: (n.zIndex ?? 0) - 1 } : n),
    })),

  addCollaborator: (user) =>
    set((state) => {
      const next = new Map(state.collaborators);
      next.set(user.userId, user);
      return { collaborators: next };
    }),

  removeCollaborator: (userId) =>
    set((state) => {
      const collaborators = new Map(state.collaborators);
      const cursors = new Map(state.cursors);
      collaborators.delete(userId);
      cursors.delete(userId);
      return { collaborators, cursors };
    }),

  setCollaborators: (users) =>
    set({ collaborators: new Map(users.map((u) => [u.userId, u])) }),

  updateCursor: (cursor) =>
    set((state) => {
      const next = new Map(state.cursors);
      next.set(cursor.userId, cursor);
      return { cursors: next };
    }),

  removeCursor: (userId) =>
    set((state) => {
      const next = new Map(state.cursors);
      next.delete(userId);
      return { cursors: next };
    }),

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null, isDetailPanelOpen: id !== null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null, isDetailPanelOpen: id !== null }),
  closeDetailPanel: () => set({ isDetailPanelOpen: false, selectedNodeId: null, selectedEdgeId: null }),
}));
