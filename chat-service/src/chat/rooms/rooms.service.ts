import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

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
  async findOrCreateRoom(initiatorId: string, otherUserId: string) {
    // Check if room already exists between these two users
    const existing = await this.prisma.chatRoom.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: initiatorId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
      include: { participants: true },
    });

    if (existing) return existing;

    // Creator is CUSTOMER, other is AGENT by default
    // In reality you'd check user roles from auth service
    return this.prisma.chatRoom.create({
      data: {
        customerId: initiatorId, // initiator is the customer
        participants: {
          create: [
            { userId: initiatorId, role: 'CUSTOMER' },
            { userId: otherUserId, role: 'AGENT' },
          ],
        },
      },
      include: { participants: true },
    });
  }

  // Add an agent to an existing room (multi-agent support)
  async addAgent(roomId: string, agentId: string) {
    await this.assertMember(roomId, agentId).catch(() => null); // ignore if already member

    return this.prisma.roomParticipant.create({
      data: {
        roomId,
        userId: agentId,
        role: 'AGENT',
      },
    });
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
