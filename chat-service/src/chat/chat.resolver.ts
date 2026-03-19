import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { RoomsService } from './rooms/rooms.service'
import { MessagesService } from './messages/messages.service'
import {
  ChatRoomType,
  MessageConnection,
  SendMessagePayload,
  SendMessageInput,
  GetMessagesInput,
} from './chat.types'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

interface GqlContext {
  req: { user: { sub: string; email: string } }
}

@UseGuards(JwtAuthGuard)
@Resolver()
export class ChatResolver {
  constructor(
    private readonly roomsService:    RoomsService,
    private readonly messagesService: MessagesService,
  ) {}

  // ── Rooms ─────────────────────────────────────────────────────

  @Query(() => [ChatRoomType], { description: 'List all rooms the current user is in' })
  async myRooms(@Context() ctx: GqlContext): Promise<ChatRoomType[]> {
    return this.roomsService.listRooms(ctx.req.user.sub)
  }

  @Mutation(() => ChatRoomType, { description: 'Find or create a DM room with another user' })
  async findOrCreateRoom(
    @Args('otherUserId') otherUserId: string,
    @Context() ctx: GqlContext,
  ): Promise<ChatRoomType> {
    return this.roomsService.findOrCreateRoom(ctx.req.user.sub, otherUserId)
  }

  // ── Messages ──────────────────────────────────────────────────

  @Query(() => MessageConnection, { description: 'Paginated messages for a room (cursor-based)' })
  async messages(
    @Args('input') input: GetMessagesInput,
    @Context() ctx: GqlContext,
  ): Promise<MessageConnection> {
    return this.messagesService.getMessages(ctx.req.user.sub, input)
  }

  @Mutation(() => SendMessagePayload, {
    description: 'Publish a message to the queue. Does NOT insert to DB directly.',
  })
  async sendMessage(
    @Args('input') input: SendMessageInput,
    @Context() ctx: GqlContext,
  ): Promise<SendMessagePayload> {
    return this.messagesService.sendMessage(ctx.req.user.sub, input)
  }
}
