"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/authorization";
import { reviewHcpApplication } from "@/lib/hcp-review.mjs";
import prisma from "@/lib/prisma";

async function reviewApplication(hcpID: unknown, decision: "Approved" | "Rejected") {
  const result = await reviewHcpApplication({
    requireAdmin,
    prisma,
    hcpID,
    decision,
  });

  if (result.status === "success") revalidatePath("/admin");
  return result;
}

export async function approveHcpApplicationAction(hcpID: unknown) {
  return reviewApplication(hcpID, "Approved");
}

export async function rejectHcpApplicationAction(hcpID: unknown) {
  return reviewApplication(hcpID, "Rejected");
}
