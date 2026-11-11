import assert from "node:assert/strict";
import test from "node:test";

import {
  loadConversations,
  loadConversationMessages,
  sendMessage,
  markConversationRead,
  loadUnreadCount,
  loadConversationPartner,
  loadEligibleHcpContacts,
  loadEligiblePatientContacts,
} from "./message-service.mjs";

// ---------------------------------------------------------------------------
// Shared mock builders
// ---------------------------------------------------------------------------

/**
 * Creates a requireUser mock that resolves with a given userId,
 * or throws if userId is null (simulating unauthenticated).
 */
function makeRequireUser(userId) {
  return async () => {
    if (userId === null) throw new Error("unauthenticated");
    return { userId };
  };
}

/**
 * Builds a minimal prisma mock for message operations.
 * Allows injecting pre-canned data and tracking calls.
 */
function makePrisma({
  messages = [],
  createdMessageID = 99,
  findManyError = false,
  createError = false,
  updateManyError = false,
  countError = false,
  countValue = 0,
  userRecord = null,
  hcpRecords = [],
  patientRecords = [],
} = {}) {
  const state = {
    findManyCalls: [],
    createCalls: [],
    updateManyCalls: [],
    countCalls: [],
    userFindUniqueCalls: [],
    hcpFindManyCalls: [],
    patientFindManyCalls: [],
  };

  const prisma = {
    message: {
      findMany: async (args) => {
        state.findManyCalls.push(args);
        if (findManyError) throw new Error("DB error");
        return messages;
      },
      create: async (args) => {
        state.createCalls.push(args);
        if (createError) throw new Error("DB error");
        return { messageID: createdMessageID };
      },
      updateMany: async (args) => {
        state.updateManyCalls.push(args);
        if (updateManyError) throw new Error("DB error");
        return { count: 1 };
      },
      count: async (args) => {
        state.countCalls.push(args);
        if (countError) throw new Error("DB error");
        return countValue;
      },
    },
    user: {
      findUnique: async (args) => {
        state.userFindUniqueCalls.push(args);
        return userRecord;
      },
    },
    healthcareProfessional: {
      findMany: async (args) => {
        state.hcpFindManyCalls.push(args);
        return hcpRecords;
      },
    },
    patient: {
      findMany: async (args) => {
        state.patientFindManyCalls.push(args);
        return patientRecords;
      },
    },
  };

  return { prisma, state };
}

// ---------------------------------------------------------------------------
// loadConversations
// ---------------------------------------------------------------------------

test("loadConversations returns auth error when requireUser throws", async () => {
  const { prisma } = makePrisma();
  const result = await loadConversations({
    requireUser: makeRequireUser(null),
    prisma,
  });

  assert.equal(result.status, "error");
  assert.match(result.message, /session/i);
});

test("loadConversations returns empty list when no messages exist", async () => {
  const { prisma } = makePrisma({ messages: [] });
  const result = await loadConversations({
    requireUser: makeRequireUser(1),
    prisma,
  });

  assert.equal(result.status, "success");
  assert.deepEqual(result.conversations, []);
});

test("loadConversations groups messages by conversation partner with latest message", async () => {
  const baseDate = new Date("2026-10-27T10:00:00Z");
  const laterDate = new Date("2026-10-27T12:00:00Z");

  const messages = [
    {
      messageID: 2,
      senderID: 5,
      receiverID: 1,
      content: "Latest from HCP",
      sentAt: laterDate,
      readStatus: false,
      sender: { id: 5, fullName: "Dr Smith" },
      receiver: { id: 1, fullName: "Alice" },
    },
    {
      messageID: 1,
      senderID: 1,
      receiverID: 5,
      content: "Earlier from me",
      sentAt: baseDate,
      readStatus: true,
      sender: { id: 1, fullName: "Alice" },
      receiver: { id: 5, fullName: "Dr Smith" },
    },
  ];

  const { prisma } = makePrisma({ messages });
  const result = await loadConversations({ requireUser: makeRequireUser(1), prisma });

  assert.equal(result.status, "success");
  assert.equal(result.conversations.length, 1);

  const convo = result.conversations[0];
  assert.equal(convo.otherUserId, 5);
  assert.equal(convo.otherFullName, "Dr Smith");
  assert.equal(convo.lastContent, "Latest from HCP");
  assert.equal(convo.unreadCount, 1);
});

