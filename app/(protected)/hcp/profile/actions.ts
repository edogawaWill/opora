"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { requireHcpAccount } from "@/lib/authorization";
import { changeOwnPassword, updateHcpPersonalProfile } from "@/lib/profile-mutations.mjs";
import type { ProfileActionResult } from "@/lib/profile-state";
import prisma from "@/lib/prisma";

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function updateHcpProfileAction(
  _previousState: ProfileActionResult,
  formData: FormData,
): Promise<ProfileActionResult> {
  const result = await updateHcpPersonalProfile({
    requireHcpAccount,
    prisma,
    input: {
      fullName: formText(formData, "fullName"),
      phoneNo: formText(formData, "phoneNo"),
    },
  });
  if (result.status === "success") {
    revalidatePath("/hcp/profile");
    revalidatePath("/hcp");
  }
  return result;
}

export async function changeHcpPasswordAction(
  _previousState: ProfileActionResult,
  formData: FormData,
): Promise<ProfileActionResult> {
  const result = await changeOwnPassword({
    authorize: requireHcpAccount,
    expectedRole: "HCP",
    changePassword: async (body) => auth.api.changePassword({ body, headers: await headers() }),
    input: {
      currentPassword: formText(formData, "currentPassword"),
      newPassword: formText(formData, "newPassword"),
      confirmPassword: formText(formData, "confirmPassword"),
    },
  });
  if (result.status === "success") revalidatePath("/hcp/profile");
  return result;
}
