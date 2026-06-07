import 'dotenv/config';
import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { getToken } from 'next-auth/jwt';
import { registerCollaboration } from './src/websocket/collaboration';
import { flushAllDirty } from './src/lib/redis';
import { ensureAdminUser } from './src/lib/auth';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  await ensureAdminUser();
  const httpServer = createServer(async (req, res) => {
    await handle(req, res);
  });

  const origin = process.env.APP_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:3000';

  const io = new Server(httpServer, {
    cors: { origin, methods: ['GET', 'POST'], credentials: true },
    transports: ['websocket', 'polling'],
  });

  // Verify NextAuth session on every Socket.IO connection
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? '';
      const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '';
      const token = await getToken({
        req: { headers: { cookie: cookieHeader } } as Parameters<typeof getToken>[0]['req'],
        secret,
      });
      if (!token?.sub) return next(new Error('Unauthorized'));
      socket.data.userId = token.sub;
      socket.data.username = (token.name as string | undefined) ?? 'Unknown';
      socket.data.color = (token.color as string | undefined) ?? '#6366F1';
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  // Make socket.io instance globally accessible
  (global as { io?: Server }).io = io;

  registerCollaboration(io);

  // Safety-net: flush any buffered diagram saves every 5 seconds
  setInterval(() => flushAllDirty().catch(console.error), 5000);

  httpServer.listen(port, hostname, () => {
    console.warn(`🚀 CyberRisk Canvas ready on http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`);
  });
});
