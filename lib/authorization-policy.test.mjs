import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAuthorization, evaluateRoleAuthorization } from "./authorization-policy.ts";

const hcp = (overrides = {}) => ({
  role: "HCP",
  accountStatus: "ACTIVE",
  emailVerified: true,
  hasPatientProfile: false,
  hasHcpProfile: true,
  hcpVerificationStatus: "Pending",
  hasAdminProfile: false,
  ...overrides,
});

test("verified Pending and Rejected HCPs may pass account authorization for status access", () => {
  assert.equal(evaluateAuthorization(hcp({ hcpVerificationStatus: "Pending" })), null);
  assert.equal(evaluateAuthorization(hcp({ hcpVerificationStatus: "Rejected" })), null);
});

test("Pending and Rejected HCPs fail the approved clinical-operation policy", () => {
  for (const hcpVerificationStatus of ["Pending", "Rejected"]) {
    assert.equal(
      evaluateRoleAuthorization(hcp({ hcpVerificationStatus }), "HCP", true),
      "hcp_approval_required",
    );
  }
  assert.equal(
    evaluateRoleAuthorization(hcp({ hcpVerificationStatus: "Approved" }), "HCP", true),
    null,
  );
});

test("unverified, inactive, or unknown-state HCP accounts remain blocked", () => {
  assert.equal(evaluateAuthorization(hcp({ emailVerified: false })), "email_not_verified");
  assert.equal(evaluateAuthorization(hcp({ accountStatus: "DISABLED" })), "account_not_active");
  assert.equal(evaluateAuthorization(hcp({ hcpVerificationStatus: "Unexpected" })), "unknown_hcp_verification_status");
});