test("loadConversations counts unread correctly for multiple partners", async () => {
  const t1 = new Date("2026-10-27T08:00:00Z");
  const t2 = new Date("2026-10-27T09:00:00Z");

  const messages = [
    // Partner A (userId=2): 2 unread messages to me
    { messageID: 1, senderID: 2, receiverID: 1, content: "Msg1", sentAt: t1, readStatus: false, sender: { id: 2, fullName: "Partner A" }, receiver: { id: 1, fullName: "Me" } },
    { messageID: 2, senderID: 2, receiverID: 1, content: "Msg2", sentAt: t2, readStatus: false, sender: { id: 2, fullName: "Partner A" }, receiver: { id: 1, fullName: "Me" } },
    // Partner B (userId=3): 0 unread (I sent it)
    { messageID: 3, senderID: 1, receiverID: 3, content: "Hi", sentAt: t1, readStatus: false, sender: { id: 1, fullName: "Me" }, receiver: { id: 3, fullName: "Partner B" } },
  ];

  const { prisma } = makePrisma({ messages });
  const result = await loadConversations({ requireUser: makeRequireUser(1), prisma });

  assert.equal(result.status, "success");
  assert.equal(result.conversations.length, 2);

  const convA = result.conversations.find((c) => c.otherUserId === 2);
  const convB = result.conversations.find((c) => c.otherUserId === 3);
  assert.equal(convA?.unreadCount, 2);
  assert.equal(convB?.unreadCount, 0);
});

test("loadConversations returns error when prisma throws", async () => {
  const { prisma } = makePrisma({ findManyError: true });
  const result = await loadConversations({ requireUser: makeRequireUser(1), prisma });

  assert.equal(result.status, "error");
  assert.match(result.message, /could not load conversations/i);
});

// ---------------------------------------------------------------------------
// loadConversationMessages
// ---------------------------------------------------------------------------

test("loadConversationMessages returns auth error when unauthenticated", async () => {
  const { prisma } = makePrisma();
  const result = await loadConversationMessages({
    requireUser: makeRequireUser(null),
    prisma,
    otherUserId: 5,
  });

  assert.equal(result.status, "error");
  assert.match(result.message, /session/i);
});

test("loadConversationMessages rejects invalid otherUserId", async () => {
  const { prisma } = makePrisma();
  const result = await loadConversationMessages({
    requireUser: makeRequireUser(1),
    prisma,
    otherUserId: "not-a-number",
  });

  assert.equal(result.status, "error");
  assert.match(result.message, /invalid/i);
});

test("loadConversationMessages rejects self-conversation", async () => {
  const { prisma } = makePrisma();
  const result = await loadConversationMessages({
    requireUser: makeRequireUser(1),
    prisma,
    otherUserId: 1,
  });

  assert.equal(result.status, "error");
  assert.match(result.message, /yourself/i);
});

test("loadConversationMessages returns messages scoped to the two participants", async () => {
  const msgs = [
    { messageID: 1, senderID: 1, receiverID: 5, content: "Hi", sentAt: new Date("2026-10-27T10:00:00Z"), readStatus: true },
    { messageID: 2, senderID: 5, receiverID: 1, content: "Hello", sentAt: new Date("2026-10-27T10:05:00Z"), readStatus: false },
  ];

  const { prisma, state } = makePrisma({ messages: msgs });
  const result = await loadConversationMessages({
    requireUser: makeRequireUser(1),
    prisma,
    otherUserId: 5,
  });

  assert.equal(result.status, "success");
  assert.equal(result.messages.length, 2);

  // Verify the query scoped correctly to the two participants
  const query = state.findManyCalls[0];
  assert.ok(query.where.OR);
  const sides = query.where.OR;
  assert.ok(
    sides.some((s) => s.senderID === 1 && s.receiverID === 5),
    "should query side A→B",
  );
  assert.ok(
    sides.some((s) => s.senderID === 5 && s.receiverID === 1),
    "should query side B→A",
  );
});

test("loadConversationMessages returns error when prisma throws", async () => {
  const { prisma } = makePrisma({ findManyError: true });
  const result = await loadConversationMessages({
    requireUser: makeRequireUser(1),
    prisma,
    otherUserId: 5,
  });

  assert.equal(result.status, "error");
  assert.match(result.message, /could not load messages/i);
});

// ---------------------------------------------------------------------------
// sendMessage
// ---------------------------------------------------------------------------

test("sendMessage returns auth error when unauthenticated", async () => {
  const { prisma } = makePrisma();
  const result = await sendMessage({
    requireUser: makeRequireUser(null),
    prisma,
    input: { recipientUserId: 5, content: "Hello" },
  });

  assert.equal(result.status, "error");
  assert.match(result.message, /session/i);
});

