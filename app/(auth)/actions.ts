"use server";

import { redirect } from "next/navigation";

import {
  registerHealthcareProfessional,
  registerPatient,
} from "@/lib/registration";
import { auth } from "@/lib/auth";
import {
  LOGIN_MODE_HEADER,
  LOGIN_MODES,
} from "@/lib/login-policy.mjs";
import type { LoginActionState } from "@/lib/login-state";
import type { RegistrationActionState } from "@/lib/registration-state";
import type { RegistrationResult } from "@/lib/registration";

const GENERIC_FAILURE =
  "We could not complete registration. Your account remains unavailable; please try again or contact OPORA support.";
const GENERIC_LOGIN_FAILURE =
  "We could not sign you in. Check your email and password and try again.";

export async function signInRegularAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  return signInWithMode(formData, LOGIN_MODES.REGULAR);
}

export async function signInAdminAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  return signInWithMode(formData, LOGIN_MODES.ADMIN);
}

async function signInWithMode(
  formData: FormData,
  mode: string,
): Promise<LoginActionState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  if (typeof emailValue !== "string" || typeof passwordValue !== "string") {
    return { message: GENERIC_LOGIN_FAILURE };
  }

  const email = emailValue.trim().toLowerCase();
  const password = passwordValue;
  if (
    email.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length === 0 ||
    password.length > 128
  ) {
    return { message: GENERIC_LOGIN_FAILURE };
  }

  try {
    const result = await auth.api.signInEmail({
      body: { email, password, callbackURL: "/account" },
      headers: new Headers({ [LOGIN_MODE_HEADER]: mode }),
    });
    if (!result.token) return { message: GENERIC_LOGIN_FAILURE };
  } catch {
    return { message: GENERIC_LOGIN_FAILURE };
  }

  redirect("/account");
}

export async function registerPatientAction(
  _previousState: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  const result = await registerPatient(formData);
  if (result.kind === "submitted") redirect("/verify-email?sent=1");
  return registrationFailureState(result);
}

export async function registerHealthcareProfessionalAction(
  _previousState: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  try {
    const result = await registerHealthcareProfessional(formData);
    if (result.kind === "submitted") {
      return { message: "", redirectTo: "/verify-email?sent=1" };
    }
    return registrationFailureState(result);
  } catch {
    console.error("OPORA healthcare professional registration action failed");
    return { message: GENERIC_FAILURE };
  }
}

function registrationFailureState(
  result: Exclude<RegistrationResult, { kind: "submitted" }>,
): RegistrationActionState {
  if (result.kind === "invalid" && result.field) {
    return {
      message: "",
      fieldErrors: { [result.field]: result.message },
    };
  }
  return {
    message: result.kind === "invalid" ? result.message : GENERIC_FAILURE,
  };
}
