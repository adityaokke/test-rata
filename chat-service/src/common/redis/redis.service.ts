import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  // Separate clients: one for commands, one dedicated for subscriptions
  // (a subscribed client can ONLY run subscribe/unsubscribe commands)
  readonly client: Redis;
  readonly subscriber: Redis;

  constructor(config: ConfigService) {
    const options = {
      host: config.get<string>('redis.host'),
      port: config.get<number>('redis.port'),
      maxRetriesPerRequest: null, // required by BullMQ
      lazyConnect: true,
    };
    this.client = new Redis(options);
    this.subscriber = new Redis(options);
  }

  async onModuleInit() {
    await this.client.connect();
    await this.subscriber.connect();
    this.logger.log('Redis connected');
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.subscriber.quit();
  }

  // ── Sequence number ──────────────────────────────────────────
  // Atomically increment per-room sequence counter.
  // Used to guarantee message ordering within a room.
  async nextSequence(roomId: string): Promise<number> {
    return this.client.incr(`room:${roomId}:seq`);
  }

  // ── Presence ─────────────────────────────────────────────────
  async setOnline(userId: string, ttlSeconds = 30): Promise<void> {
    await this.client.set(`presence:${userId}`, '1', 'EX', ttlSeconds);
  }

  async isOnline(userId: string): Promise<boolean> {
    const val = await this.client.get(`presence:${userId}`);
    return val === '1';
  }

  // ── Message cache ─────────────────────────────────────────────
  // Cache last N messages per room to avoid DB hits for recent history
  async cacheMessage(
    roomId: string,
    payload: string,
    maxLen = 50,
  ): Promise<void> {
    const key = `room:${roomId}:messages`;
    await this.client
      .multi()
      .lpush(key, payload)
      .ltrim(key, 0, maxLen - 1)
      .exec();
  }

  async getCachedMessages(roomId: string): Promise<string[]> {
    return this.client.lrange(`room:${roomId}:messages`, 0, -1);
  }

  // ── Pub/Sub ───────────────────────────────────────────────────
  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  async subscribe(
    channel: string,
    handler: (message: string) => void,
  ): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) handler(msg);
    });
  }
}
