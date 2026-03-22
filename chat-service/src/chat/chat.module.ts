import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { RoomsService } from './rooms/rooms.service';
import { MessagesService } from './messages/messages.service';
import { MessageWorker } from './worker/message.worker';
import { ChatGateway } from './chat.gateway';
import { ChatResolver } from './chat.resolver';
import { QUEUE_NAMES, DLQ_NAMES } from './queue.constants';

@Module({
  imports: [
    BullModule.registerQueueAsync(
      {
        name: QUEUE_NAMES.MESSAGES,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          connection: {
            host: config.get<string>('redis.host'),
            port: config.get<number>('redis.port'),
          },
        }),
      },
      {
        name: DLQ_NAMES.MESSAGES,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          connection: {
            host: config.get<string>('redis.host'),
            port: config.get<number>('redis.port'),
          },
        }),
      },
    ),
  ],
  providers: [
    RoomsService,
    MessagesService,
    MessageWorker,
    ChatGateway,
    ChatResolver,
  ],
  exports: [RoomsService],
})
export class ChatModule {}
