import assert from "node:assert/strict";
import test from "node:test";

import {
  validateAppointmentBookingInput,
  validateStatusTransition,
} from "./appointment-validation.mjs";

const fixedNow = () => new Date("2026-10-28T08:00:00.000Z");

test("accepts valid appointment booking details", () => {
  const result = validateAppointmentBookingInput(
    {
      hcpID: "2",
      appointmentDate: "2026-10-29",
      appointmentTime: "10:00",
      reason: "Follow-up consultation for persistent headaches.",
    },
    fixedNow,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.data, {
      hcpID: 2,
      appointmentDate: "2026-10-29",
      appointmentTime: "10:00",
      reason: "Follow-up consultation for persistent headaches.",
    });
  }
});

test("accepts booking for the current day", () => {
  const result = validateAppointmentBookingInput(
    {
      hcpID: 5,
      appointmentDate: "2026-10-28",
      appointmentTime: "14:30",
      reason: "Acute migraine review",
    },
    fixedNow,
  );

  assert.equal(result.ok, true);
});

test("rejects appointment date in the past", () => {
  const result = validateAppointmentBookingInput(
    {
      hcpID: "2",
      appointmentDate: "2026-10-27",
      appointmentTime: "10:00",
      reason: "General checkup",
    },
    fixedNow,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.message, "Appointment date cannot be in the past.");
  }
});

test("rejects invalid date format and impossible calendar dates", () => {
  const badFormat = validateAppointmentBookingInput(
    {
      hcpID: 1,
      appointmentDate: "28/10/2026",
      appointmentTime: "10:00",
      reason: "General checkup",
    },
    fixedNow,
  );
  assert.equal(badFormat.ok, false);

  const impossibleDate = validateAppointmentBookingInput(
    {
      hcpID: 1,
      appointmentDate: "2026-02-31",
      appointmentTime: "10:00",
      reason: "General checkup",
    },
    fixedNow,
  );
  assert.equal(impossibleDate.ok, false);
});

test("rejects unsupported time slots", () => {
  const result = validateAppointmentBookingInput(
    {
      hcpID: 1,
      appointmentDate: "2026-10-29",
      appointmentTime: "08:15",
      reason: "Checkup",
    },
    fixedNow,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.message, "Select an available appointment time slot.");
  }
});

test("rejects missing or oversized reasons", () => {
  const emptyReason = validateAppointmentBookingInput(
    {
      hcpID: 1,
      appointmentDate: "2026-10-29",
      appointmentTime: "10:00",
      reason: "   ",
    },
    fixedNow,
  );
  assert.equal(emptyReason.ok, false);

  const oversizedReason = validateAppointmentBookingInput(
    {
      hcpID: 1,
      appointmentDate: "2026-10-29",
      appointmentTime: "10:00",
      reason: "a".repeat(1001),
    },
    fixedNow,
  );
  assert.equal(oversizedReason.ok, false);
});

test("validates valid status transitions for HCP", () => {
  assert.equal(validateStatusTransition("Pending", "Confirmed").ok, true);
  assert.equal(validateStatusTransition("Pending", "Cancelled").ok, true);
  assert.equal(validateStatusTransition("Confirmed", "Completed").ok, true);
  assert.equal(validateStatusTransition("Confirmed", "Cancelled").ok, true);
});

test("rejects invalid or terminal status transitions", () => {
  const sameStatus = validateStatusTransition("Pending", "Pending");
  assert.equal(sameStatus.ok, false);

  const fromCompleted = validateStatusTransition("Completed", "Pending");
  assert.equal(fromCompleted.ok, false);

  const fromCancelled = validateStatusTransition("Cancelled", "Confirmed");
  assert.equal(fromCancelled.ok, false);

  const unsupported = validateStatusTransition("Pending", "Archived");
  assert.equal(unsupported.ok, false);
});
