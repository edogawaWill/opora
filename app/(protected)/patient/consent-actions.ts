"use server";

import { revalidatePath } from "next/cache";

import { requirePatient } from "@/lib/authorization";
import {
  grantPatientHcpAccess,
  revokePatientHcpAccess,
} from "@/lib/patient-hcp-consent.mjs";
import prisma from "@/lib/prisma";

export async function grantPatientHcpAccessAction(hcpID: unknown) {
  const result = await grantPatientHcpAccess({ requirePatient, prisma, hcpID });
  if (result.status === "success") revalidatePath("/patient");
  return result;
}

export async function revokePatientHcpAccessAction(consentID: unknown) {
  const result = await revokePatientHcpAccess({ requirePatient, prisma, consentID });
  if (result.status === "success") revalidatePath("/patient");
  return result;
}
