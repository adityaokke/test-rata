import { useMutation, useQuery } from "@apollo/client/react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChatClient } from "../App";
import { Modal } from "../components/ui/Modal";
import { ModalActions } from "../components/ui/ModalActions";
import {
  FIND_OR_CREATE_ROOM_MUTATION,
  MY_ROOMS_QUERY,
} from "../graphql/chat.queries";
import { useAuth } from "../lib/auth-context";
import type {
  ChatRoom,
  CreateRoomResult,
  MyRoomsData,
  RoomParticipant,
} from "../types/chat.types";
import { useRoomsSocket } from "../hooks/useRoomsSocket";
import { useChatSocket } from "../hooks/useChatSocket";
import { useUnread } from "../store/unread-context";

export function RoomsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const chatClient = useChatClient();

  const [showNewChat, setShowNewChat] = useState(false);
  const [otherUserId, setOtherUserId] = useState("");

  const { unreadCounts, increment, clear } = useUnread();

  const { data, loading, error, refetch } = useQuery<MyRoomsData>(
    MY_ROOMS_QUERY,
    {
      client: chatClient,
      fetchPolicy: "cache-and-network",
    },
  );

  // Refetch rooms list when new room is created
  const handleRoomCreated = useCallback(() => {
    refetch();
  }, [refetch]);

  useRoomsSocket({
    userId: user?.id ?? "",
    onRoomCreated: handleRoomCreated,
  });

  useChatSocket({
    roomId: "", // ← no active room on rooms page
    userId: user?.id ?? "",
    onMessage: () => {},
    onUnread: increment, // ← increment when message arrives
  });

  function handleRoomClick(roomId: string) {
    clear(roomId);
    navigate(`/rooms/${roomId}`);
  }

  const [createRoom, { loading: creating }] = useMutation<CreateRoomResult>(
    FIND_OR_CREATE_ROOM_MUTATION,
    {
      client: chatClient,
      onCompleted(data) {
        setShowNewChat(false);
        setOtherUserId("");
        navigate(`/rooms/${data.createRoom.id}`);
      },
      onError(err) {
        alert(err.message);
      },
    },
  );

  function handleStartChat(e: React.FormEvent) {
    e.preventDefault();
    if (!otherUserId.trim()) return;
    createRoom({ variables: { otherUserId: otherUserId.trim() } });
  }

  function getOtherParticipants(room: ChatRoom): RoomParticipant[] {
    return room.participants.filter((p) => p.userId !== user?.id);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <div className="w-3 h-3 rounded-sm bg-surface" />
          </div>
          <span className="font-medium text-sm tracking-tight">CRM Chat</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-ink-muted font-mono">
            {user?.email}
          </span>
          <button
            onClick={() => setShowNewChat(true)}
            className="text-xs bg-accent text-surface px-3 py-1.5 rounded-lg font-medium hover:bg-accent-dim transition-colors"
          >
            + New Chat
          </button>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="btn-ghost text-xs"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* New chat modal */}
      {showNewChat && (
        <Modal onClose={() => setShowNewChat(false)}>
          <h3 className="text-sm font-medium text-ink mb-4">
            Start a new conversation
          </h3>
          <form onSubmit={handleStartChat} className="flex flex-col gap-3">
            <input
              className="input-base"
              placeholder={
                user?.role === "AGENT"
                  ? "Paste customer ID…"
                  : "Paste agent ID…"
              }
              value={otherUserId}
              onChange={(e) => setOtherUserId(e.target.value)}
              autoFocus
            />
            <ModalActions
              onCancel={() => {
                setShowNewChat(false);
                setOtherUserId("");
              }}
              submitLabel="Start chat"
              loadingLabel="Starting…"
              loading={creating}
              disabled={!otherUserId.trim()}
            />
          </form>
          <p className="text-xs text-ink-faint mt-4 font-mono break-all">
            Your ID: {user?.id}
          </p>
        </Modal>
      )}

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wider">
            Messages
          </h2>
          <span className="text-xs text-ink-faint font-mono">
            {data?.myRooms.length ?? 0} rooms
          </span>
        </div>

        {loading && (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 bg-zinc-800 rounded w-32 animate-pulse" />
                  <div className="h-2.5 bg-zinc-800 rounded w-48 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="card p-4 border-danger/30">
            <p className="text-sm text-danger">
              Failed to load: {error.message}
            </p>
          </div>
        )}

        {!loading && data?.myRooms.length === 0 && (
          <div className="text-center py-16 animate-fade-up">
            <div className="w-12 h-12 rounded-2xl bg-surface-overlay border border-zinc-800 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-5 h-5 text-ink-faint"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.842L3 20l1.09-3.272C3.4 15.55 3 12 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-sm text-ink-muted">No conversations yet</p>
          </div>
        )}

        {data?.myRooms.map((room) => {
          const others = getOtherParticipants(room);
          const primary = others[0];
          const initials = primary
            ? primary.userId.slice(0, 2).toUpperCase()
            : "??";

          return (
            <button
              key={room.id}
              onClick={() => handleRoomClick(room.id)}
              className="card p-4 flex items-center gap-3 hover:border-zinc-700 hover:bg-surface-overlay transition-all duration-150 text-left w-full mb-1 animate-fade-up"
            >
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <span className="text-xs font-medium text-accent font-mono">
                    {initials}
                  </span>
                </div>
                {/* Unread badge */}
                {unreadCounts[room.id] > 0 && (
                  <span className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-mono px-1">
                    {unreadCounts[room.id]}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medi um text-ink truncate font-mono">
                    {primary
                      ? `${primary.userId.slice(0, 8)}…`
                      : room.id.slice(0, 8)}
                  </p>
                  <span className="text-xs text-ink-faint shrink-0">
                    {formatTime(room.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-ink-muted">
                    {others.length} agent{others.length !== 1 ? "s" : ""}
                  </span>
                  {others.map((p) => (
                    <span
                      key={p.id}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        p.role === "CUSTOMER"
                          ? "bg-blue-950/50 text-blue-400"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {p.role.toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>

              <svg
                className="w-4 h-4 text-ink-faint shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
