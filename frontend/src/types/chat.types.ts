export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string | null;
  attachmentUrl: string | null;
  attachmentType: string | null;
  sequenceNumber: number;
  status: string;
  createdAt: string;
}

export interface MessagesData {
  messages: {
    items: Message[];
    nextCursor: string | null;
    hasMore: boolean;
  };
}

// Optimistic message shown immediately while queued
export interface OptimisticMessage extends Omit<Message, "sequenceNumber" | "status"> {
  sequenceNumber: number;
  status: "PENDING";
  isOptimistic: true;
}

export type DisplayMessage = Message | OptimisticMessage;

export interface RoomParticipant {
  id: string;
  userId: string;
  role: "CUSTOMER" | "AGENT";
  joinedAt: string;
}

export interface ChatRoom {
  id: string;
  customerId: string;
  participants: RoomParticipant[];
  updatedAt: string;
}

export interface MyRoomsData {
  myRooms: ChatRoom[];
}

export interface CreateRoomResult {
  createRoom: { id: string };
}