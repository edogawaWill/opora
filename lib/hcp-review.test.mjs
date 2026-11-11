import assert from "node:assert/strict";
import test from "node:test";

import { reviewHcpApplication } from "./hcp-review.mjs";

function makeHarness({
  status = "Pending",
  role = "HCP",
  accountStatus = "ACTIVE",
  emailVerified = true,
  auditError = false,
} = {}) {
  const state = {
    hcpID: 41,
    status,
    role,
    accountStatus,
    emailVerified,
    verifiedBy: null,
    verifiedAt: null,
    auditEntries: [],
    transactions: 0,
  };
  let transactionQueue = Promise.resolve();

  const prisma = {
    $transaction: (callback) => {
      const run = transactionQueue.then(async () => {
        state.transactions += 1;
        const pendingUpdate = [];
        const pendingAudit = [];
        const tx = {
          healthcareProfessional: {
            updateMany: async ({ where, data }) => {
              const eligible =
                state.hcpID === where.hcpID &&
                state.status === where.verificationStatus &&
                state.role === where.user.is.role &&
                state.accountStatus === where.user.is.accountStatus &&
                state.emailVerified === where.user.is.emailVerified;
              if (!eligible) return { count: 0 };
              pendingUpdate.push(() => {
                state.status = data.verificationStatus;
                state.verifiedBy = data.verifiedBy;
                state.verifiedAt = data.verifiedAt;
              });
              return { count: 1 };
            },
          },
          auditLog: {
            create: async ({ data }) => {
              if (auditError) throw new Error("simulated audit write failure");
              pendingAudit.push(data);
            },
          },
        };

        const result = await callback(tx);
        if (result) {
          pendingUpdate.forEach((apply) => apply());
          state.auditEntries.push(...pendingAudit);
        }
        return result;
      });
      transactionQueue = run.then(() => undefined, () => undefined);
      return run;
    },
  };

  return { state, prisma };
}

const admin = async () => ({ admin: { adminID: 7 } });

test("Admin approval updates the Pending profile and writes one audit event", async () => {
  const { state, prisma } = makeHarness();
  let adminChecks = 0;
  const result = await reviewHcpApplication({
    requireAdmin: async () => {
      adminChecks += 1;
      return admin();
    },
    prisma,
    hcpID: "41",
    decision: "Approved",
    now: () => new Date("2026-10-23T00:00:00.000Z"),
  });

  assert.deepEqual(result, { status: "success", message: "The HCP application has been approved." });
  assert.equal(adminChecks, 1);
  assert.equal(state.status, "Approved");
  assert.equal(state.verifiedBy, 7);
  assert.equal(state.verifiedAt.toISOString(), "2026-10-23T00:00:00.000Z");
  assert.equal(state.auditEntries.length, 1);
  assert.equal(state.auditEntries[0].adminID, 7);
  assert.equal(state.auditEntries[0].action, "HCP_APPROVED");
  assert.deepEqual(state.auditEntries[0].changedFields, {
    verificationStatus: { from: "Pending", to: "Approved" },
  });
});

test("Admin rejection leaves approval-only fields null and writes one audit event", async () => {
  const { state, prisma } = makeHarness();
  const result = await reviewHcpApplication({ requireAdmin: admin, prisma, hcpID: 41, decision: "Rejected" });

  assert.equal(result.status, "success");
  assert.equal(state.status, "Rejected");
  assert.equal(state.verifiedBy, null);
  assert.equal(state.verifiedAt, null);
  assert.equal(state.auditEntries.length, 1);
  assert.equal(state.auditEntries[0].action, "HCP_REJECTED");
  assert.equal(state.auditEntries[0].adminID, 7);
  assert.equal(state.auditEntries[0].entityID, 41);
});

test("non-Admin authorization failure performs no transaction or audit write", async () => {
  const { state, prisma } = makeHarness();
  const result = await reviewHcpApplication({
    requireAdmin: async () => { throw new Error("forbidden"); },
    prisma,
    hcpID: 41,
    decision: "Approved",
  });

  assert.deepEqual(result, {
    status: "error",
    message: "This HCP application is unavailable or no longer eligible for review.",
  });
  assert.equal(state.transactions, 0);
  assert.equal(state.auditEntries.length, 0);
});

test("missing profiles, invalid IDs, and unsupported decisions fail safely", async () => {
  const { state, prisma } = makeHarness();
  const invoke = (hcpID, decision) => reviewHcpApplication({ requireAdmin: admin, prisma, hcpID, decision });
  const missing = await invoke(99, "Approved");
  const invalidId = await invoke("41;unexpected", "Approved");
  const invalidDecision = await invoke(41, "Pending");

  assert.deepEqual(missing, invalidId);
  assert.deepEqual(missing, invalidDecision);
  assert.equal(state.auditEntries.length, 0);
});

test("non-Pending, unverified, inactive, or non-HCP accounts cannot be reviewed", async () => {
  for (const options of [
    { status: "Approved" },
    { status: "Rejected" },
    { emailVerified: false },
    { accountStatus: "DISABLED" },
    { role: "PATIENT" },
  ]) {
    const { state, prisma } = makeHarness(options);
    const result = await reviewHcpApplication({ requireAdmin: admin, prisma, hcpID: 41, decision: "Approved" });
    assert.equal(result.status, "error");
    assert.equal(state.status, options.status ?? "Pending");
    assert.equal(state.auditEntries.length, 0);
  }
});

test("repeated and concurrent decisions permit only one transition and one audit", async () => {
  const { state, prisma } = makeHarness();
  const first = await reviewHcpApplication({ requireAdmin: admin, prisma, hcpID: 41, decision: "Approved" });
  const repeated = await reviewHcpApplication({ requireAdmin: admin, prisma, hcpID: 41, decision: "Rejected" });

  assert.equal(first.status, "success");
  assert.equal(repeated.status, "error");
  assert.equal(state.status, "Approved");
  assert.equal(state.auditEntries.length, 1);

  const concurrent = makeHarness();
  const results = await Promise.all([
    reviewHcpApplication({ requireAdmin: admin, prisma: concurrent.prisma, hcpID: 41, decision: "Approved" }),
    reviewHcpApplication({ requireAdmin: admin, prisma: concurrent.prisma, hcpID: 41, decision: "Rejected" }),
  ]);
  assert.equal(results.filter((result) => result.status === "success").length, 1);
  assert.equal(concurrent.state.auditEntries.length, 1);
});

test("audit failure returns a safe error and does not report success", async () => {
  const { state, prisma } = makeHarness({ auditError: true });
  const result = await reviewHcpApplication({ requireAdmin: admin, prisma, hcpID: 41, decision: "Approved" });

  assert.equal(result.status, "error");
  assert.equal(result.message, "We could not complete this review. Please refresh and try again.");
  assert.equal(state.status, "Pending");
  assert.equal(state.auditEntries.length, 0);
});