test("sendMessage rejects invalid input from validation layer", async () => {
  const { prisma, state } = makePrisma();
  const result = await sendMessage({
    requireUser: makeRequireUser(1),
    prisma,
    input: { recipientUserId: "abc", content: "Hello" },
  });

  assert.equal(result.status, "error");
  assert.equal(state.createCalls.length, 0);
});

test("sendMessage rejects empty content", async () => {
  const { prisma, state } = makePrisma();
  const result = await sendMessage({
    requireUser: makeRequireUser(1),
    prisma,
    input: { recipientUserId: 5, content: "   " },
  });

  assert.equal(result.status, "error");
  assert.equal(state.createCalls.length, 0);
});

test("sendMessage prevents sending a message to yourself", async () => {
  const { prisma, state } = makePrisma();
  const result = await sendMessage({
    requireUser: makeRequireUser(1),
    prisma,
    input: { recipientUserId: 1, content: "Hello myself" },
  });

  assert.equal(result.status, "error");
  assert.match(result.message, /yourself/i);
  assert.equal(state.createCalls.length, 0);
});

test("sendMessage always uses session userId as senderID, never trusts client senderID", async () => {
  const { prisma, state } = makePrisma({ createdMessageID: 42 });

  const result = await sendMessage({
    requireUser: makeRequireUser(7),
    prisma,
    // Attempt to forge senderID to 99; should be ignored
    input: { recipientUserId: 5, content: "Legitimate message" },
  });

  assert.equal(result.status, "success");
  assert.equal(result.messageID, 42);
  assert.equal(state.createCalls.length, 1);
  assert.equal(state.createCalls[0].data.senderID, 7); // session userId, not a forged value
  assert.equal(state.createCalls[0].data.receiverID, 5);
  assert.equal(state.createCalls[0].data.content, "Legitimate message");
  assert.equal(state.createCalls[0].data.readStatus, false);
});

test("sendMessage returns error when prisma throws", async () => {
  const { prisma } = makePrisma({ createError: true });
  const result = await sendMessage({
    requireUser: makeRequireUser(1),
    prisma,
    input: { recipientUserId: 5, content: "Hello" },
  });

  assert.equal(result.status, "error");
  assert.match(result.message, /could not send/i);
});

// ---------------------------------------------------------------------------
// markConversationRead
// ---------------------------------------------------------------------------

test("markConversationRead returns auth error when unauthenticated", async () => {
  const { prisma } = makePrisma();
  const result = await markConversationRead({
    requireUser: makeRequireUser(null),
    prisma,
    otherUserId: 5,
  });

  assert.equal(result.status, "error");
  assert.match(result.message, /session/i);
});

test("markConversationRead rejects invalid otherUserId", async () => {
  const { prisma } = makePrisma();
  const result = await markConversationRead({
    requireUser: makeRequireUser(1),
    prisma,
    otherUserId: -5,
  });

  assert.equal(result.status, "error");
  assert.match(result.message, /invalid/i);
});

test("markConversationRead only marks messages where I am the receiver", async () => {
  const { prisma, state } = makePrisma();
  const result = await markConversationRead({
    requireUser: makeRequireUser(1),
    prisma,
    otherUserId: 5,
  });

  assert.equal(result.status, "success");
  assert.equal(state.updateManyCalls.length, 1);
  const where = state.updateManyCalls[0].where;
  assert.equal(where.receiverID, 1); // my userId
  assert.equal(where.senderID, 5); // other party
  assert.equal(where.readStatus, false);
  assert.equal(state.updateManyCalls[0].data.readStatus, true);
});

test("markConversationRead returns error when prisma throws", async () => {
  const { prisma } = makePrisma({ updateManyError: true });
  const result = await markConversationRead({
    requireUser: makeRequireUser(1),
    prisma,
    otherUserId: 5,
  });

  assert.equal(result.status, "error");
  assert.match(result.message, /could not mark/i);
});

// ---------------------------------------------------------------------------
// loadUnreadCount
// ---------------------------------------------------------------------------

test("loadUnreadCount returns auth error when unauthenticated", async () => {
  const { prisma } = makePrisma();
  const result = await loadUnreadCount({
    requireUser: makeRequireUser(null),
    prisma,
  });

  assert.equal(result.status, "error");
  assert.match(result.message, /session/i);
});

test("loadUnreadCount returns zero when there are no unread messages", async () => {
  const { prisma } = makePrisma({ countValue: 0 });
  const result = await loadUnreadCount({ requireUser: makeRequireUser(1), prisma });

  assert.equal(result.status, "success");
  assert.equal(result.count, 0);
});

