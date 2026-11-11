"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { requirePatient } from "@/lib/authorization";
import { changeOwnPassword, updatePatientProfile } from "@/lib/profile-mutations.mjs";
import type { ProfileActionResult } from "@/lib/profile-state";
import prisma from "@/lib/prisma";

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function updatePatientProfileAction(
  _previousState: ProfileActionResult,
  formData: FormData,
): Promise<ProfileActionResult> {
  const result = await updatePatientProfile({
    requirePatient,
    prisma,
    input: {
      fullName: formText(formData, "fullName"),
      phoneNo: formText(formData, "phoneNo"),
      address: formText(formData, "address"),
      bloodType: formText(formData, "bloodType"),
      allergies: formText(formData, "allergies"),
      emergencyContact: formText(formData, "emergencyContact"),
    },
  });
  if (result.status === "success") {
    revalidatePath("/patient/profile");
    revalidatePath("/patient");
  }
  return result;
}

export async function changePatientPasswordAction(
  _previousState: ProfileActionResult,
  formData: FormData,
): Promise<ProfileActionResult> {
  const result = await changeOwnPassword({
    authorize: requirePatient,
    expectedRole: "PATIENT",
    changePassword: async (body) => auth.api.changePassword({ body, headers: await headers() }),
    input: {
      currentPassword: formText(formData, "currentPassword"),
      newPassword: formText(formData, "newPassword"),
      confirmPassword: formText(formData, "confirmPassword"),
    },
  });
  if (result.status === "success") revalidatePath("/patient/profile");
  return result;
}
