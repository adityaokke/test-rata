import { useMutation, useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { useChatClient } from "../App";
import {
  FIND_OR_CREATE_ROOM_MUTATION,
  MY_ROOMS_QUERY,
} from "../graphql/chat.queries";
import { useState } from "react";

interface ChatRoom {
  id: string;
  participantA: string;
  participantB: string;
  updatedAt: string;
}

interface MyRoomsData {
  myRooms: ChatRoom[];
}

interface FindOrCreateRoomResult {
  findOrCreateRoom: { id: string };
}

export function RoomsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const chatClient = useChatClient();
  const [showNewChat, setShowNewChat] = useState(false);
  const [otherUserId, setOtherUserId] = useState("");

  const { data, loading, error } = useQuery<MyRoomsData>(MY_ROOMS_QUERY, {
    client: chatClient,
    fetchPolicy: "cache-and-network",
  });

  const [findOrCreateRoom, { loading: creating }] =
    useMutation<FindOrCreateRoomResult>(FIND_OR_CREATE_ROOM_MUTATION, {
      client: chatClient,
      onCompleted(data) {
        navigate(`/rooms/${data.findOrCreateRoom.id}`);
      },
      onError(err) {
        alert(err.message);
      },
    });

  function handleStartChat(e: React.FormEvent) {
    e.preventDefault();
    if (!otherUserId.trim()) return;
    findOrCreateRoom({ variables: { otherUserId: otherUserId.trim() } });
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function getOtherParticipant(room: ChatRoom) {
    return room.participantA === user?.id
      ? room.participantB
      : room.participantA;
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
          <button onClick={handleLogout} className="btn-ghost text-xs">
            Sign out
          </button>
        </div>
      </header>

      {/* New chat modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm animate-fade-up">
            <h3 className="text-sm font-medium text-ink mb-4">
              Start a new conversation
            </h3>
            <form onSubmit={handleStartChat} className="flex flex-col gap-3">
              <input
                className="input-base"
                placeholder="Paste user ID…"
                value={otherUserId}
                onChange={(e) => setOtherUserId(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewChat(false);
                    setOtherUserId("");
                  }}
                  className="flex-1 border border-zinc-700 text-ink-muted rounded-xl py-2.5 text-sm hover:border-zinc-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!otherUserId.trim() || creating}
                  className="flex-1 bg-accent text-surface rounded-xl py-2.5 text-sm font-medium hover:bg-accent-dim transition-colors disabled:opacity-40"
                >
                  {creating ? "Starting…" : "Start chat"}
                </button>
              </div>
            </form>
            {/* Helper — show current user's ID so they can share it */}
            <p className="text-xs text-ink-faint mt-4 font-mono break-all">
              Your ID: {user?.id}
            </p>
          </div>
        </div>
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

        {/* Loading skeleton */}
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

        {/* Error */}
        {error && (
          <div className="card p-4 border-danger/30">
            <p className="text-sm text-danger">
              Failed to load: {error.message}
            </p>
          </div>
        )}

        {/* Empty state */}
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

        {/* Room list */}
        {data?.myRooms.map((room) => {
          const other = getOtherParticipant(room);
          const initials = other.slice(0, 2).toUpperCase();
          return (
            <button
              key={room.id}
              onClick={() => navigate(`/rooms/${room.id}`)}
              className="card p-4 flex items-center gap-3 hover:border-zinc-700 hover:bg-surface-overlay transition-all duration-150 text-left w-full mb-1 animate-fade-up"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-accent font-mono">
                  {initials}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink truncate font-mono">
                    {other.slice(0, 8)}…
                  </p>
                  <span className="text-xs text-ink-faint shrink-0">
                    {formatTime(room.updatedAt)}
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  Click to open conversation
                </p>
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
