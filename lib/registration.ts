import "server-only";

import { APIError } from "better-auth/api";

import { auth } from "@/lib/auth";
import { parseDatabaseUserId } from "@/lib/authorization-policy";
import prisma from "@/lib/prisma";
import {
  createRegistrationUserIfUnique,
  findRegistrationConflict,
  getRegistrationUniqueConflictField,
  removeUnfinishedRegistrationUser as deleteUnfinishedRegistrationUser,
  registrationConflictMessage,
  validateMmcRegistrationNumber,
} from "@/lib/registration-uniqueness.mjs";

type Credentials = {
  email: string;
  fullName: string;
  phoneNo: string;
  password: string;
};

type PatientRegistration = Credentials & {
  kind: "PATIENT";
  icNumber: string;
  dateOfBirth: Date;
  gender: "Female" | "Male" | "Declined";
  address: string;
  bloodType: string | null;
  allergies: string | null;
  emergencyContact: string | null;
};

type HcpRegistration = Credentials & {
  kind: "HCP";
  licenseNo: string;
  specialization: string;
  workplace: string;
  yearsOfExperience: number;
};

type Registration = PatientRegistration | HcpRegistration;

export type RegistrationResult =
  | { kind: "submitted" }
  | { kind: "invalid"; message: string; field?: RegistrationField }
  | { kind: "failed" };

type RegistrationField = "email" | "licenseNo";

const CALLBACK_URL = "/account";
const PHONE_PATTERN = /^\+?[0-9][0-9\s().-]*$/;
const BLOOD_TYPES = new Set([
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
]);
const HCP_SPECIALIZATIONS = new Set([
  "General Practice / Family Medicine",
  "Internal Medicine",
  "Cardiology",
  "Paediatrics",
  "Endocrinology",
  "Obstetrics & Gynaecology",
  "Dermatology",
  "Other Specialisation",
]);

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string; field?: RegistrationField };

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function requiredText(
  formData: FormData,
  key: string,
  label: string,
  maxLength: number,
): ParseResult<string> {
  const value = formString(formData, key).trim();
  if (!value) return { ok: false, message: `Enter your ${label}.` };
  if (value.length > maxLength) {
    return { ok: false, message: `Your ${label} is too long.` };
  }
  return { ok: true, value };
}

function credentialsFrom(formData: FormData): ParseResult<Credentials> {
  const fullName = requiredText(formData, "fullName", "full name", 100);
  const email = formString(formData, "email").trim().toLowerCase();
  const phoneNo = formString(formData, "phoneNo").trim();
  const password = formString(formData, "password");
  const confirmation = formString(formData, "confirmPassword");

  if (!fullName.ok) return fullName;
  if (
    email.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { ok: false, message: "Enter a valid email address.", field: "email" };
  }
  if (
    phoneNo.length > 15 ||
    !PHONE_PATTERN.test(phoneNo) ||
    phoneNo.length < 7
  ) {
    return { ok: false, message: "Enter a valid phone number (up to 15 characters)." };
  }
  if (password.length < 8 || password.length > 128) {
    return { ok: false, message: "Use a password between 8 and 128 characters." };
  }
  if (password !== confirmation) {
    return { ok: false, message: "Your passwords do not match. Please check them." };
  }

  return {
    ok: true,
    value: { email, fullName: fullName.value, phoneNo, password },
  };
}

function dateOfBirthFrom(formData: FormData): Date | null {
  const value = formString(formData, "dateOfBirth");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    value > new Date().toISOString().slice(0, 10)
  ) {
    return null;
  }
  return date;
}

