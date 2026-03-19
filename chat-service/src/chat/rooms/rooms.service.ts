import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  // List all rooms the current user participates in
  async listRooms(userId: string) {
    return this.prisma.chatRoom.findMany({
      where: {
        OR: [
          { participantA: userId },
          { participantB: userId },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async getRoom(roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    })
    if (!room) throw new NotFoundException(`Room ${roomId} not found`)
    return room
  }

  // Find existing DM room or create one.
  // participantA/B stored in sorted order to enforce the unique constraint.
  async findOrCreateRoom(userA: string, userB: string) {
    const [participantA, participantB] = [userA, userB].sort()

    return this.prisma.chatRoom.upsert({
      where: { participantA_participantB: { participantA, participantB } },
      create: { participantA, participantB },
      update: {},
    })
  }

  // Verify a user belongs to a room (used in guards before send/read)
  async assertMember(roomId: string, userId: string): Promise<void> {
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        OR: [{ participantA: userId }, { participantB: userId }],
      },
    })
    if (!room) throw new NotFoundException(`Room not found or access denied`)
  }
}
