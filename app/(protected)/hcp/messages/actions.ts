"use server";

import { revalidatePath } from "next/cache";

import { requireApprovedHcp } from "@/lib/authorization";
import { sendMessage } from "@/lib/message-service.mjs";
import type { MessageActionState } from "@/lib/message-action-state";
import prisma from "@/lib/prisma";

export async function sendHcpMessageAction(
  _previousState: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  const recipientUserId = formData.get("recipientUserId");
  const content = formData.get("content");

  const result = await sendMessage({
    requireUser: requireApprovedHcp,
    prisma,
    input: {
      recipientUserId,
      content,
    },
  });

  if (result.status === "success") {
    revalidatePath("/hcp/messages");
    if (recipientUserId) {
      revalidatePath(`/hcp/messages/${recipientUserId}`);
    }
    return {
      status: "success",
      message: result.message,
      messageID: result.messageID,
    };
  }

  return {
    status: "error",
    message: result.message,
  };
}