function parsePatient(formData: FormData): ParseResult<PatientRegistration> {
  const credentials = credentialsFrom(formData);
  if (!credentials.ok) return credentials;

  const icInput = formString(formData, "icNumber").trim();
  if (!/^\d{6}-?\d{2}-?\d{4}$/.test(icInput)) {
    return { ok: false, message: "Enter a valid 12-digit Malaysian IC number." };
  }
  const icNumber = icInput.replaceAll("-", "");

  const dateOfBirth = dateOfBirthFrom(formData);
  if (!dateOfBirth) {
    return { ok: false, message: "Enter a valid date of birth." };
  }

  const gender = formString(formData, "gender");
  if (gender !== "Female" && gender !== "Male" && gender !== "Declined") {
    return { ok: false, message: "Select a valid gender option." };
  }

  const address = formString(formData, "address").trim();
  if (!address) return { ok: false, message: "Enter your home address." };
  if (address.length > 500) {
    return { ok: false, message: "Your home address is too long (maximum 500 characters)." };
  }

  const bloodType = formString(formData, "bloodType").trim();
  if (bloodType && !BLOOD_TYPES.has(bloodType)) {
    return { ok: false, message: "Select a valid blood type or leave it unselected." };
  }

  const noKnownAllergies = formString(formData, "noKnownAllergies");
  if (noKnownAllergies !== "true" && noKnownAllergies !== "false") {
    return { ok: false, message: "Review the allergy information and try again." };
  }
  const allergyText = formString(formData, "allergies").trim();
  const allergies = noKnownAllergies === "true"
    ? "No known allergies (declared)"
    : allergyText || null;

  const emergencyContact = formString(formData, "emergencyContact").trim();
  if (emergencyContact.length > 100) {
    return { ok: false, message: "Your emergency contact is too long." };
  }

  return {
    ok: true,
    value: {
      ...credentials.value,
      kind: "PATIENT",
      icNumber,
      dateOfBirth,
      gender,
      address,
      bloodType: bloodType || null,
      allergies,
      emergencyContact: emergencyContact || null,
    },
  };
}

function parseHcp(formData: FormData): ParseResult<HcpRegistration> {
  const credentials = credentialsFrom(formData);
  if (!credentials.ok) return credentials;

  const licenseNo = validateMmcRegistrationNumber(formString(formData, "licenseNo"));
  if (!licenseNo.ok) return { ...licenseNo, field: "licenseNo" };

  const selectedSpecialization = formString(formData, "specialization");
  if (!HCP_SPECIALIZATIONS.has(selectedSpecialization)) {
    return { ok: false, message: "Select a valid specialisation." };
  }
  const otherSpecialization = formString(formData, "otherSpecialization").trim();
  if (selectedSpecialization === "Other Specialisation" && !otherSpecialization) {
    return { ok: false, message: "Specify your specialisation." };
  }
  if (selectedSpecialization !== "Other Specialisation" && otherSpecialization) {
    return { ok: false, message: "Review your specialisation and try again." };
  }
  const specialization = selectedSpecialization === "Other Specialisation"
    ? otherSpecialization
    : selectedSpecialization;
  if (specialization.length > 60) {
    return { ok: false, message: "Your specialisation is too long." };
  }

  const yearsText = formString(formData, "yearsOfExperience");
  if (!/^(0|[1-9]\d*)$/.test(yearsText)) {
    return { ok: false, message: "Enter a valid, non-negative whole number of experience years." };
  }
  const yearsOfExperience = Number(yearsText);
  if (!Number.isSafeInteger(yearsOfExperience) || yearsOfExperience > 2_147_483_647) {
    return { ok: false, message: "Enter a valid, non-negative whole number of experience years." };
  }

  const workplace = requiredText(formData, "workplace", "workplace", 120);
  if (!workplace.ok) return workplace;

  return {
    ok: true,
    value: {
      ...credentials.value,
      kind: "HCP",
      licenseNo: licenseNo.value,
      specialization,
      workplace: workplace.value,
      yearsOfExperience,
    },
  };
}

export async function registerPatient(formData: FormData): Promise<RegistrationResult> {
  const parsed = parsePatient(formData);
  return parsed.ok ? startRegistration(parsed.value) : { kind: "invalid", message: parsed.message };
}

export async function registerHealthcareProfessional(
  formData: FormData,
): Promise<RegistrationResult> {
  const parsed = parseHcp(formData);
  return parsed.ok ? startRegistration(parsed.value) : { kind: "invalid", message: parsed.message };
}

