/**
 * Supported appointment time slots.
 */
export const SUPPORTED_TIME_SLOTS = Object.freeze([
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
]);

/**
 * Supported appointment statuses.
 */
export const APPOINTMENT_STATUSES = Object.freeze([
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
]);

/**
 * Valid status transitions for HCP management.
 */
export const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  Pending: Object.freeze(["Confirmed", "Cancelled"]),
  Confirmed: Object.freeze(["Completed", "Cancelled"]),
  Completed: Object.freeze([]),
  Cancelled: Object.freeze([]),
});

function formString(value) {
  return typeof value === "string" ? value : null;
}

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
 * Validates patient appointment booking input.
 * @param {unknown} input
 * @param {() => Date} [now]
 * @returns {{ ok: true, data: { hcpID: number, appointmentDate: string, appointmentTime: string, reason: string } } | { ok: false, message: string }}
 */
export function validateAppointmentBookingInput(input, now = () => new Date()) {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "Invalid appointment request." };
  }

  const candidate = /** @type {Record<string, unknown>} */ (input);

  const hcpID = positiveInteger(candidate.hcpID);
  if (hcpID === null) {
    return { ok: false, message: "Select a valid healthcare professional." };
  }

  const dateValue = formString(candidate.appointmentDate);
  if (!dateValue || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return { ok: false, message: "Enter a valid appointment date (YYYY-MM-DD)." };
  }

  const parsedDate = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dateValue) {
    return { ok: false, message: "Enter a valid calendar date." };
  }

  // Ensure appointment is not in the past (comparing against UTC midnight of today)
  const currentDate = now();
  const todayUtcString = currentDate.toISOString().slice(0, 10);
  if (dateValue < todayUtcString) {
    return { ok: false, message: "Appointment date cannot be in the past." };
  }

  const timeValue = formString(candidate.appointmentTime);
  if (!timeValue || !SUPPORTED_TIME_SLOTS.includes(timeValue)) {
    return {
      ok: false,
      message: "Select an available appointment time slot.",
    };
  }

  const reasonValue = formString(candidate.reason);
  const trimmedReason = reasonValue?.trim() ?? "";
  if (!trimmedReason) {
    return { ok: false, message: "Please provide a reason for the appointment." };
  }
  if (trimmedReason.length < 3) {
    return { ok: false, message: "Reason must be at least 3 characters." };
  }
  if (trimmedReason.length > 1000) {
    return { ok: false, message: "Reason must be 1,000 characters or fewer." };
  }

  return {
    ok: true,
    data: {
      hcpID,
      appointmentDate: dateValue,
      appointmentTime: timeValue,
      reason: trimmedReason,
    },
  };
}

/**
 * Validates appointment status transition.
 * @param {string} currentStatus
 * @param {string} targetStatus
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateStatusTransition(currentStatus, targetStatus) {
  if (!APPOINTMENT_STATUSES.includes(targetStatus)) {
    return { ok: false, message: `Unsupported appointment status: ${targetStatus}.` };
  }

  if (currentStatus === targetStatus) {
    return { ok: false, message: `Appointment is already ${currentStatus}.` };
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    return {
      ok: false,
      message: `Cannot change appointment status from ${currentStatus} to ${targetStatus}.`,
    };
  }

  return { ok: true };
}
