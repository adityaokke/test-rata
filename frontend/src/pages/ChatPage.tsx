import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { Modal } from "../components/ui/Modal";
import { ModalActions } from "../components/ui/ModalActions";
import { MessageBubble } from "../features/chat/components/MessageBubble";
import { MessageInput } from "../features/chat/components/MessageInput";
import { useMessages } from "../features/chat/hooks/useMessages";
import { useSendMessage } from "../features/chat/hooks/useSendMessage";
import { useChatSocket } from "../hooks/useChatSocket";
import { useAuth } from "../lib/auth-context";
import { useChatClient } from "../App";
import { ADD_AGENT_MUTATION, MESSAGES_QUERY } from "../graphql/chat.queries";
import { useState } from "react";
import type { DisplayMessage } from "../types/chat.types";
import type { IncomingMessage } from "../types/socket.types";
import { useUnread } from '../store/unread-context'

export function ChatPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const chatClient = useChatClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [showAddAgent, setShowAddAgent] = useState(false);
  const [agentId, setAgentId] = useState("");

  const { clear } = useUnread();

  const { data, isInitialLoading, handleScroll } = useMessages(roomId);
  const { optimistic, setOptimistic, sending, handleSend } = useSendMessage(
    roomId,
    user?.id,
  );

  const [addAgent, { loading: addingAgent }] = useMutation(ADD_AGENT_MUTATION, {
    client: chatClient,
    onCompleted() {
      setShowAddAgent(false);
      setAgentId("");
    },
    onError(err) {
      alert(err.message);
    },
  });

  const handleIncoming = useCallback(
    (msg: IncomingMessage) => {
      setOptimistic((prev) => prev.filter((o) => o.id !== msg.id));
      chatClient.refetchQueries({ include: [MESSAGES_QUERY] });
    },
    [chatClient, setOptimistic],
  );

  useChatSocket({
    roomId: roomId ?? "",
    userId: user?.id ?? "",
    onMessage: handleIncoming,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.items.length, optimistic.length]);

  const allMessages: DisplayMessage[] = [
    ...(data?.messages.items ?? []),
    ...optimistic,
  ];

  useEffect(() => {
    if (roomId) clear(roomId);
  }, [roomId, clear]);

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
          <button
            className="text-xs text-ink-muted font-mono hover:text-accent transition-colors"
            onClick={() => {
              navigator.clipboard.writeText(roomId ?? "");
              alert("Room ID copied!");
            }}
          >
            {roomId?.slice(0, 12)}… (click to copy)
          </button>
        </div>
        {user?.role === "AGENT" && (
          <button
            onClick={() => setShowAddAgent(true)}
            className="ml-auto text-xs border border-zinc-700 text-ink-muted px-3 py-1.5 rounded-lg hover:border-zinc-600 hover:text-ink transition-colors"
          >
            + Add Agent
          </button>
        )}
      </header>

      {/* Add Agent modal */}
      {showAddAgent && (
        <Modal onClose={() => setShowAddAgent(false)}>
          <h3 className="text-sm font-medium text-ink mb-1">Add an agent</h3>
          <p className="text-xs text-ink-muted mb-4">
            Paste the user ID of the agent to add
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (agentId.trim())
                addAgent({
                  variables: { input: { roomId, agentId: agentId.trim() } },
                });
            }}
            className="flex flex-col gap-3"
          >
            <input
              className="input-base"
              placeholder="Paste agent user ID…"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              autoFocus
            />
            <ModalActions
              onCancel={() => {
                setShowAddAgent(false);
                setAgentId("");
              }}
              submitLabel="Add agent"
              loadingLabel="Adding…"
              loading={addingAgent}
              disabled={!agentId.trim()}
            />
          </form>
        </Modal>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2"
        onScroll={handleScroll}
      >
        {data?.messages.hasMore && (
          <div className="text-center py-2">
            <span className="text-xs text-ink-faint">
              Scroll up to load more
            </span>
          </div>
        )}

        {isInitialLoading && allMessages.length === 0 && (
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

        {allMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isMe={msg.senderId === user?.id}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={handleSend} sending={sending} />
    </div>
  );
}
