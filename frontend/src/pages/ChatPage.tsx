import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "../lib/auth-context";
import { useChatClient } from "../App";
import { useChatSocket } from "../hooks/useChatSocket";
import { MESSAGES_QUERY, SEND_MESSAGE_MUTATION } from "../graphql/chat.queries";
import { apolloClient } from "../lib/apollo";
import { gql } from "@apollo/client/core/index.js";
import type { IncomingMessage } from "../lib/types/Message";

interface Message {
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

interface MessagesData {
  messages: {
    items: Message[];
    nextCursor: string | null;
    hasMore: boolean;
  };
}

// Optimistic message shown immediately while queued
interface OptimisticMessage extends Omit<Message, "sequenceNumber" | "status"> {
  sequenceNumber: number;
  status: "PENDING";
  isOptimistic: true;
}

type DisplayMessage = Message | OptimisticMessage;

export function ChatPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const chatClient = useChatClient();

  const [text, setText] = useState("");
  const [optimistic, setOptimistic] = useState<OptimisticMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // ── Fetch messages (cursor pagination) ───────────────────────
  const { data, loading, fetchMore } = useQuery<MessagesData>(MESSAGES_QUERY, {
    client: chatClient,
    variables: { input: { roomId, limit: 30 } },
    skip: !roomId,
    fetchPolicy: "cache-and-network",
    pollInterval: 2000,  // ← poll every 2s as fallback
  });

  // ── Send message ──────────────────────────────────────────────
  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE_MUTATION, {
    client: chatClient,
    onCompleted() {
      setOptimistic([])   // ← clear optimistic after queue confirms
    },
    onError(err) {
      console.error('Send failed:', err)
      setOptimistic([])
    },
  })

  // ── Real-time: receive messages via WebSocket ─────────────────
  const handleIncoming = useCallback((_msg: IncomingMessage) => {
    setOptimistic([])     // ← clear all optimistic on any incoming
  }, [])

  useChatSocket({
    roomId: roomId ?? "",
    userId: user?.id ?? "",
    onMessage: handleIncoming,
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.items.length, optimistic.length]);

  // ── Infinite scroll — load older messages on scroll to top ───
  const handleScroll = useCallback(
    async (e: React.UIEvent<HTMLDivElement>) => {
      if (e.currentTarget.scrollTop > 60) return;
      if (!data?.messages.hasMore || !data.messages.nextCursor) return;

      await fetchMore({
        variables: {
          input: { roomId, limit: 30, cursor: data.messages.nextCursor },
        },
        updateQuery(prev, { fetchMoreResult }) {
          if (!fetchMoreResult) return prev;
          return {
            messages: {
              ...fetchMoreResult.messages,
              items: [
                ...fetchMoreResult.messages.items,
                ...prev.messages.items,
              ],
            },
          };
        },
      });
    },
    [data, fetchMore, roomId],
  );

  // ── Submit ────────────────────────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setText("");

    const idempotencyKey = uuidv4();

    // Show optimistic message immediately
    const optimisticMsg: OptimisticMessage = {
      id: idempotencyKey,
      roomId: roomId ?? "",
      senderId: user?.id ?? "",
      content,
      attachmentUrl: null,
      attachmentType: null,
      sequenceNumber: Date.now(), // temp
      status: "PENDING",
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    setOptimistic((prev) => [...prev, optimisticMsg]);

    try {
      await sendMessage({
        variables: { input: { roomId, content, idempotencyKey } },
      });
    } catch (err) {
      console.error("Send failed:", err);
      setOptimistic((prev) => prev.filter((o) => o.id !== idempotencyKey));
    }
  }

  // Combine confirmed + optimistic messages
  const allMessages: DisplayMessage[] = [
    ...(data?.messages.items ?? []),
    ...optimistic,
  ];

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate("/rooms")} className="btn-ghost p-1">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
          <span className="text-xs font-mono text-accent">
            {roomId?.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-ink">Room</p>
          <p className="text-xs text-ink-muted font-mono">
            {roomId?.slice(0, 12)}…
          </p>
        </div>
      </header>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2"
        onScroll={handleScroll}
      >
        <div ref={topRef} />

        {/* Load more indicator */}
        {data?.messages.hasMore && (
          <div className="text-center py-2">
            <span className="text-xs text-ink-faint">
              Scroll up to load more
            </span>
          </div>
        )}

        {loading && allMessages.length === 0 && (
          <div className="flex flex-col gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
              >
                <div className="h-9 bg-zinc-800 rounded-2xl w-48 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {allMessages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          const isPending = msg.status === "PENDING";

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"} animate-fade-up`}
            >
              <div
                className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}
              >
                <div
                  className={`
                  px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                  ${
                    isMe
                      ? "bg-accent text-surface rounded-br-sm"
                      : "bg-surface-overlay border border-zinc-800 text-ink rounded-bl-sm"
                  }
                  ${isPending ? "opacity-60" : ""}
                `}
                >
                  {msg.content}
                  {msg.attachmentUrl && (
                    <a
                      href={msg.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block mt-1 text-xs underline opacity-70"
                    >
                      📎 Attachment
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-[10px] text-ink-faint">
                    {formatTime(msg.createdAt)}
                  </span>
                  {isMe && isPending && (
                    <span className="text-[10px] text-ink-faint">sending…</span>
                  )}
                  {isMe && !isPending && (
                    <svg
                      className="w-3 h-3 text-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 px-4 py-4 shrink-0">
        <form onSubmit={handleSend} className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Type a message… (Enter to send)"
              rows={1}
              className="input-base resize-none overflow-hidden"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
          </div>
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="shrink-0 w-10 h-10 rounded-xl bg-accent text-surface flex items-center justify-center
                       hover:bg-accent-dim active:scale-95 transition-all duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
