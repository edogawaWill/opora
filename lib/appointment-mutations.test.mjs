import assert from "node:assert/strict";
import test from "node:test";

import {
  bookPatientAppointment,
  cancelPatientAppointment,
  updateHcpAppointmentStatus,
} from "./appointment-mutations.mjs";

const fixedNow = () => new Date("2026-10-28T08:00:00.000Z");

function mutationHarness({
  hcp = { hcpID: 2 },
  existingAppointment = null,
  createdAppointmentID = 101,
  appointmentRecord = null,
} = {}) {
  const state = {
    queries: [],
    creates: [],
    updates: [],
  };

  const prisma = {
    healthcareProfessional: {
      findFirst: async (args) => {
        state.queries.push({ model: "healthcareProfessional", args });
        return hcp;
      },
    },
    appointment: {
      findFirst: async (args) => {
        state.queries.push({ model: "appointment", args });
        return existingAppointment ?? appointmentRecord;
      },
      create: async (args) => {
        state.creates.push(args);
        return { appointmentID: createdAppointmentID };
      },
      update: async (args) => {
        state.updates.push(args);
        return { ...appointmentRecord, ...args.data };
      },
    },
  };

  return { prisma, state };
}

test("bookPatientAppointment successfully creates appointment when slot is free", async () => {
  const { prisma, state } = mutationHarness();
  const requirePatient = async () => ({ patient: { patientID: 7 } });

  const result = await bookPatientAppointment({
    requirePatient,
    prisma,
    input: {
      hcpID: "2",
      appointmentDate: "2026-10-29",
      appointmentTime: "10:00",
      reason: "Persistent headaches and dizziness",
    },
    now: fixedNow,
  });

  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.appointmentID, 101);
  }
  assert.equal(state.creates.length, 1);
  assert.equal(state.creates[0].data.patientID, 7);
  assert.equal(state.creates[0].data.hcpID, 2);
  assert.equal(state.creates[0].data.status, "Pending");
});

test("bookPatientAppointment rejects booking when HCP is not approved or active", async () => {
  const { prisma } = mutationHarness({ hcp: null });
  const requirePatient = async () => ({ patient: { patientID: 7 } });

  const result = await bookPatientAppointment({
    requirePatient,
    prisma,
    input: {
      hcpID: "99",
      appointmentDate: "2026-10-29",
      appointmentTime: "10:00",
      reason: "Consultation",
    },
    now: fixedNow,
  });

  assert.equal(result.status, "error");
  if (result.status === "error") {
    assert.match(result.message, /unavailable or unverified/i);
  }
});

test("bookPatientAppointment detects and rejects scheduling conflicts", async () => {
  const { prisma, state } = mutationHarness({
    existingAppointment: { appointmentID: 45, status: "Confirmed" },
  });
  const requirePatient = async () => ({ patient: { patientID: 7 } });

  const result = await bookPatientAppointment({
    requirePatient,
    prisma,
    input: {
      hcpID: "2",
      appointmentDate: "2026-10-29",
      appointmentTime: "10:00",
      reason: "Consultation",
    },
    now: fixedNow,
  });

  assert.equal(result.status, "error");
  if (result.status === "error") {
    assert.match(result.message, /already booked/i);
  }
  assert.equal(state.creates.length, 0);
});

test("bookPatientAppointment rejects unauthenticated caller before query", async () => {
  const { prisma, state } = mutationHarness();
  const requirePatient = async () => {
    throw new Error("unauthenticated");
  };

  const result = await bookPatientAppointment({
    requirePatient,
    prisma,
    input: {
      hcpID: "2",
      appointmentDate: "2026-10-29",
      appointmentTime: "10:00",
      reason: "Consultation",
    },
    now: fixedNow,
  });

  assert.equal(result.status, "error");
  assert.equal(state.queries.length, 0);
});

test("updateHcpAppointmentStatus allows valid transitions for owning HCP", async () => {
  const { prisma, state } = mutationHarness({
    appointmentRecord: { appointmentID: 10, hcpID: 3, status: "Pending" },
  });
  const requireApprovedHcp = async () => ({
    healthcareProfessional: { hcpID: 3 },
  });

  const result = await updateHcpAppointmentStatus({
    requireApprovedHcp,
    prisma,
    appointmentID: 10,
    targetStatus: "Confirmed",
  });

  assert.equal(result.status, "success");
  assert.equal(state.updates.length, 1);
  assert.deepEqual(state.updates[0], {
    where: { appointmentID: 10 },
    data: { status: "Confirmed" },
  });
});

test("updateHcpAppointmentStatus denies unauthorized HCP from updating other HCP's appointment", async () => {
  const { prisma, state } = mutationHarness({
    appointmentRecord: null, // Scoped lookup where hcpID does not match
  });
  const requireApprovedHcp = async () => ({
    healthcareProfessional: { hcpID: 99 },
  });

  const result = await updateHcpAppointmentStatus({
    requireApprovedHcp,
    prisma,
    appointmentID: 10,
    targetStatus: "Confirmed",
  });

  assert.equal(result.status, "error");
  if (result.status === "error") {
    assert.match(result.message, /unavailable or unauthorized/i);
  }
  assert.equal(state.updates.length, 0);
});

test("updateHcpAppointmentStatus rejects invalid status transition", async () => {
  const { prisma, state } = mutationHarness({
    appointmentRecord: { appointmentID: 10, hcpID: 3, status: "Completed" },
  });
  const requireApprovedHcp = async () => ({
    healthcareProfessional: { hcpID: 3 },
  });

  const result = await updateHcpAppointmentStatus({
    requireApprovedHcp,
    prisma,
    appointmentID: 10,
    targetStatus: "Pending",
  });

  assert.equal(result.status, "error");
  assert.equal(state.updates.length, 0);
});

test("cancelPatientAppointment allows owning patient to cancel pending appointment", async () => {
  const { prisma, state } = mutationHarness({
    appointmentRecord: { appointmentID: 12, patientID: 8, status: "Pending" },
  });
  const requirePatient = async () => ({ patient: { patientID: 8 } });

  const result = await cancelPatientAppointment({
    requirePatient,
    prisma,
    appointmentID: 12,
  });

  assert.equal(result.status, "success");
  assert.equal(state.updates.length, 1);
  assert.deepEqual(state.updates[0], {
    where: { appointmentID: 12 },
    data: { status: "Cancelled" },
  });
});

test("cancelPatientAppointment rejects cancelling completed appointment", async () => {
  const { prisma, state } = mutationHarness({
    appointmentRecord: { appointmentID: 12, patientID: 8, status: "Completed" },
  });
  const requirePatient = async () => ({ patient: { patientID: 8 } });

  const result = await cancelPatientAppointment({
    requirePatient,
    prisma,
    appointmentID: 12,
  });

  assert.equal(result.status, "error");
  assert.equal(state.updates.length, 0);
});