async function startRegistration(input: Registration): Promise<RegistrationResult> {
  let existing;
  try {
    existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        role: true,
        accountStatus: true,
        emailVerified: true,
        patient: { select: { patientID: true } },
        healthcareProfessional: { select: { hcpID: true } },
        admin: { select: { adminID: true } },
        accounts: {
          where: { providerId: "credential" },
          select: { id: true },
        },
      },
    });
  } catch {
    console.error("OPORA registration lookup failed");
    return { kind: "failed" };
  }

  if (existing) {
    const canResume =
      existing.role === "UNASSIGNED" &&
      existing.accountStatus === "PROVISIONING" &&
      existing.patient === null &&
      existing.healthcareProfessional === null &&
      existing.admin === null &&
      existing.accounts.length > 0;

    if (canResume) {
      let conflict;
      try {
        conflict = await findRegistrationConflict(prisma, input, {
          skipEmailLookup: true,
        });
      } catch {
        console.error("OPORA registration uniqueness lookup failed");
        return { kind: "failed" };
      }
      if (conflict) return duplicateRegistration(conflict);

      const credentialResult = await verifyPendingCredentials(input);
      if (credentialResult === "delivery-failed") return { kind: "failed" };
      if (credentialResult === "valid") {
        const completed = await completeRegistration(existing.id, input);
        if (completed.kind === "duplicate") {
          return duplicateRegistration(completed.field);
        }
        return completed.kind === "completed"
          ? { kind: "submitted" }
          : { kind: "failed" };
      }
    }

    return duplicateRegistration("email");
  }

  let createdUser;
  try {
    createdUser = await createRegistrationUserIfUnique(prisma, input, () =>
      signUpWithBetterAuth(input),
    );
  } catch {
    console.error("OPORA registration request failed");
    return { kind: "failed" };
  }

  if (createdUser.kind === "duplicate") {
    return duplicateRegistration(createdUser.field);
  }

  const authUserId = parseDatabaseUserId(createdUser.value.user.id);

  if (authUserId === null) return duplicateRegistration("email");

  let persistedUser;
  try {
    persistedUser = await prisma.user.findUnique({
      where: { id: authUserId },
      select: { email: true, role: true, accountStatus: true },
    });
  } catch {
    console.error("OPORA registration verification failed");
    return { kind: "failed" };
  }

  if (!persistedUser) return duplicateRegistration("email");
  if (persistedUser.email !== input.email) return { kind: "failed" };
  if (
    persistedUser.role !== "UNASSIGNED" ||
    persistedUser.accountStatus !== "PROVISIONING"
  ) {
    return duplicateRegistration("email");
  }

  const completed = await completeRegistration(authUserId, input);
  if (completed.kind === "duplicate") {
    if (completed.field === "licenseNo") {
      await removeUnfinishedRegistrationUser(authUserId);
    }
    return duplicateRegistration(completed.field);
  }
  return completed.kind === "completed"
    ? { kind: "submitted" }
    : { kind: "failed" };
}

function duplicateRegistration(field: RegistrationField): RegistrationResult {
  return {
    kind: "invalid",
    field,
    message: registrationConflictMessage(field) ?? "Registration information conflicts with an existing account.",
  };
}

async function removeUnfinishedRegistrationUser(userId: number): Promise<void> {
  try {
    await deleteUnfinishedRegistrationUser(prisma, userId);
  } catch {
    console.error("OPORA duplicate registration cleanup failed");
  }
}

function signUpWithBetterAuth(input: Registration) {
  return auth.api.signUpEmail({
    body: {
      name: input.fullName,
      email: input.email,
      password: input.password,
      phoneNo: input.phoneNo,
      callbackURL: CALLBACK_URL,
    },
  });
}

async function verifyPendingCredentials(
  input: Registration,
): Promise<"valid" | "invalid" | "delivery-failed"> {
  try {
    const result = await auth.api.signInEmail({
      body: {
        email: input.email,
        password: input.password,
        rememberMe: false,
      },
    });

    // This is only expected if a concurrent retry activated the account after
    // the provisioning-state check. The internal API does not return cookies.
    if (result.token) {
      await prisma.session.deleteMany({ where: { token: result.token } });
    }
    return "valid";
  } catch (error) {
    const code = error instanceof APIError ? error.body?.code : undefined;
    if (code === "EMAIL_NOT_VERIFIED" || code === "FAILED_TO_CREATE_SESSION") {
      return "valid";
    }
    if (code === "INVALID_EMAIL_OR_PASSWORD") return "invalid";
    console.error("OPORA registration recovery check failed");
    return "delivery-failed";
  }
}

type RegistrationCompletionResult =
  | { kind: "completed" }
  | { kind: "duplicate"; field: RegistrationField }
  | { kind: "failed" };

