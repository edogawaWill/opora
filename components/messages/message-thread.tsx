"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import type { MessageActionState } from "@/lib/message-action-state";

export type MessageItem = {
  messageID: number;
  senderID: number;
  receiverID: number;
  content: string;
  sentAt: Date | string;
  readStatus: boolean;
};

export type ConversationPartner = {
  userId: number;
  fullName: string;
  role?: string;
  specialization?: string | null;
  workplace?: string | null;
};

type Props = {
  currentUserId: number;
  partner: ConversationPartner;
  messages: MessageItem[];
  sendAction: (
    prevState: MessageActionState,
    formData: FormData,
  ) => Promise<MessageActionState>;
  backHref: string;
  messagesUnavailable?: boolean;
};

const initialState: MessageActionState = {
  status: "idle",
  message: "",
};

export default function MessageThread({
  currentUserId,
  partner,
  messages,
  sendAction,
  backHref,
  messagesUnavailable = false,
}: Props) {
  const [state, formAction, isPending] = useActionState(sendAction, initialState);
  const [content, setContent] = useState("");
  const [prevMessageID, setPrevMessageID] = useState(state.messageID);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  if (state.status === "success" && state.messageID !== prevMessageID) {
    setPrevMessageID(state.messageID);
    setContent("");
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex flex-col rounded-3xl border border-[#E8D9DD] bg-white shadow-[0_3px_16px_rgba(70,20,39,0.04)] overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F0E6E8] bg-[#FCF9F7] px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8D9DD] bg-white text-sm font-bold text-[#6F1D35] hover:bg-[#FBF4F5]"
            aria-label="Back to messages list"
          >
            &larr;
          </Link>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#6F1D35] text-base font-bold text-white">
            {partner.fullName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-[#35101F] sm:text-xl">
              {partner.fullName}
            </h1>
            <p className="text-xs text-[#705660]">
              {partner.specialization
                ? `${partner.specialization}${partner.workplace ? ` · ${partner.workplace}` : ""}`
                : partner.role === "HCP"
                  ? "Healthcare Professional"
                  : "Patient"}
            </p>
          </div>
        </div>
        <Link
          href={backHref}
          className="text-xs font-semibold text-[#8B5B68] hover:text-[#6F1D35]"
        >
          All conversations
        </Link>
      </div>

      {/* Messages area */}
      <div className="flex-1 min-h-[350px] max-h-[550px] overflow-y-auto p-5 sm:p-6 space-y-4 bg-white">
        {messagesUnavailable ? (
          <div className="py-16 text-center" role="status">
            <p className="text-sm font-bold text-[#35101F]">Conversation history unavailable</p>
            <p className="mt-1 text-xs text-[#705660]">Messages could not be loaded. Refresh to try again.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-bold text-[#35101F]">
              No messages exchanged yet
            </p>
            <p className="mt-1 text-xs text-[#705660]">
              Send your first message to begin the conversation with {partner.fullName}.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderID === currentUserId;
            return (
              <div
                key={m.messageID}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    isMe
                      ? "bg-[#6F1D35] text-white rounded-br-xs"
                      : "bg-[#F4ECEE] text-[#29101A] rounded-bl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                </div>
                <span className="mt-1 px-1 text-[11px] font-semibold text-[#8A737A]">
                  {formatTimestamp(m.sentAt)}
                  {isMe && (
                    <span className="ml-1.5 font-normal">
                      · {m.readStatus ? "Read" : "Sent"}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error notification if sending failed */}
      {state.status === "error" && (
        <div className="px-6 py-2 bg-[#FDF2F2] border-t border-[#F8D7DA] text-xs font-semibold text-[#9B1C1C]">
          {state.message}
        </div>
      )}

      {/* Reply input form */}
      <form
        action={formAction}
        className="border-t border-[#F0E6E8] bg-[#FCF9F7] p-4 sm:p-5"
      >
        <input type="hidden" name="recipientUserId" value={partner.userId} />
        <div className="flex flex-col gap-2">
          <label htmlFor="content" className="sr-only">
            Message content
          </label>
          <textarea
            id="content"
            name="content"
            rows={3}
            required
            maxLength={2000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Write a message to ${partner.fullName}…`}
            className="w-full resize-none rounded-xl border border-[#D8AAB5] bg-white p-3 text-sm font-medium text-[#29101A] shadow-sm transition focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#8A737A]">
              {content.length}/2000 characters
            </span>
            <button
              type="submit"
              disabled={isPending || !content.trim()}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#6F1D35] px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#57152A] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35]"
            >
              {isPending ? "Sending…" : "Send message"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function formatTimestamp(val: Date | string) {
  const date = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-MY", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(date);
}
