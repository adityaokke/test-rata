import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { QUEUE_NAMES, JOB_NAMES, DLQ_NAMES } from '../queue.constants';
import type { MessageJobPayload } from '../messages/messages.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Processor(QUEUE_NAMES.MESSAGES)
export class MessageWorker extends WorkerHost {
  private readonly logger = new Logger(MessageWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @InjectQueue(DLQ_NAMES.MESSAGES) private readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<MessageJobPayload>): Promise<void> {
    if (job.name !== JOB_NAMES.SEND_MESSAGE) return;

    const data = job.data;
    this.logger.debug(
      `Processing message job ${job.id} seq=${data.sequenceNumber}`,
    );

    // ── Persist to PostgreSQL ─────────────────────────────────
    // ON CONFLICT DO NOTHING handles duplicate deliveries gracefully —
    // if the worker crashes after insert but before ack, the retry
    // hits the unique constraint and silently skips rather than duplicating.
    try {
      const message = await this.prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO messages (
          "id", "roomId", "senderId", "content",
          "attachmentUrl", "attachmentType",
          "sequenceNumber", "idempotencyKey", "status", "createdAt"
        )
        VALUES (
          gen_random_uuid(),
          ${data.roomId},
          ${data.senderId},
          ${data.content ?? null},
          ${data.attachmentUrl ?? null},
          ${data.attachmentType ?? null}::"AttachmentType",
          ${data.sequenceNumber},
          ${data.idempotencyKey},
          'DELIVERED',
          NOW()
        )
        ON CONFLICT ("roomId", "idempotencyKey") DO NOTHING
        RETURNING id
      `;

      if (message.length === 0) {
        this.logger.warn(`Duplicate message skipped: ${data.idempotencyKey}`);
        return;
      }

      // ── Publish to Redis pub/sub for WebSocket broadcast ─────
      await this.redis.publish(
        `room:${data.roomId}`,
        JSON.stringify({
          id: message[0].id,
          roomId: data.roomId,
          senderId: data.senderId,
          content: data.content,
          attachmentUrl: data.attachmentUrl,
          attachmentType: data.attachmentType,
          sequenceNumber: data.sequenceNumber,
          createdAt: new Date().toISOString(),
        }),
      );

      // ── Cache in Redis for fast recent-message reads ──────────
      await this.redis.cacheMessage(data.roomId, JSON.stringify(data));

      this.logger.debug(
        `Message persisted and broadcast seq=${data.sequenceNumber}`,
      );
    } catch (err) {
      this.logger.error(`Failed to process message job ${job.id}:`, err);
      throw err; // re-throw so BullMQ retries
    }
  }

  // ── Dead Letter Queue ─────────────────────────────────────────
  // After max retries (3) BullMQ marks the job as failed.
  // We catch that event and forward to the DLQ queue for monitoring/replay.

  @OnWorkerEvent('failed')
  async onFailed(job: Job<MessageJobPayload>, err: Error) {
    const isExhausted = (job.attemptsMade ?? 0) >= (job.opts.attempts ?? 3);
    if (!isExhausted) return;

    this.logger.error(
      `Message job ${job.id} exhausted retries — moving to DLQ. Error: ${err.message}`,
    );

    await this.dlq.add(
      'dead-message',
      {
        originalJobId: job.id,
        payload: job.data,
        error: err.message,
        failedAt: new Date().toISOString(),
        attemptsMade: job.attemptsMade,
      },
      { removeOnFail: false },
    );
  }
}