async function completeRegistration(
  userId: number,
  input: Registration,
): Promise<RegistrationCompletionResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          accountStatus: true,
          patient: {
            select: {
              userID: true,
              icNumber: true,
              dateOfBirth: true,
              gender: true,
              address: true,
              bloodType: true,
              allergies: true,
              emergencyContact: true,
            },
          },
          healthcareProfessional: {
            select: {
              userID: true,
              licenseNo: true,
              specialization: true,
              workplace: true,
              yearsOfExperience: true,
              verificationStatus: true,
            },
          },
          admin: { select: { adminID: true } },
        },
      });

      if (!user) throw new Error("Registration user is missing.");
      if (profileMatches(user, input)) return;

      if (
        user.role !== "UNASSIGNED" ||
        user.accountStatus !== "PROVISIONING" ||
        user.patient !== null ||
        user.healthcareProfessional !== null ||
        user.admin !== null
      ) {
        throw new Error("Registration state is not recoverable.");
      }

      if (input.kind === "PATIENT") {
        await tx.patient.create({
          data: {
            userID: userId,
            icNumber: input.icNumber,
            dateOfBirth: input.dateOfBirth,
            gender: input.gender,
            address: input.address,
            bloodType: input.bloodType,
            allergies: input.allergies,
            emergencyContact: input.emergencyContact,
          },
        });
        await tx.user.update({
          where: { id: userId },
          data: { role: "PATIENT", accountStatus: "ACTIVE" },
        });
        return;
      }

      await tx.healthcareProfessional.create({
        data: {
          userID: userId,
          licenseNo: input.licenseNo,
          specialization: input.specialization,
          workplace: input.workplace,
          yearsOfExperience: input.yearsOfExperience,
          verificationStatus: "Pending",
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { role: "HCP", accountStatus: "ACTIVE" },
      });
    });
    return { kind: "completed" };
  } catch (error) {
    // A failed profile transaction leaves User in UNASSIGNED/PROVISIONING.
    // A verified credential can safely retry the same atomic completion.
    console.error("OPORA registration profile transaction failed");
    const conflictField = getRegistrationUniqueConflictField(error);
    try {
      const current = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          accountStatus: true,
          patient: {
            select: {
              userID: true,
              icNumber: true,
              dateOfBirth: true,
              gender: true,
              address: true,
              bloodType: true,
              allergies: true,
              emergencyContact: true,
            },
          },
          healthcareProfessional: {
            select: {
              userID: true,
              licenseNo: true,
              specialization: true,
              workplace: true,
              yearsOfExperience: true,
              verificationStatus: true,
            },
          },
          admin: { select: { adminID: true } },
        },
      });
      if (current !== null && profileMatches(current, input)) {
        return { kind: "completed" };
      }
      if (conflictField) return { kind: "duplicate", field: conflictField };
      return { kind: "failed" };
    } catch {
      return conflictField
        ? { kind: "duplicate", field: conflictField }
        : { kind: "failed" };
    }
  }
}

function profileMatches(
  user: {
    role: string;
    accountStatus: string;
    patient: {
      userID: number;
      icNumber: string;
      dateOfBirth: Date;
      gender: string;
      address: string;
      bloodType: string | null;
      allergies: string | null;
      emergencyContact: string | null;
    } | null;
    healthcareProfessional: {
      userID: number;
      licenseNo: string;
      specialization: string;
      workplace: string;
      yearsOfExperience: number;
      verificationStatus: string;
    } | null;
    admin: { adminID: number } | null;
  },
  input: Registration,
): boolean {
  if (input.kind === "PATIENT") {
    const profile = user.patient;
    return (
      user.role === "PATIENT" &&
      user.accountStatus === "ACTIVE" &&
      user.healthcareProfessional === null &&
      user.admin === null &&
      profile !== null &&
      profile.userID > 0 &&
      profile.icNumber === input.icNumber &&
      profile.dateOfBirth.toISOString().slice(0, 10) === input.dateOfBirth.toISOString().slice(0, 10) &&
      profile.gender === input.gender &&
      profile.address === input.address &&
      profile.bloodType === input.bloodType &&
      profile.allergies === input.allergies &&
      profile.emergencyContact === input.emergencyContact
    );
  }

  const profile = user.healthcareProfessional;
  return (
    user.role === "HCP" &&
    user.accountStatus === "ACTIVE" &&
    user.patient === null &&
    user.admin === null &&
    profile !== null &&
    profile.userID > 0 &&
    profile.licenseNo === input.licenseNo &&
    profile.specialization === input.specialization &&
    profile.workplace === input.workplace &&
    profile.yearsOfExperience === input.yearsOfExperience &&
    profile.verificationStatus === "Pending"
  );
}

