import { useMutation } from "@apollo/client/react";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useChatClient } from "../../../App";
import { SEND_MESSAGE_MUTATION } from "../../../graphql/chat.queries";
import type { OptimisticMessage } from "../../../types/chat.types";

export function useSendMessage(
  roomId: string | undefined,
  userId: string | undefined,
) {
  const chatClient = useChatClient();
  const [optimistic, setOptimistic] = useState<OptimisticMessage[]>([]);

  const [sendMessage, { loading: sending }] = useMutation(
    SEND_MESSAGE_MUTATION,
    {
      client: chatClient,
      onCompleted() {
        setOptimistic([]);
      },
      onError(err) {
        console.error("Send failed:", err);
        setOptimistic([]);
      },
    },
  );

  async function handleSend(
    content: string,
    attachment?: {
      attachmentUrl: string;
      attachmentType: "IMAGE" | "VIDEO" | "FILE";
    },
  ) {
    if (!content.trim() && !attachment) return;

    const idempotencyKey = uuidv4();
    const optimisticMsg: OptimisticMessage = {
      id: idempotencyKey,
      roomId: roomId ?? "",
      senderId: userId ?? "",
      content: content || null,
      attachmentUrl: attachment?.attachmentUrl ?? null,
      attachmentType: attachment?.attachmentType ?? null,
      sequenceNumber: Date.now(),
      status: "PENDING",
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    setOptimistic((prev) => [...prev, optimisticMsg]);

    try {
      await sendMessage({
        variables: {
          input: {
            roomId,
            content: content || undefined,
            attachmentUrl: attachment?.attachmentUrl,
            attachmentType: attachment?.attachmentType,
            idempotencyKey,
          },
        },
      });
    } catch {
      setOptimistic((prev) => prev.filter((o) => o.id !== idempotencyKey));
    }
  }

  return { optimistic, setOptimistic, sending, handleSend };
}
