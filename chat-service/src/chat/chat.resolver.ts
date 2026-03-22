import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms/rooms.service';
import { MessagesService } from './messages/messages.service';
import {
  ChatRoomType,
  RoomParticipantType,
  MessageConnection,
  SendMessagePayload,
  SendMessageInput,
  GetMessagesInput,
  AddAgentInput,
} from './chat.types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

interface GqlContext {
  req: { user: { sub: string; email: string } };
}

@UseGuards(JwtAuthGuard)
@Resolver()
export class ChatResolver {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly messagesService: MessagesService,
  ) {}

  // ── Rooms ─────────────────────────────────────────────────────

  @Query(() => [ChatRoomType], {
    description: 'List all rooms the current user is in',
  })
  async myRooms(@Context() ctx: GqlContext): Promise<ChatRoomType[]> {
    return this.roomsService.listRooms(ctx.req.user.sub);
  }

  @Mutation(() => ChatRoomType)
  async createRoom(
    @Args('otherUserId') otherUserId: string, // ← back to generic name
    @Context() ctx: GqlContext,
  ): Promise<ChatRoomType> {
    return this.roomsService.createRoom(ctx.req.user.sub, otherUserId);
  }

  @Mutation(() => RoomParticipantType, {
    description: 'Add an agent to an existing room (multi-agent support)',
  })
  async addAgent(
    @Args('input') input: AddAgentInput,
    @Context() ctx: GqlContext,
  ): Promise<RoomParticipantType> {
    // Only existing room members can add agents
    await this.roomsService.assertMember(input.roomId, ctx.req.user.sub);
    return this.roomsService.addAgent(input.roomId, input.agentId);
  }

  // ── Messages ──────────────────────────────────────────────────

  @Query(() => MessageConnection, {
    description: 'Paginated messages for a room (cursor-based)',
  })
  async messages(
    @Args('input') input: GetMessagesInput,
    @Context() ctx: GqlContext,
  ): Promise<MessageConnection> {
    return this.messagesService.getMessages(ctx.req.user.sub, input);
  }

  @Mutation(() => SendMessagePayload, {
    description:
      'Publish a message to the queue. Does NOT insert to DB directly.',
  })
  async sendMessage(
    @Args('input') input: SendMessageInput,
    @Context() ctx: GqlContext,
  ): Promise<SendMessagePayload> {
    return this.messagesService.sendMessage(ctx.req.user.sub, input);
  }
}
