import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useReactFlow } from '@xyflow/react';
import { connectSocket, getSocket } from '@/services/socket';
import { useDiagramStore } from '@/store/diagramStore';
import type { CollabUser, DiagramNode, DiagramEdge } from '@/types';

const CURSOR_THROTTLE_MS = 50;

export function useCollaboration(diagramId: string | null) {
  const { data: session } = useSession();
  const { addCollaborator, removeCollaborator, setCollaborators, updateCursor, setNodes, setEdges } =
    useDiagramStore();
  const { screenToFlowPosition } = useReactFlow();
  const lastCursorEmit = useRef(0);

  useEffect(() => {
    if (!diagramId || !session?.user?.id) return;

    const socket = connectSocket();

    // userId / username / color are verified server-side from the session cookie;
    // the server ignores any identity values the client might send.
    socket.emit('join-diagram', { diagramId });

    socket.on('diagram-state', ({ collaborators }: { collaborators: CollabUser[] }) => {
      setCollaborators(collaborators);
    });

    socket.on('user-joined', (user: CollabUser) => {
      addCollaborator(user);
    });

    socket.on('user-left', ({ userId }: { userId: string }) => {
      removeCollaborator(userId);
    });

    socket.on('cursor-update', (data: { userId: string; username: string; color: string; x: number; y: number }) => {
      updateCursor(data);
    });

    socket.on('nodes-changed', ({ nodes }: { nodes: DiagramNode[] }) => {
      setNodes(nodes);
    });

    socket.on('edges-changed', ({ edges }: { edges: DiagramEdge[] }) => {
      setEdges(edges);
    });

    return () => {
      socket.emit('leave-diagram', { diagramId });
      socket.off('diagram-state');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('cursor-update');
      socket.off('nodes-changed');
      socket.off('edges-changed');
    };
  }, [diagramId, session?.user?.id, addCollaborator, removeCollaborator, setCollaborators, updateCursor, setNodes, setEdges]);

  const emitCursor = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!diagramId) return;
      const now = Date.now();
      if (now - lastCursorEmit.current < CURSOR_THROTTLE_MS) return;
      lastCursorEmit.current = now;

      const rect = e.currentTarget.getBoundingClientRect();
      const flowPos = screenToFlowPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      getSocket().emit('cursor-move', { ...flowPos });
    },
    [diagramId, screenToFlowPosition],
  );

  const broadcastNodes = useCallback(
    (nodes: DiagramNode[]) => {
      if (!diagramId) return;
      getSocket().emit('nodes-changed', { nodes });
    },
    [diagramId],
  );

  const broadcastEdges = useCallback(
    (edges: DiagramEdge[]) => {
      if (!diagramId) return;
      getSocket().emit('edges-changed', { edges });
    },
    [diagramId],
  );

  return { emitCursor, broadcastNodes, broadcastEdges };
}
