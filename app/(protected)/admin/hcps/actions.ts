"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/authorization";
import {
  deleteHcpRecord,
  setHcpAccountStatus,
  setHcpVerificationStatus,
  updateHcpRecord,
} from "@/lib/admin-hcp-management.mjs";
import type { AdminActionState } from "@/lib/admin-action-state";
import prisma from "@/lib/prisma";

export async function updateHcpAction(
  hcpID: unknown,
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const input = {
    fullName: formData.get("fullName"),
    phoneNo: formData.get("phoneNo"),
    specialization: formData.get("specialization"),
    workplace: formData.get("workplace"),
    yearsOfExperience: formData.get("yearsOfExperience"),
  };

  const result = await updateHcpRecord({
    requireAdmin,
    prisma,
    hcpID,
    input,
  });

  if (result.status === "success") {
    revalidatePath("/admin/hcps");
    revalidatePath(`/admin/hcps/${hcpID}`);
    revalidatePath("/admin");
    return { status: "success", message: result.message };
  }

  return { status: "error", message: result.message };
}

export async function setHcpStatusAction(
  hcpID: unknown,
  targetStatus: unknown,
): Promise<AdminActionState> {
  const result = await setHcpAccountStatus({
    requireAdmin,
    prisma,
    hcpID,
    targetStatus,
  });

  if (result.status === "success") {
    revalidatePath("/admin/hcps");
    revalidatePath(`/admin/hcps/${hcpID}`);
    revalidatePath("/admin");
    return { status: "success", message: result.message };
  }

  return { status: "error", message: result.message };
}

export async function setHcpVerificationAction(
  hcpID: unknown,
  targetStatus: unknown,
): Promise<AdminActionState> {
  const result = await setHcpVerificationStatus({
    requireAdmin,
    prisma,
    hcpID,
    targetStatus,
  });

  if (result.status === "success") {
    revalidatePath("/admin/hcps");
    revalidatePath(`/admin/hcps/${hcpID}`);
    revalidatePath("/admin");
    return { status: "success", message: result.message };
  }

  return { status: "error", message: result.message };
}

export async function deleteHcpAction(
  hcpID: unknown,
): Promise<AdminActionState> {
  const result = await deleteHcpRecord({
    requireAdmin,
    prisma,
    hcpID,
  });

  if (result.status === "success") {
    revalidatePath("/admin/hcps");
    revalidatePath("/admin");
    return { status: "success", message: result.message };
  }

  return { status: "error", message: result.message };
}
