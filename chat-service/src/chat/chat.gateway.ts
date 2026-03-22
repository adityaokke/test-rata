import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../common/redis/redis.service';
import { RoomsService } from './rooms/rooms.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config'; // ← fix import path

// ── Types ─────────────────────────────────────────────────────

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

interface SocketData {
  user?: JwtPayload;
}

interface AuthenticatedSocket extends Socket {
  data: SocketData;
}

interface RoomPayload {
  event: string;
  room: unknown;
}

// ── Gateway ───────────────────────────────────────────────────

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly subscribedRooms = new Set<string>();
  private readonly userSockets = new Map<string, string>();

  constructor(
    private readonly redis: RedisService,
    private readonly rooms: RoomsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────

  handleConnection(client: AuthenticatedSocket) {
    // ← remove async, no await
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.get<string>('jwt.secret'),
      });

      client.data.user = payload;
      this.logger.debug(`User ${payload.sub} connected`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = this.getUserId(client);
    if (userId) {
      this.userSockets.delete(userId);
      this.logger.debug(`User ${userId} disconnected`);
    }
  }

  // ── Events ────────────────────────────────────────────────────

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const user = client.data.user;
    if (!user) {
      client.disconnect();
      return { success: false, error: 'Unauthorized' };
    }

    try {
      await this.rooms.assertMember(data.roomId, user.sub);
      void client.join(`room:${data.roomId}`);
      void this.redis.setOnline(user.sub);
      await this.subscribeToRoom(data.roomId);
      return { success: true };
    } catch {
      return { success: false, error: 'Access denied' };
    }
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    void client.leave(`room:${data.roomId}`);
    return { success: true };
  }

  @SubscribeMessage('subscribe-rooms')
  async handleSubscribeRooms(@ConnectedSocket() client: AuthenticatedSocket) {
    const user = client.data.user;
    if (!user) return { success: false };

    await this.redis.subscribe(`user:${user.sub}:rooms`, (rawMessage) => {
      try {
        const payload = JSON.parse(rawMessage) as RoomPayload;
        client.emit('room-created', payload.room);
      } catch (err) {
        this.logger.error(`Failed to parse room event: ${err}`);
      }
    });

    return { success: true };
  }

  @SubscribeMessage('subscribe-all-rooms')
  async handleSubscribeAllRooms(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = client.data.user;
    if (!user) return { success: false };

    const rooms = await this.rooms.listRooms(user.sub);

    for (const room of rooms) {
      client.join(`room:${room.id}`); // ← join Socket.IO room
      await this.subscribeToRoom(room.id); // ← subscribe Redis channel
    }

    this.logger.debug(`User ${user.sub} subscribed to ${rooms.length} rooms`);
    return { success: true };
  }

  // ── Broadcast ─────────────────────────────────────────────────

  async subscribeToRoom(roomId: string) {
    if (this.subscribedRooms.has(roomId)) return;
    this.subscribedRooms.add(roomId);

    await this.redis.subscribe(`room:${roomId}`, (rawMessage) => {
      try {
        this.server
          .to(`room:${roomId}`)
          .emit('new-message', JSON.parse(rawMessage));
      } catch (err) {
        this.logger.error(`Failed to parse room message: ${err}`);
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────

  private getUserId(client: AuthenticatedSocket): string | undefined {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) return userId;
    }
  }
}
