import assert from "node:assert/strict";
import test from "node:test";

import {
  validateMessageContent,
  validateSendMessageInput,
} from "./message-validation.mjs";

test("validateMessageContent accepts valid string", () => {
  const result = validateMessageContent("Hello doctor, I have updated my symptoms.");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.content, "Hello doctor, I have updated my symptoms.");
  }
});

test("validateMessageContent trims whitespace", () => {
  const result = validateMessageContent("   Thank you for the advice.   ");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.content, "Thank you for the advice.");
  }
});

test("validateMessageContent rejects empty or whitespace-only strings", () => {
  assert.equal(validateMessageContent("").ok, false);
  assert.equal(validateMessageContent("    ").ok, false);
});

test("validateMessageContent rejects non-string types", () => {
  assert.equal(validateMessageContent(123).ok, false);
  assert.equal(validateMessageContent(null).ok, false);
  assert.equal(validateMessageContent(undefined).ok, false);
  assert.equal(validateMessageContent({}).ok, false);
});

test("validateMessageContent rejects content exceeding 2000 characters", () => {
  const longText = "a".repeat(2001);
  const result = validateMessageContent(longText);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /2,000 characters or fewer/i);
  }
});

test("validateSendMessageInput accepts valid recipient and content", () => {
  const result = validateSendMessageInput({
    recipientUserId: "14",
    content: "When is our appointment scheduled?",
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.data, {
      recipientUserId: 14,
      content: "When is our appointment scheduled?",
    });
  }
});

test("validateSendMessageInput rejects missing or invalid recipient", () => {
  assert.equal(validateSendMessageInput({ content: "Hi" }).ok, false);
  assert.equal(validateSendMessageInput({ recipientUserId: "abc", content: "Hi" }).ok, false);
  assert.equal(validateSendMessageInput({ recipientUserId: -1, content: "Hi" }).ok, false);
  assert.equal(validateSendMessageInput(null).ok, false);
});
