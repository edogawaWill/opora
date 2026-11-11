function positiveInteger(value) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN;

  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 2_147_483_647
    ? parsed
    : null;
}

/**
 * Validates message content text.
 * @param {unknown} content
 * @returns {{ ok: true, content: string } | { ok: false, message: string }}
 */
export function validateMessageContent(content) {
  if (typeof content !== "string") {
    return { ok: false, message: "Message content must be text." };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { ok: false, message: "Message cannot be empty." };
  }

  if (trimmed.length > 2000) {
    return { ok: false, message: "Message must be 2,000 characters or fewer." };
  }

  return { ok: true, content: trimmed };
}

/**
 * Validates message sending input.
 * @param {unknown} input
 * @returns {{ ok: true, data: { recipientUserId: number, content: string } } | { ok: false, message: string }}
 */
export function validateSendMessageInput(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "Invalid message input." };
  }

  const candidate = /** @type {Record<string, unknown>} */ (input);
  const recipientUserId = positiveInteger(candidate.recipientUserId);
  if (recipientUserId === null) {
    return { ok: false, message: "A valid recipient must be selected." };
  }

  const contentValidation = validateMessageContent(candidate.content);
  if (!contentValidation.ok) {
    return { ok: false, message: contentValidation.message };
  }

  return {
    ok: true,
    data: {
      recipientUserId,
      content: contentValidation.content,
    },
  };
}
