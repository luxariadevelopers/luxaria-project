import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { config } from '../config';

let io: Server | null = null;

export function initRealtime(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.corsOrigin, credentials: true },
  });

  io.on('connection', (socket) => {
    socket.on('join', (rooms: string[] | string) => {
      const list = Array.isArray(rooms) ? rooms : [rooms];
      list.forEach((r) => socket.join(r));
    });
  });

  return io;
}

export function emitCompany(companyId: string, event: string, payload: unknown) {
  io?.to(`company:${companyId}`).emit(event, payload);
}

export function emitProject(projectId: string, event: string, payload: unknown) {
  io?.to(`project:${projectId}`).emit(event, payload);
}
