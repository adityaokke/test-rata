import { useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import type { IncomingMessage } from "../types/socket.types";

const CHAT_WS_URL = import.meta.env.VITE_CHAT_WS_URL;

interface UseSocketOptions {
  roomId: string;
  userId: string;
  onMessage: (msg: IncomingMessage) => void;
}

export function useChatSocket({ roomId, userId, onMessage }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const socket = io(`${CHAT_WS_URL}/chat`, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: {
        token: localStorage.getItem("access_token"),
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room", { roomId, userId });
    });

    socket.on("new-message", (msg: IncomingMessage) => {
      onMessageRef.current(msg);
    });

    socket.on("disconnect", () => {
      console.log("[Socket] disconnected");
    });

    return () => {
      socket.emit("leave-room", { roomId });
      socket.disconnect();
    };
  }, [roomId, userId]);

  const sendTyping = useCallback(() => {
    socketRef.current?.emit("typing", { roomId, userId });
  }, [roomId, userId]);

  return { sendTyping };
}
