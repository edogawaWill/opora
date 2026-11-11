import assert from "node:assert/strict";
import test from "node:test";

import {
  isBlockedPublicAuthPath,
  isRoleAllowedForLoginMode,
  LOGIN_MODES,
} from "./login-policy.mjs";

test("regular login accepts Patient and HCP roles only", () => {
  assert.equal(isRoleAllowedForLoginMode("PATIENT", LOGIN_MODES.REGULAR), true);
  assert.equal(isRoleAllowedForLoginMode("HCP", LOGIN_MODES.REGULAR), true);
  assert.equal(isRoleAllowedForLoginMode("ADMIN", LOGIN_MODES.REGULAR), false);
});

test("Admin login accepts Admin role only", () => {
  assert.equal(isRoleAllowedForLoginMode("ADMIN", LOGIN_MODES.ADMIN), true);
  assert.equal(isRoleAllowedForLoginMode("PATIENT", LOGIN_MODES.ADMIN), false);
  assert.equal(isRoleAllowedForLoginMode("HCP", LOGIN_MODES.ADMIN), false);
});

test("unknown and missing login modes fail closed", () => {
  assert.equal(isRoleAllowedForLoginMode("ADMIN", "unexpected"), false);
  assert.equal(isRoleAllowedForLoginMode("PATIENT", null), false);
});

test("public signup and email sign-in paths are blocked after normalization", () => {
  for (const path of [
    "/api/auth/sign-up/email",
    "/api/auth/sign-in/email/",
    "/api//auth/sign-in/email",
    "/api/auth/%73ign-in/email",
    "/api/auth/%252Fsign-in%252Femail",
  ]) {
    assert.equal(isBlockedPublicAuthPath(path), true);
  }
  assert.equal(isBlockedPublicAuthPath("/api/auth/get-session"), false);
});
