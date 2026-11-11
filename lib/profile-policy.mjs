const BLOOD_TYPES = new Set(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);
const PHONE_PATTERN = /^\+?[0-9][0-9\s().-]*$/;

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateNameAndPhone(input) {
  const fullName = text(input?.fullName);
  const phoneNo = text(input?.phoneNo);
  if (!fullName) return { ok: false, message: "Enter your full name." };
  if (fullName.length > 100) return { ok: false, message: "Your full name is too long (maximum 100 characters)." };
  if (phoneNo.length < 7 || phoneNo.length > 15 || !PHONE_PATTERN.test(phoneNo)) {
    return { ok: false, message: "Enter a valid phone number (7 to 15 characters)." };
  }
  return { ok: true, fullName, phoneNo };
}

/** @param {Record<string, unknown>} input */
export function validatePatientProfile(input) {
  const identity = validateNameAndPhone(input);
  if (!identity.ok) return identity;

  const address = text(input.address);
  if (!address) return { ok: false, message: "Enter your home address." };
  if (address.length > 500) return { ok: false, message: "Your home address is too long (maximum 500 characters)." };

  const rawBloodType = text(input.bloodType);
  if (rawBloodType && !BLOOD_TYPES.has(rawBloodType)) {
    return { ok: false, message: "Select a valid blood type or leave it unselected." };
  }

  const allergiesValue = text(input.allergies);
  if (allergiesValue.length > 2_000) {
    return { ok: false, message: "Allergy information is too long (maximum 2,000 characters)." };
  }

  const emergencyContact = text(input.emergencyContact);
  if (emergencyContact.length > 100) {
    return { ok: false, message: "Your emergency contact is too long (maximum 100 characters)." };
  }

  return {
    ok: true,
    value: {
      fullName: identity.fullName,
      phoneNo: identity.phoneNo,
      address,
      bloodType: rawBloodType || null,
      allergies: allergiesValue || null,
      emergencyContact: emergencyContact || null,
    },
  };
}

/** @param {Record<string, unknown>} input */
export function validateHcpProfile(input) {
  const identity = validateNameAndPhone(input);
  return identity.ok
    ? { ok: true, value: { fullName: identity.fullName, phoneNo: identity.phoneNo } }
    : identity;
}

/**
 * @param {{currentPassword?: unknown, newPassword?: unknown, confirmPassword?: unknown}} input
 */
export function validatePasswordChange(input) {
  const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";
  const newPassword = typeof input.newPassword === "string" ? input.newPassword : "";
  const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";
  if (!currentPassword || currentPassword.length > 128) {
    return { ok: false, message: "Enter your current password." };
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    return { ok: false, message: "Use a new password between 8 and 128 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, message: "The new passwords do not match." };
  }
  return { ok: true };
}

export function passwordChangeFeedback(error) {
  return error
    ? { status: "error", message: "We could not change your password. Check your current password and try again." }
    : { status: "success", message: "Your password was changed. Other active sessions were signed out." };
}
