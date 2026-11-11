import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import MessageThread, {
  type ConversationPartner,
  type MessageItem,
} from "@/components/messages/message-thread";
import { Icon } from "@/components/ui/icon";
import { sendHcpMessageAction } from "@/app/(protected)/hcp/messages/actions";
import { AuthorizationError, requireApprovedHcp } from "@/lib/authorization";
import {
  loadConversationMessages,
  loadConversationPartner,
  markConversationRead,
} from "@/lib/message-service.mjs";
import prisma from "@/lib/prisma";
import styles from "@/components/hcp/hcp-desktop.module.css";

type RawMessage = {
  messageID: number;
  senderID: number;
  receiverID: number;
  content: string;
  sentAt: Date;
  readStatus: boolean;
};

type PageProps = {
  params: Promise<{ userId: string }>;
};

function LoadingFallback() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading conversation…</p>
      </div>
    </div>
  );
}

export default function HcpConversationPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HcpConversationContent params={props.params} />
    </Suspense>
  );
}

async function HcpConversationContent({ params }: PageProps) {
  let principal;
  try {
    principal = await requireApprovedHcp();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const { userId } = await params;
  const targetUserId = Number(userId);
  if (!Number.isSafeInteger(targetUserId) || targetUserId <= 0) {
    notFound();
  }

  // Mark unread messages from this partner as read upon viewing
  await markConversationRead({
    requireUser: async () => principal,
    prisma,
    otherUserId: targetUserId,
  });

  const [partnerResult, messagesResult] = await Promise.all([
    loadConversationPartner({
      requireUser: async () => principal,
      prisma,
      otherUserId: targetUserId,
    }),
    loadConversationMessages({
      requireUser: async () => principal,
      prisma,
      otherUserId: targetUserId,
    }),
  ]);

  if (partnerResult.status !== "success" || !partnerResult.partner) {
    notFound();
  }

  const partner: ConversationPartner = {
    userId: partnerResult.partner.userId,
    fullName: partnerResult.partner.fullName,
    role: partnerResult.partner.role,
    specialization: partnerResult.partner.specialization,
    workplace: partnerResult.partner.workplace,
  };

  const rawMessages: RawMessage[] =
    messagesResult.status === "success" ? messagesResult.messages : [];
  const messages: MessageItem[] = rawMessages.map((m) => ({
    messageID: m.messageID,
    senderID: m.senderID,
    receiverID: m.receiverID,
    content: m.content,
    sentAt: m.sentAt,
    readStatus: m.readStatus,
  }));

  return (
    <main className={`${styles.desktopPage} ${styles.conversationPage}`}>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/hcp/messages"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#6F1D35] hover:text-[#57152A] transition-colors"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          Back to Messages
        </Link>
      </div>

      <MessageThread
        currentUserId={principal.userId}
        partner={partner}
        messages={messages}
        sendAction={sendHcpMessageAction}
        backHref="/hcp/messages"
        messagesUnavailable={messagesResult.status !== "success"}
      />
    </main>
  );
}
