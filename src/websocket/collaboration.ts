import { Server, Socket } from 'socket.io';
import { flushDiagram } from '@/lib/redis';
import { assertDiagramWriteAccess, canAccessProject } from '@/lib/access';
import { prisma } from '@/lib/db';

interface CollabUser {
  userId: string;
  username: string;
  color: string;
  socketId: string;
}

// In-memory map: diagramId -> active users
const rooms = new Map<string, Map<string, CollabUser>>();

function getRoom(diagramId: string): Map<string, CollabUser> {
  if (!rooms.has(diagramId)) rooms.set(diagramId, new Map());
  return rooms.get(diagramId)!;
}

export function registerCollaboration(io: Server): void {
  io.on('connection', (socket: Socket) => {
    let currentDiagramId: string | null = null;
    let currentUserId: string | null = null;

    // userId is set by the auth middleware in server.ts - never trust client-supplied values
    const userId = socket.data.userId as string;
    const username = socket.data.username as string;
    const color = socket.data.color as string;

    socket.on('join-diagram', async ({ diagramId }: { diagramId: string }) => {
      if (typeof diagramId !== 'string' || !diagramId) return;

      const diagram = await prisma.diagram.findUnique({ where: { id: diagramId, deletedAt: null }, select: { projectId: true } });
      const accessible = diagram ? await canAccessProject(diagram.projectId, userId) : false;
      if (!accessible) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      if (currentDiagramId) {
        leaveCurrentRoom(socket, io);
      }

      currentDiagramId = diagramId;
      currentUserId = userId;

      const room = getRoom(diagramId);
      const user: CollabUser = { userId, username, color, socketId: socket.id };
      room.set(userId, user);

      socket.join(diagramId);

      // Send current collaborators list to the joining user
      const collaborators = Array.from(room.values()).filter((u) => u.userId !== userId);
      socket.emit('diagram-state', { collaborators });

      // Notify others
      socket.to(diagramId).emit('user-joined', { userId, username, color });
    });

    socket.on('cursor-move', ({ x, y }: { x: number; y: number }) => {
      if (!currentDiagramId || !currentUserId) return;
      const room = getRoom(currentDiagramId);
      const user = room.get(currentUserId);
      if (!user) return;
      socket.to(currentDiagramId).emit('cursor-update', {
        userId: currentUserId,
        username: user.username,
        color: user.color,
        x,
        y,
      });
    });

    async function relayChange(event: string, value: unknown, field: string) {
      const diagramId = currentDiagramId;
      if (!diagramId || !currentUserId) return;
      try {
        await assertDiagramWriteAccess(diagramId, userId);
      } catch {
        socket.emit('error', { message: 'Access denied' });
        return;
      }
      if (currentDiagramId !== diagramId) return;
      socket.to(diagramId).emit(event, { [field]: value, userId });
    }

    socket.on('nodes-changed', (payload: { nodes?: unknown } | undefined) => {
      if (Array.isArray(payload?.nodes)) void relayChange('nodes-changed', payload.nodes, 'nodes');
    });

    socket.on('edges-changed', (payload: { edges?: unknown } | undefined) => {
      if (Array.isArray(payload?.edges)) void relayChange('edges-changed', payload.edges, 'edges');
    });

    socket.on('viewport-changed', (payload: { viewport?: unknown } | undefined) => {
      if (payload?.viewport && typeof payload.viewport === 'object' && !Array.isArray(payload.viewport)) {
        void relayChange('viewport-changed', payload.viewport, 'viewport');
      }
    });

    socket.on('leave-diagram', () => leaveCurrentRoom(socket, io));
    socket.on('disconnect', () => leaveCurrentRoom(socket, io));

    function leaveCurrentRoom(sock: Socket, _server: Server) {
      if (!currentDiagramId || !currentUserId) return;
      const room = getRoom(currentDiagramId);
      room.delete(currentUserId);
      if (room.size === 0) {
        // Last user leaving - flush buffered changes to Postgres immediately
        flushDiagram(currentDiagramId).catch(console.error);
        rooms.delete(currentDiagramId);
      }
      sock.to(currentDiagramId!).emit('user-left', { userId: currentUserId });
      sock.leave(currentDiagramId!);
      currentDiagramId = null;
      currentUserId = null;
    }
  });
}