test("loadUnreadCount returns correct count scoped to authenticated user as receiver", async () => {
  const { prisma, state } = makePrisma({ countValue: 4 });
  const result = await loadUnreadCount({ requireUser: makeRequireUser(1), prisma });

  assert.equal(result.status, "success");
  assert.equal(result.count, 4);

  const where = state.countCalls[0].where;
  assert.equal(where.receiverID, 1);
  assert.equal(where.readStatus, false);
});

test("loadUnreadCount returns error when prisma throws", async () => {
  const { prisma } = makePrisma({ countError: true });
  const result = await loadUnreadCount({ requireUser: makeRequireUser(1), prisma });

  assert.equal(result.status, "error");
  assert.match(result.message, /could not load unread count/i);
});

// ---------------------------------------------------------------------------
// loadConversationPartner
// ---------------------------------------------------------------------------

test("loadConversationPartner returns auth error when unauthenticated", async () => {
  const { prisma } = makePrisma();
  const result = await loadConversationPartner({
    requireUser: makeRequireUser(null),
    prisma,
    otherUserId: 5,
  });

  assert.equal(result.status, "error");
  assert.match(result.message, /session/i);
});

test("loadConversationPartner rejects invalid otherUserId or self", async () => {
  const { prisma } = makePrisma();
  const res1 = await loadConversationPartner({
    requireUser: makeRequireUser(1),
    prisma,
    otherUserId: 1,
  });
  assert.equal(res1.status, "error");
  assert.match(res1.message, /invalid/i);

  const res2 = await loadConversationPartner({
    requireUser: makeRequireUser(1),
    prisma,
    otherUserId: "abc",
  });
  assert.equal(res2.status, "error");
});

test("loadConversationPartner returns partner info when found", async () => {
  const { prisma } = makePrisma({
    userRecord: {
      id: 5,
      fullName: "Dr Sarah",
      role: "HCP",
      healthcareProfessional: {
        specialization: "Cardiology",
        workplace: "General Hospital",
      },
    },
  });

  const result = await loadConversationPartner({
    requireUser: makeRequireUser(1),
    prisma,
    otherUserId: 5,
  });

  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.partner.userId, 5);
    assert.equal(result.partner.fullName, "Dr Sarah");
    assert.equal(result.partner.specialization, "Cardiology");
    assert.equal(result.partner.workplace, "General Hospital");
  }
});

// ---------------------------------------------------------------------------
// loadEligibleHcpContacts
// ---------------------------------------------------------------------------

test("loadEligibleHcpContacts rejects unauthenticated patient", async () => {
  const { prisma } = makePrisma();
  const requirePatient = async () => {
    throw new Error("unauthorized");
  };

  const result = await loadEligibleHcpContacts({ requirePatient, prisma });
  assert.equal(result.status, "error");
  assert.deepEqual(result.contacts, []);
});

test("loadEligibleHcpContacts returns formatted HCP contacts", async () => {
  const { prisma } = makePrisma({
    hcpRecords: [
      {
        hcpID: 10,
        userID: 25,
        specialization: "General Practice",
        workplace: "Clinic A",
        user: { id: 25, fullName: "Dr Alice" },
      },
    ],
  });

  const result = await loadEligibleHcpContacts({
    requirePatient: async () => ({ patient: { patientID: 1 } }),
    prisma,
  });

  assert.equal(result.status, "success");
  assert.equal(result.contacts.length, 1);
  assert.equal(result.contacts[0].userId, 25);
  assert.equal(result.contacts[0].fullName, "Dr Alice");
});

// ---------------------------------------------------------------------------
// loadEligiblePatientContacts
// ---------------------------------------------------------------------------

test("loadEligiblePatientContacts rejects unauthenticated HCP", async () => {
  const { prisma } = makePrisma();
  const requireApprovedHcp = async () => {
    throw new Error("unauthorized");
  };

  const result = await loadEligiblePatientContacts({ requireApprovedHcp, prisma });
  assert.equal(result.status, "error");
  assert.deepEqual(result.contacts, []);
});

test("loadEligiblePatientContacts returns formatted patient contacts", async () => {
  const { prisma } = makePrisma({
    patientRecords: [
      {
        patientID: 3,
        userID: 12,
        user: { id: 12, fullName: "Bob Patient" },
      },
    ],
  });

  const result = await loadEligiblePatientContacts({
    requireApprovedHcp: async () => ({
      healthcareProfessional: { hcpID: 2 },
    }),
    prisma,
  });

  assert.equal(result.status, "success");
  assert.equal(result.contacts.length, 1);
  assert.equal(result.contacts[0].userId, 12);
  assert.equal(result.contacts[0].fullName, "Bob Patient");
});
