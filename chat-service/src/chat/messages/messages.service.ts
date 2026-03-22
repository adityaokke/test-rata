import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { RoomsService } from '../rooms/rooms.service';
import {
  QUEUE_NAMES,
  JOB_NAMES,
  MESSAGE_JOB_OPTIONS,
} from '../queue.constants';
import type { SendMessageInput, GetMessagesInput } from '../chat.types';

export interface MessageJobPayload {
  roomId: string;
  senderId: string;
  content?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  idempotencyKey: string;
  sequenceNumber: number;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly rooms: RoomsService,
    @InjectQueue(QUEUE_NAMES.MESSAGES) private readonly queue: Queue,
  ) {}

  // ── Send ──────────────────────────────────────────────────────
  // API does NOT insert to DB. It:
  //   1. Validates room membership
  //   2. Assigns sequence number (Redis INCR — atomic, ordered)
  //   3. Publishes job to BullMQ
  //   4. Returns immediately (fire-and-forget from client's perspective)

  async sendMessage(senderId: string, input: SendMessageInput) {
    if (!input.content && !input.attachmentUrl) {
      throw new BadRequestException(
        'Message must have content or an attachment',
      );
    }

    await this.rooms.assertMember(input.roomId, senderId);

    const sequenceNumber = await this.redis.nextSequence(input.roomId);

    const payload: MessageJobPayload = {
      roomId: input.roomId,
      senderId,
      content: input.content,
      attachmentUrl: input.attachmentUrl,
      attachmentType: input.attachmentType,
      idempotencyKey: input.idempotencyKey,
      sequenceNumber,
    };

    await this.queue.add(JOB_NAMES.SEND_MESSAGE, payload, {
      ...MESSAGE_JOB_OPTIONS,
      jobId: `${input.roomId}-${input.idempotencyKey}`, // deduplicate at queue level too
    });

    this.logger.debug(
      `Queued message seq=${sequenceNumber} room=${input.roomId}`,
    );

    return {
      queued: true,
      idempotencyKey: input.idempotencyKey,
      sequenceNumber,
    };
  }

  // ── Fetch (cursor-based pagination) ──────────────────────────
  // Default: 30 messages, ordered by sequenceNumber ASC.
  // Cursor points to a createdAt ISO string — fetch messages older than cursor.

  async getMessages(userId: string, input: GetMessagesInput) {
    await this.rooms.assertMember(input.roomId, userId);

    const limit = Math.min(input.limit ?? 30, 100);

    const items = await this.prisma.message.findMany({
      where: {
        roomId: input.roomId,
        status: 'DELIVERED',
        ...(input.cursor ? { createdAt: { lt: new Date(input.cursor) } } : {}),
      },
      orderBy: { sequenceNumber: 'asc' },
      take: limit + 1, // fetch one extra to determine hasMore
    });

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    const nextCursor = hasMore
      ? (items[items.length - 1]?.createdAt.toISOString() ?? null)
      : null;

    return { items, nextCursor, hasMore };
  }
}
