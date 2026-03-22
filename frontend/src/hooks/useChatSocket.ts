import { useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import type { IncomingMessage } from "../types/socket.types";

const CHAT_WS_URL = import.meta.env.VITE_CHAT_WS_URL;

interface UseSocketOptions {
  roomId: string;
  userId: string;
  onMessage: (msg: IncomingMessage) => void;
  onUnread?: (roomId: string) => void;
}

export function useChatSocket({
  roomId,
  userId,
  onMessage,
  onUnread,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const onUnreadRef = useRef(onUnread);
  onUnreadRef.current = onUnread;

  useEffect(() => {
    const socket = io(`${CHAT_WS_URL}/chat`, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { token: localStorage.getItem("access_token") },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] connected, roomId:", roomId);
      if (roomId) {
        socket.emit("join-room", { roomId, userId });
      } else {
        console.log("[Socket] subscribing to all rooms");
        socket.emit("subscribe-all-rooms", {}, (res: unknown) => {
          console.log("[Socket] subscribe-all-rooms response:", res); // ← callback
        });
      }
    });

    socket.on("new-message", (msg: IncomingMessage) => {
      console.log("[Socket] new message", msg);
      if (msg.roomId === roomId) {
        onMessageRef.current(msg); // ← in this room, update chat
      } else {
        onUnreadRef.current?.(msg.roomId); // ← other room, increment badge
      }
    });

    socket.on("disconnect", () => {
      console.log("[Socket] disconnected");
    });

    return () => {
      if (roomId) socket.emit("leave-room", { roomId });
      socket.disconnect();
    };
  }, [roomId, userId]);

  const sendTyping = useCallback(() => {
    socketRef.current?.emit("typing", { roomId, userId });
  }, [roomId, userId]);

  return { sendTyping };
}
