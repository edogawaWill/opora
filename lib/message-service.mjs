import { validateSendMessageInput } from "./message-validation.mjs";

const AUTH_REQUIRED = Object.freeze({
  status: "error",
  message: "Your session is no longer available. Please sign in again.",
});

function positiveInteger(value) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;

  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 2_147_483_647
    ? parsed
    : null;
}

/**
 * Returns the authenticated user's userId, or null if the session is unavailable.
 * Accepts either a requirePatient or requireApprovedHcp principal resolver.
 *
 * @param {() => Promise<any>} requireUser
 * @returns {Promise<number | null>}
 */
async function resolveUserId(requireUser) {
  let principal;
  try {
    principal = await requireUser();
  } catch {
    return null;
  }
  return positiveInteger(principal?.userId) ?? null;
}

/**
 * Loads the conversation list for the authenticated user.
 * Each entry represents one unique conversation partner with the latest message
 * content, timestamp, and how many unread messages exist in that conversation.
 *
 * @param {{
 *   requireUser: () => Promise<{ userId: number }>,
 *   prisma: any,
 * }} options
 * @returns {Promise<
 *   | { status: "success"; conversations: Array<{
 *       otherUserId: number;
 *       otherFullName: string;
 *       lastContent: string;
 *       lastSentAt: Date;
 *       unreadCount: number;
 *     }> }
 *   | { status: "error"; message: string }
 * >}
 */
export async function loadConversations({ requireUser, prisma }) {
  const myUserId = await resolveUserId(requireUser);
  if (myUserId === null) return AUTH_REQUIRED;

  try {
    // Load all messages where I am sender or receiver, newest first
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderID: myUserId }, { receiverID: myUserId }],
      },
      select: {
        messageID: true,
        senderID: true,
        receiverID: true,
        content: true,
        sentAt: true,
        readStatus: true,
        sender: { select: { id: true, fullName: true } },
        receiver: { select: { id: true, fullName: true } },
      },
      orderBy: { sentAt: "desc" },
    });

    // Build a map of otherUserId → latest conversation entry
    const conversationMap = new Map();

    for (const msg of messages) {
      const otherUserId =
        msg.senderID === myUserId ? msg.receiverID : msg.senderID;
      const otherUser =
        msg.senderID === myUserId ? msg.receiver : msg.sender;

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          otherUserId,
          otherFullName: otherUser.fullName ?? "Unknown",
          lastContent: msg.content,
          lastSentAt: msg.sentAt,
          unreadCount: 0,
        });
      }

      // Count unread messages sent to me in this conversation
      if (msg.receiverID === myUserId && !msg.readStatus) {
        const entry = conversationMap.get(otherUserId);
        entry.unreadCount += 1;
      }
    }

    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) => b.lastSentAt - a.lastSentAt,
    );

    return { status: "success", conversations };
  } catch {
    return {
      status: "error",
      message: "Could not load conversations. Please try again.",
    };
  }
}

/**
 * Loads all messages in a conversation between the authenticated user and
 * a specific other user, verifying participant membership.
 *
 * @param {{
 *   requireUser: () => Promise<{ userId: number }>,
 *   prisma: any,
 *   otherUserId: unknown,
 * }} options
 * @returns {Promise<
 *   | { status: "success"; messages: Array<{
 *       messageID: number;
 *       senderID: number;
 *       receiverID: number;
 *       content: string;
 *       sentAt: Date;
 *       readStatus: boolean;
 *     }> }
 *   | { status: "error"; message: string }
 * >}
 */
export async function loadConversationMessages({
  requireUser,
  prisma,
  otherUserId,
}) {
  const myUserId = await resolveUserId(requireUser);
  if (myUserId === null) return AUTH_REQUIRED;

  const validOtherUserId = positiveInteger(otherUserId);
  if (validOtherUserId === null) {
    return { status: "error", message: "Invalid conversation participant." };
  }

  if (validOtherUserId === myUserId) {
    return { status: "error", message: "Cannot load a conversation with yourself." };
  }

  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderID: myUserId, receiverID: validOtherUserId },
          { senderID: validOtherUserId, receiverID: myUserId },
        ],
      },
      select: {
        messageID: true,
        senderID: true,
        receiverID: true,
        content: true,
        sentAt: true,
        readStatus: true,
      },
      orderBy: [{ sentAt: "asc" }, { messageID: "asc" }],
    });

    return { status: "success", messages };
  } catch {
    return {
      status: "error",
      message: "Could not load messages. Please try again.",
    };
  }
}

/**
 * Sends a message from the authenticated user to a recipient.
 * The sender identity is always derived from the authenticated session;
 * client-supplied senderID is never trusted.
 *
 * @param {{
 *   requireUser: () => Promise<{ userId: number }>,
 *   prisma: any,
 *   input: unknown,
 * }} options
 * @returns {Promise<
 *   | { status: "success"; message: string; messageID: number }
 *   | { status: "error"; message: string }
 * >}
 */
export async function sendMessage({ requireUser, prisma, input }) {
  const myUserId = await resolveUserId(requireUser);
  if (myUserId === null) return AUTH_REQUIRED;

  const validation = validateSendMessageInput(input);
  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  const { recipientUserId, content } = validation.data;

  if (recipientUserId === myUserId) {
    return { status: "error", message: "You cannot send a message to yourself." };
  }

  try {
    const created = await prisma.message.create({
      data: {
        senderID: myUserId,
        receiverID: recipientUserId,
        content,
        readStatus: false,
      },
      select: { messageID: true },
    });

    return {
      status: "success",
      message: "Message sent.",
      messageID: created.messageID,
    };
  } catch {
    return {
      status: "error",
      message: "Could not send your message. Please try again.",
    };
  }
}

