import assert from "node:assert/strict";
import test from "node:test";

import {
  createRegistrationUserIfUnique,
  findRegistrationConflict,
  getRegistrationUniqueConflictField,
  removeUnfinishedRegistrationUser,
  registrationConflictMessage,
  validateMmcRegistrationNumber,
} from "./registration-uniqueness.mjs";

function createPrisma({ user = null, professional = null } = {}) {
  const calls = [];
  return {
    calls,
    user: {
      findUnique: async (args) => {
        calls.push({ model: "user", args });
        return user;
      },
    },
    healthcareProfessional: {
      findUnique: async (args) => {
        calls.push({ model: "hcp", args });
        return professional;
      },
    },
  };
}

const patientInput = { kind: "PATIENT", email: "new.patient@example.test" };
const hcpInput = {
  kind: "HCP",
  email: "new.hcp@example.test",
  licenseNo: "MMC-TEST-1001",
};

test("new Patient registration with an unused email passes the duplicate guard", async () => {
  const prisma = createPrisma();
  let createCount = 0;

  const result = await createRegistrationUserIfUnique(prisma, patientInput, async () => {
    createCount += 1;
    return { id: 1 };
  });

  assert.deepEqual(result, { kind: "created", value: { id: 1 } });
  assert.equal(createCount, 1);
  assert.equal(prisma.calls.some((call) => call.model === "hcp"), false);
});

test("new HCP registration with unused email and MMC number passes the duplicate guard", async () => {
  const prisma = createPrisma();
  let createCount = 0;

  const result = await createRegistrationUserIfUnique(prisma, hcpInput, async () => {
    createCount += 1;
    return { id: 2 };
  });

  assert.deepEqual(result, { kind: "created", value: { id: 2 } });
  assert.equal(createCount, 1);
  assert.deepEqual(prisma.calls.map((call) => call.model), ["user", "hcp"]);
});

test("Patient email already used by a Patient is rejected before creation", async () => {
  const prisma = createPrisma({ user: { id: 10, role: "PATIENT" } });
  let createCount = 0;

  const result = await createRegistrationUserIfUnique(prisma, patientInput, async () => {
    createCount += 1;
  });

  assert.deepEqual(result, { kind: "duplicate", field: "email" });
  assert.equal(createCount, 0);
  assert.match(registrationConflictMessage(result.field), /already registered/);
});

test("HCP email already used by a Patient is rejected before creation", async () => {
  const prisma = createPrisma({ user: { id: 10, role: "PATIENT" } });
  let createCount = 0;

  const result = await createRegistrationUserIfUnique(prisma, hcpInput, async () => {
    createCount += 1;
  });

  assert.deepEqual(result, { kind: "duplicate", field: "email" });
  assert.equal(createCount, 0);
  assert.deepEqual(prisma.calls.map((call) => call.model), ["user"]);
});

test("Patient email already used by an HCP is rejected before creation", async () => {
  const prisma = createPrisma({ user: { id: 11, role: "HCP" } });
  let createCount = 0;

  const result = await createRegistrationUserIfUnique(prisma, patientInput, async () => {
    createCount += 1;
  });

  assert.deepEqual(result, { kind: "duplicate", field: "email" });
  assert.equal(createCount, 0);
});

test("HCP registration with an existing MMC number is rejected before user creation", async () => {
  const prisma = createPrisma({ professional: { hcpID: 4 } });
  let createCount = 0;

  const result = await createRegistrationUserIfUnique(prisma, hcpInput, async () => {
    createCount += 1;
  });

  assert.deepEqual(result, { kind: "duplicate", field: "licenseNo" });
  assert.equal(createCount, 0);
  assert.match(registrationConflictMessage(result.field), /MMC registration number/);
});

test("email comparison uses the normalized address used by Better Auth", async () => {
  const prisma = createPrisma({ user: { id: 12, role: "ADMIN" } });
  const result = await findRegistrationConflict(prisma, {
    ...patientInput,
    email: "  NEW.PATIENT@EXAMPLE.TEST  ",
  });

  assert.equal(result, "email");
  assert.deepEqual(prisma.calls[0].args.where, { email: "new.patient@example.test" });
});

test("missing and invalid MMC values are rejected before a registration can proceed", () => {
  assert.deepEqual(validateMmcRegistrationNumber("  "), {
    ok: false,
    message: "Enter your MMC registration number.",
  });
  assert.deepEqual(validateMmcRegistrationNumber("x".repeat(21)), {
    ok: false,
    message: "Your MMC registration number is too long.",
  });
  assert.deepEqual(validateMmcRegistrationNumber(" MMC-TEST-1001 "), {
    ok: true,
    value: "MMC-TEST-1001",
  });
});

test("Prisma P2002 email and MMC conflicts are mapped to their fields", () => {
  assert.equal(
    getRegistrationUniqueConflictField({ code: "P2002", meta: { target: ["email"] } }),
    "email",
  );
  assert.equal(
    getRegistrationUniqueConflictField({
      code: "P2002",
      meta: { target: "HealthcareProfessional_licenseNo_key" },
    }),
    "licenseNo",
  );
  assert.equal(
    getRegistrationUniqueConflictField({ code: "P2002", meta: { target: ["other"] } }),
    null,
  );
});

test("a concurrent email unique-index conflict is returned as a field error", async () => {
  const prisma = createPrisma();
  let createCount = 0;

  const result = await createRegistrationUserIfUnique(prisma, patientInput, async () => {
    createCount += 1;
    throw { code: "P2002", meta: { target: ["email"] } };
  });

  assert.deepEqual(result, { kind: "duplicate", field: "email" });
  assert.equal(createCount, 1);
});

test("duplicate MMC race cleanup is limited to the new empty provisioning User", async () => {
  let deleteArgs;
  const prisma = {
    user: {
      deleteMany: async (args) => {
        deleteArgs = args;
        return { count: 1 };
      },
    },
  };

  const result = await removeUnfinishedRegistrationUser(prisma, 42);

  assert.deepEqual(result, { count: 1 });
  assert.deepEqual(deleteArgs.where, {
    id: 42,
    role: "UNASSIGNED",
    accountStatus: "PROVISIONING",
    patient: { is: null },
    healthcareProfessional: { is: null },
    admin: { is: null },
  });
});
