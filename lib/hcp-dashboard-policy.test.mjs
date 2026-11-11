import assert from "node:assert/strict";
import test from "node:test";

import { ownApprovedHcpProfileWhere } from "./hcp-dashboard-policy.mjs";

const approvedHcp = (overrides = {}) => ({
  role: "HCP",
  accountStatus: "ACTIVE",
  emailVerified: true,
  healthcareProfessional: { hcpID: 23, verificationStatus: "Approved" },
  ...overrides,
});

test("profile filter uses only the authenticated approved HCP profile ID", () => {
  assert.deepEqual(
    ownApprovedHcpProfileWhere({ ...approvedHcp(), hcpID: 999 }),
    { hcpID: 23 },
  );
});

test("dashboard profile filter fails closed for non-HCP and ineligible principals", () => {
  const cases = [
    null,
    approvedHcp({ role: "PATIENT" }),
    approvedHcp({ role: "ADMIN" }),
    approvedHcp({ accountStatus: "SUSPENDED" }),
    approvedHcp({ emailVerified: false }),
    approvedHcp({ healthcareProfessional: { hcpID: 23, verificationStatus: "Pending" } }),
    approvedHcp({ healthcareProfessional: { hcpID: 23, verificationStatus: "Rejected" } }),
    approvedHcp({ healthcareProfessional: null }),
    approvedHcp({ healthcareProfessional: { hcpID: 0, verificationStatus: "Approved" } }),
  ];

  for (const principal of cases) {
    assert.equal(ownApprovedHcpProfileWhere(principal), null);
  }
});
