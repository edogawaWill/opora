import { Suspense } from "react";
import { redirect } from "next/navigation";

import ConversationList, {
  type ContactItem,
  type ConversationItem,
} from "@/components/messages/conversation-list";
import { AuthorizationError, requireApprovedHcp } from "@/lib/authorization";
import {
  loadConversations,
  loadEligiblePatientContacts,
} from "@/lib/message-service.mjs";
import prisma from "@/lib/prisma";
import styles from "@/components/hcp/hcp-desktop.module.css";

function LoadingFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading your messages…</p>
      </div>
    </div>
  );
}

type RawConversation = {
  otherUserId: number;
  otherFullName: string;
  lastContent: string;
  lastSentAt: Date;
  unreadCount: number;
};

type RawContact = {
  patientID?: number;
  userId: number;
  fullName: string;
};

export default function HcpMessagesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HcpMessagesContent />
    </Suspense>
  );
}

async function HcpMessagesContent() {
  let principal;
  try {
    principal = await requireApprovedHcp();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const [conversationsResult, contactsResult] = await Promise.all([
    loadConversations({ requireUser: async () => principal, prisma }),
    loadEligiblePatientContacts({ requireApprovedHcp: async () => principal, prisma }),
  ]);

  const rawConversations: RawConversation[] =
    conversationsResult.status === "success" ? conversationsResult.conversations : [];
  const conversations: ConversationItem[] = rawConversations.map((c) => ({
    otherUserId: c.otherUserId,
    otherFullName: c.otherFullName,
    lastContent: c.lastContent,
    lastSentAt: c.lastSentAt,
    unreadCount: c.unreadCount,
  }));

  const rawContacts: RawContact[] =
    contactsResult.status === "success" ? contactsResult.contacts : [];
  const eligibleContacts: ContactItem[] = rawContacts.map((c) => ({
    userId: c.userId,
    fullName: c.fullName,
  }));

  return (
    <main className={`${styles.desktopPage} ${styles.messagesPage}`}>
      <section className={`${styles.pageIntro} mb-6`}>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A3D53]">Clinical communication</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1B1C1B] sm:text-4xl font-headline">
          Patient Messages
        </h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[#705660]">
          Review incoming inquiries and communicate directly with patients regarding their symptoms, medical history, or appointment consultations.
        </p>
      </section>

      <ConversationList
        conversations={conversations}
        eligibleContacts={eligibleContacts}
        baseHref="/hcp/messages"
        role="HCP"
        conversationsUnavailable={conversationsResult.status !== "success"}
        contactsUnavailable={contactsResult.status !== "success"}
      />
    </main>
  );
}
