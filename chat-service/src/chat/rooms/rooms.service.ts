import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { RedisService } from 'src/common/redis/redis.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private async getUserRole(userId: string): Promise<string> {
    const authBaseUrl = this.config.get<string>('auth.baseUrl');
    const res = await fetch(`${authBaseUrl}/users/${userId}/role`);
    if (!res.ok) throw new NotFoundException(`User ${userId} not found`);
    const data = (await res.json()) as { userId: string; role: string };
    return data.role;
  }

  // List all rooms the current user participates in
  async listRooms(userId: string) {
    return this.prisma.chatRoom.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getRoom(roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });
    if (!room) throw new NotFoundException(`Room ${roomId} not found`);
    return room;
  }

  // Find existing room between customer and agent or create one.
  // Uses RoomParticipant to support multi-agent per customer.
  async createRoom(initiatorId: string, otherUserId: string) {
    // Call auth service to get both users' roles
    const [initiatorRole, otherRole] = await Promise.all([
      this.getUserRole(initiatorId),
      this.getUserRole(otherUserId),
    ]);

    if (initiatorRole === otherRole) {
      throw new BadRequestException(
        initiatorRole === 'CUSTOMER'
          ? 'Customers cannot start a conversation with other customers'
          : 'Agents cannot start a conversation with other agents',
      );
    }

    const customerId = initiatorRole === 'CUSTOMER' ? initiatorId : otherUserId;
    const agentId = initiatorRole === 'AGENT' ? initiatorId : otherUserId;

    // Check if room already exists between these two users
    // const existing = await this.prisma.chatRoom.findFirst({
    //   where: {
    //     AND: [
    //       { participants: { some: { userId: initiatorId } } },
    //       { participants: { some: { userId: otherUserId } } },
    //     ],
    //   },
    //   include: { participants: true },
    // });

    // if (existing) return existing;

    const room = await this.prisma.chatRoom.create({
      data: {
        customerId: customerId,
        participants: {
          create: [
            { userId: customerId, role: 'CUSTOMER' },
            { userId: agentId, role: 'AGENT' },
          ],
        },
      },
      include: { participants: true },
    });

    console.log(
      'publishing room-created for participants:',
      room.participants.map((p) => p.userId),
    );
    // Notify all participants that a new room was created
    for (const participant of room.participants) {
      await this.redis.publish(
        `user:${participant.userId}:rooms`,
        JSON.stringify({ event: 'room-created', room }),
      );
    }

    return room;
  }

  // Add an agent to an existing room (multi-agent support)
  async addAgent(roomId: string, agentId: string) {
    // Validate the user being added is actually an AGENT
    const agentRole = await this.getUserRole(agentId);
    if (agentRole !== 'AGENT') {
      throw new BadRequestException('Only agents can be added to a room');
    }

    await this.assertMember(roomId, agentId).catch(() => null); // ignore if already member

    const roomParticipant = await this.prisma.roomParticipant.create({
      data: {
        roomId,
        userId: agentId,
        role: 'AGENT',
      },
    });

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });

    await this.redis.publish(
      `user:${roomParticipant.userId}:rooms`,
      JSON.stringify({ event: 'room-created', room }),
    );

    return roomParticipant;
  }

  // Verify a user belongs to a room
  async assertMember(roomId: string, userId: string): Promise<void> {
    const participant = await this.prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: { roomId, userId },
      },
    });
    if (!participant)
      throw new NotFoundException('Room not found or access denied');
  }
}
