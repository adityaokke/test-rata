import { Field, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql'
import { AttachmentType, MessageStatus } from 'src/generated/prisma/enums'

// ── Enums ─────────────────────────────────────────────────────

registerEnumType(AttachmentType, { name: 'AttachmentType' })
registerEnumType(MessageStatus, { name: 'MessageStatus' })

export { AttachmentType, MessageStatus }
// ── Output types ──────────────────────────────────────────────

@ObjectType()
export class ChatRoomType {
  @Field()           id:           string
  @Field()           participantA: string
  @Field()           participantB: string
  @Field()           createdAt:    Date
  @Field()           updatedAt:    Date
}

@ObjectType()
export class MessageType {
  @Field()                            id:             string
  @Field()                            roomId:         string
  @Field()                            senderId:       string
  @Field(() => String, { nullable: true }) content:   string | null
  @Field(() => String, { nullable: true }) attachmentUrl:  string | null
  @Field(() => AttachmentType, { nullable: true }) attachmentType: AttachmentType | null
  @Field(() => Int)                   sequenceNumber: number
  @Field(() => MessageStatus)         status:         MessageStatus
  @Field()                            createdAt:      Date
}

@ObjectType()
export class MessageConnection {
  @Field(() => [MessageType])  items:   MessageType[]
  @Field(() => String, { nullable: true }) nextCursor: string | null
  @Field()                     hasMore: boolean
}

@ObjectType()
export class SendMessagePayload {
  @Field()           queued:         boolean
  @Field()           idempotencyKey: string
  @Field(() => Int)  sequenceNumber: number
}

// ── Input types ───────────────────────────────────────────────

@InputType()
export class SendMessageInput {
  @Field()           roomId:         string
  @Field(() => String, { nullable: true }) content?: string
  @Field(() => String, { nullable: true }) attachmentUrl?:  string
  @Field(() => AttachmentType, { nullable: true }) attachmentType?: AttachmentType
  @Field()           idempotencyKey: string  // client-generated UUID
}

@InputType()
export class GetMessagesInput {
  @Field()                            roomId: string
  @Field(() => Int, { nullable: true }) limit?: number
  @Field(() => String, { nullable: true }) cursor?: string // createdAt ISO string
}