/**
 * Marks all messages in a conversation as read on behalf of the authenticated user.
 * Only messages where the authenticated user is the receiver are marked.
 *
 * @param {{
 *   requireUser: () => Promise<{ userId: number }>,
 *   prisma: any,
 *   otherUserId: unknown,
 * }} options
 * @returns {Promise<{ status: "success" } | { status: "error"; message: string }>}
 */
export async function markConversationRead({ requireUser, prisma, otherUserId }) {
  const myUserId = await resolveUserId(requireUser);
  if (myUserId === null) return AUTH_REQUIRED;

  const validOtherUserId = positiveInteger(otherUserId);
  if (validOtherUserId === null) {
    return { status: "error", message: "Invalid conversation participant." };
  }

  try {
    await prisma.message.updateMany({
      where: {
        senderID: validOtherUserId,
        receiverID: myUserId,
        readStatus: false,
      },
      data: { readStatus: true },
    });

    return { status: "success" };
  } catch {
    return {
      status: "error",
      message: "Could not mark messages as read.",
    };
  }
}

/**
 * Returns the count of unread messages for the authenticated user.
 *
 * @param {{
 *   requireUser: () => Promise<{ userId: number }>,
 *   prisma: any,
 * }} options
 * @returns {Promise<{ status: "success"; count: number } | { status: "error"; message: string }>}
 */
export async function loadUnreadCount({ requireUser, prisma }) {
  const myUserId = await resolveUserId(requireUser);
  if (myUserId === null) return AUTH_REQUIRED;

  try {
    const count = await prisma.message.count({
      where: {
        receiverID: myUserId,
        readStatus: false,
      },
    });

    return { status: "success", count };
  } catch {
    return {
      status: "error",
      message: "Could not load unread count.",
    };
  }
}

/**
 * Loads the details of a conversation partner.
 *
 * @param {{
 *   requireUser: () => Promise<{ userId: number }>,
 *   prisma: any,
 *   otherUserId: unknown,
 * }} options
 */
export async function loadConversationPartner({ requireUser, prisma, otherUserId }) {
  const myUserId = await resolveUserId(requireUser);
  if (myUserId === null) return AUTH_REQUIRED;

  const validOtherUserId = positiveInteger(otherUserId);
  if (validOtherUserId === null || validOtherUserId === myUserId) {
    return { status: "error", message: "Invalid participant." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: validOtherUserId },
      select: {
        id: true,
        fullName: true,
        role: true,
        healthcareProfessional: {
          select: {
            specialization: true,
            workplace: true,
          },
        },
      },
    });

    if (!user) {
      return { status: "error", message: "User not found." };
    }

    return {
      status: "success",
      partner: {
        userId: user.id,
        fullName: user.fullName,
        role: user.role,
        specialization: user.healthcareProfessional?.specialization ?? null,
        workplace: user.healthcareProfessional?.workplace ?? null,
      },
    };
  } catch {
    return { status: "error", message: "Could not load participant information." };
  }
}

/**
 * Loads eligible approved Healthcare Professionals for a patient to initiate a message with.
 *
 * @param {{
 *   requirePatient: () => Promise<any>,
 *   prisma: any,
 * }} options
 */
export async function loadEligibleHcpContacts({ requirePatient, prisma }) {
  try {
    await requirePatient();
  } catch {
    return { status: "error", message: "Unauthorized.", contacts: [] };
  }

  try {
    const hcps = await prisma.healthcareProfessional.findMany({
      where: {
        verificationStatus: "Approved",
        user: { is: { role: "HCP", accountStatus: "ACTIVE", emailVerified: true } },
      },
      select: {
        hcpID: true,
        userID: true,
        specialization: true,
        workplace: true,
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { user: { fullName: "asc" } },
    });

    return {
      status: "success",
      contacts: hcps.map((hcp) => ({
        hcpID: hcp.hcpID,
        userId: hcp.userID,
        fullName: hcp.user.fullName,
        specialization: hcp.specialization,
        workplace: hcp.workplace,
      })),
    };
  } catch {
    return { status: "error", message: "Could not load healthcare professionals.", contacts: [] };
  }
}

/**
 * Loads patients who have consented or have appointments with this HCP,
 * allowing the HCP to initiate or resume contact.
 *
 * @param {{
 *   requireApprovedHcp: () => Promise<any>,
 *   prisma: any,
 * }} options
 */
export async function loadEligiblePatientContacts({ requireApprovedHcp, prisma }) {
  let principal;
  try {
    principal = await requireApprovedHcp();
  } catch {
    return { status: "error", message: "Unauthorized.", contacts: [] };
  }
  const hcpID = positiveInteger(principal?.healthcareProfessional?.hcpID);
  if (hcpID === null) return { status: "error", message: "Unauthorized.", contacts: [] };

  try {
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { hcpConsents: { some: { hcpID, status: "ACTIVE" } } },
          { appointments: { some: { hcpID } } },
        ],
      },
      select: {
        patientID: true,
        userID: true,
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { user: { fullName: "asc" } },
    });

    return {
      status: "success",
      contacts: patients.map((p) => ({
        patientID: p.patientID,
        userId: p.userID,
        fullName: p.user.fullName,
      })),
    };
  } catch {
    return { status: "error", message: "Could not load patient contacts.", contacts: [] };
  }
}
