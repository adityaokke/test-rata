import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { RedisService } from '../common/redis/redis.service'
import { RoomsService } from './rooms/rooms.service'

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server

  private readonly logger = new Logger(ChatGateway.name)

  // userId → socketId map for targeted delivery
  private readonly userSockets = new Map<string, string>()

  constructor(
    private readonly redis:  RedisService,
    private readonly rooms:  RoomsService,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    const userId = this.getUserId(client)
    if (userId) {
      this.userSockets.delete(userId)
      this.logger.debug(`User ${userId} disconnected`)
    }
  }

  // ── Events ────────────────────────────────────────────────────

  // Client joins a room channel to receive messages
  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    try {
      await this.rooms.assertMember(data.roomId, data.userId)
      client.join(`room:${data.roomId}`)
      this.userSockets.set(data.userId, client.id)
      await this.redis.setOnline(data.userId)
      this.logger.debug(`User ${data.userId} joined room ${data.roomId}`)
      return { success: true }
    } catch {
      return { success: false, error: 'Access denied' }
    }
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    client.leave(`room:${data.roomId}`)
    return { success: true }
  }

  // ── Broadcast (called by worker via Redis pub/sub) ────────────
  // The worker publishes to Redis; the gateway subscribes and
  // emits to the correct Socket.IO room.

  async subscribeToRoom(roomId: string) {
    await this.redis.subscribe(`room:${roomId}`, (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage)
        this.server.to(`room:${roomId}`).emit('new-message', message)
      } catch (err) {
        this.logger.error(`Failed to parse room message: ${err}`)
      }
    })
  }

  // ── Helpers ───────────────────────────────────────────────────

  private getUserId(client: Socket): string | undefined {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) return userId
    }
  }
}
