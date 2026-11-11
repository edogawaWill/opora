"use client";

import Link from "next/link";
import { useState } from "react";

export type ConversationItem = {
  otherUserId: number;
  otherFullName: string;
  lastContent: string;
  lastSentAt: Date | string;
  unreadCount: number;
};

export type ContactItem = {
  userId: number;
  fullName: string;
  specialization?: string | null;
  workplace?: string | null;
};

type Props = {
  conversations: ConversationItem[];
  eligibleContacts: ContactItem[];
  baseHref: string;
  role: "PATIENT" | "HCP";
  conversationsUnavailable?: boolean;
  contactsUnavailable?: boolean;
};

export default function ConversationList({
  conversations,
  eligibleContacts,
  baseHref,
  role,
  conversationsUnavailable = false,
  contactsUnavailable = false,
}: Props) {
  const [selectedContact, setSelectedContact] = useState<string>("");

  return (
    <div className="space-y-8">
      {/* Start New Conversation Bar */}
      <section className="rounded-3xl border border-[#E8D9DD] bg-white p-6 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">
          {role === "PATIENT" ? "Contact Healthcare Professional" : "Contact Patient"}
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-[#35101F]">
          Start a new conversation
        </h2>
        <p className="mt-1 text-xs text-[#705660]">
          {role === "PATIENT"
            ? "Reach out directly to any verified healthcare professional with clinical inquiries or questions about your symptom logs."
            : "Message an authorized patient regarding their symptoms, test results, or scheduled visits."}
        </p>

        {contactsUnavailable ? (
          <p className="mt-4 rounded-xl bg-[#FBF4F5] p-3.5 text-xs text-[#6B4652]" role="status">
            Patient contacts are temporarily unavailable. Refresh to try again.
          </p>
        ) : eligibleContacts.length === 0 ? (
          <p className="mt-4 rounded-xl bg-[#FBF4F5] p-3.5 text-xs text-[#6B4652]">
            {role === "PATIENT"
              ? "There are currently no verified healthcare professionals available to message."
              : "No authorized patients available to start a new conversation."}
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={selectedContact}
              onChange={(e) => setSelectedContact(e.target.value)}
              className="flex-1 rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-2.5 text-sm font-medium text-[#29101A] shadow-sm transition focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
              aria-label="Select recipient"
            >
              <option value="">
                {role === "PATIENT"
                  ? "Select a healthcare professional…"
                  : "Select an authorized patient…"}
              </option>
              {eligibleContacts.map((contact) => (
                <option key={contact.userId} value={contact.userId}>
                  {contact.fullName}
                  {contact.specialization ? ` (${contact.specialization})` : ""}
                </option>
              ))}
            </select>
            {selectedContact ? (
              <Link
                href={`${baseHref}/${selectedContact}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6F1D35] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#57152A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35]"
              >
                Open conversation &rarr;
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#EADDE0] px-5 py-2.5 text-sm font-bold text-[#8A737A] cursor-not-allowed"
              >
                Open conversation &rarr;
              </button>
            )}
          </div>
        )}
      </section>

      {/* Conversations List */}
      <section className="rounded-3xl border border-[#E8D9DD] bg-white p-6 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-7">
        <div className="flex items-center justify-between border-b border-[#F0E6E8] pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A15E71]">Messages</p>
            <h2 className="mt-1 text-xl font-extrabold text-[#35101F]">Recent conversations</h2>
          </div>
          <span className="text-xs font-bold text-[#8A737A]">
            {conversations.length} {conversations.length === 1 ? "thread" : "threads"}
          </span>
        </div>

        {conversationsUnavailable ? (
          <p className="py-12 text-center text-sm text-[#705660]" role="status">
            Conversations are temporarily unavailable. Refresh to try again.
          </p>
        ) : conversations.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#FBF4F5] text-xl font-bold text-[#6F1D35]">
              ✉
            </div>
            <p className="text-base font-bold text-[#35101F]">No conversations yet</p>
            <p className="mt-1 text-xs text-[#705660]">
              Start a new conversation above to begin exchanging messages.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-[#F0E6E8]" role="list">
            {conversations.map((c) => {
              const formattedDate = formatTime(c.lastSentAt);
              return (
                <li key={c.otherUserId} className="transition hover:bg-[#FCF9F7]">
                  <Link
                    href={`${baseHref}/${c.otherUserId}`}
                    className="flex items-center justify-between gap-4 px-3 py-4 sm:px-4"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#6F1D35]/10 text-base font-bold text-[#6F1D35]">
                        {c.otherFullName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-extrabold text-[#35101F]">
                            {c.otherFullName}
                          </p>
                          {c.unreadCount > 0 && (
                            <span className="inline-flex items-center rounded-full bg-[#6F1D35] px-2 py-0.5 text-[11px] font-bold text-white">
                              {c.unreadCount} unread
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-[#705660] mt-0.5">
                          {c.lastContent}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block text-[11px] font-semibold text-[#8A737A]">
                        {formattedDate}
                      </span>
                      <span className="text-xs font-bold text-[#6F1D35] hover:underline mt-1 inline-block">
                        View &rarr;
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatTime(val: Date | string) {
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
