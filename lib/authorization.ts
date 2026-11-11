import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  evaluateAuthorization,
  evaluateRoleAuthorization,
  OPORA_ROLES,
  parseDatabaseUserId,
  type AuthorizationFailure,
  type AuthorizationSnapshot,
  type OporaRole,
} from "@/lib/authorization-policy";

export class AuthorizationError extends Error {
  constructor(
    readonly code: "UNAUTHENTICATED" | AuthorizationFailure,
    readonly statusCode: 401 | 403,
  ) {
    super(code);
    this.name = "AuthorizationError";
  }
}

export type AuthorizedPrincipal = {
  userId: number;
  fullName: string;
  email: string;
  role: OporaRole;
  accountStatus: string;
  emailVerified: boolean;
  patient: { patientID: number } | null;
  healthcareProfessional: {
    hcpID: number;
    verificationStatus: string;
  } | null;
  admin: { adminID: number } | null;
};

function isOporaRole(role: string): role is OporaRole {
  return (OPORA_ROLES as readonly string[]).includes(role);
}

function toAuthorizationSnapshot(user: {
  role: string;
  accountStatus: string;
  emailVerified: boolean;
  patient: { patientID: number } | null;
  healthcareProfessional: { verificationStatus: string } | null;
  admin: { adminID: number } | null;
}): AuthorizationSnapshot {
  return {
    role: user.role,
    accountStatus: user.accountStatus,
    emailVerified: user.emailVerified,
    hasPatientProfile: user.patient !== null,
    hasHcpProfile: user.healthcareProfessional !== null,
    hcpVerificationStatus:
      user.healthcareProfessional?.verificationStatus ?? null,
    hasAdminProfile: user.admin !== null,
  };
}

async function loadCurrentDatabaseUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      accountStatus: true,
      emailVerified: true,
      patient: { select: { patientID: true } },
      healthcareProfessional: {
        select: { hcpID: true, verificationStatus: true },
      },
      admin: { select: { adminID: true } },
    },
  });
}

export async function requireAuthenticatedUser(): Promise<AuthorizedPrincipal> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new AuthorizationError("UNAUTHENTICATED", 401);
  }

  const userId = parseDatabaseUserId(session.user.id);
  if (userId === null) {
    throw new AuthorizationError("UNAUTHENTICATED", 401);
  }

  const user = await loadCurrentDatabaseUser(userId);
  if (!user) {
    throw new AuthorizationError("UNAUTHENTICATED", 401);
  }

  const failure = evaluateAuthorization(toAuthorizationSnapshot(user));
  if (failure) {
    throw new AuthorizationError(failure, 403);
  }

  if (!isOporaRole(user.role)) {
    throw new AuthorizationError("unknown_role", 403);
  }

  return {
    userId: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus,
    emailVerified: user.emailVerified,
    patient: user.patient,
    healthcareProfessional: user.healthcareProfessional,
    admin: user.admin,
  };
}

async function requireRole(requiredRole: OporaRole): Promise<AuthorizedPrincipal> {
  const principal = await requireAuthenticatedUser();
  const failure = evaluateRoleAuthorization(
    {
      role: principal.role,
      accountStatus: principal.accountStatus,
      emailVerified: principal.emailVerified,
      hasPatientProfile: principal.patient !== null,
      hasHcpProfile: principal.healthcareProfessional !== null,
      hcpVerificationStatus:
        principal.healthcareProfessional?.verificationStatus ?? null,
      hasAdminProfile: principal.admin !== null,
    },
    requiredRole,
  );

  if (failure) {
    throw new AuthorizationError(failure, 403);
  }
  return principal;
}

export function requirePatient(): Promise<AuthorizedPrincipal> {
  return requireRole("PATIENT");
}

/** Allows an active HCP to access only their own limited account/profile/status operations. */
export function requireHcpAccount(): Promise<AuthorizedPrincipal> {
  return requireRole("HCP");
}

export function requireAdmin(): Promise<AuthorizedPrincipal> {
  return requireRole("ADMIN");
}

/** Use for every HCP clinical or patient-data operation; approval is read from the current DB row. */
export async function requireApprovedHcp(): Promise<AuthorizedPrincipal> {
  const principal = await requireRole("HCP");
  if (principal.healthcareProfessional?.verificationStatus !== "Approved") {
    throw new AuthorizationError("hcp_approval_required", 403);
  }
  return principal;
}
