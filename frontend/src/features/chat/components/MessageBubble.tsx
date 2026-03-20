import type { DisplayMessage } from "../../../types/chat.types";

interface MessageBubbleProps {
  msg: DisplayMessage;
  isMe: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CHAT_SERVICE_URL =
  import.meta.env.VITE_CHAT_SERVICE_URL ?? "http://localhost:3002";

export function MessageBubble({ msg, isMe }: MessageBubbleProps) {
  const isPending = msg.status === "PENDING";

  return (
    <div
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
            <div className="mt-2">
              {msg.attachmentType === "IMAGE" && (
                <img
                  src={`${CHAT_SERVICE_URL}${msg.attachmentUrl}`}
                  className="max-w-xs rounded-lg"
                  alt="attachment"
                />
              )}
              {msg.attachmentType === "VIDEO" && (
                <video
                  src={`${CHAT_SERVICE_URL}${msg.attachmentUrl}`}
                  controls
                  className="max-w-xs rounded-lg"
                />
              )}
              {msg.attachmentType === "FILE" && (
                <a
                  href={`${CHAT_SERVICE_URL}${msg.attachmentUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-xs underline opacity-70"
                >
                  📎 Download file
                </a>
              )}
            </div>
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
}
