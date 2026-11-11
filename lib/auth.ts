import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "@better-auth/prisma-adapter";

import prisma from "@/lib/prisma";
import { sendAuthEmail } from "@/lib/auth-email";
import { writeBetterAuthLog } from "@/lib/auth-logger";
import {
  evaluateAuthorization,
  parseDatabaseUserId,
} from "@/lib/authorization-policy";
import {
  isRoleAllowedForLoginMode,
  LOGIN_MODE_HEADER,
} from "@/lib/login-policy.mjs";

export const AUTH_BASE_PATH = "/api/auth";

export const auth = betterAuth({
  appName: "OPORA",
  logger: {
    level: "info",
    log: writeBetterAuthLog,
  },
  basePath: AUTH_BASE_PATH,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  advanced: {
    database: {
      generateId: "serial",
    },
  },
  user: {
    modelName: "User",
    fields: {
      name: "fullName",
      createdAt: "dateRegistered",
    },
    additionalFields: {
      phoneNo: {
        type: "string",
        required: true,
        input: true,
      },
      role: {
        type: "string",
        required: true,
        defaultValue: "UNASSIGNED",
        input: false,
      },
      accountStatus: {
        type: "string",
        required: true,
        defaultValue: "PROVISIONING",
        input: false,
      },
    },
  },
  session: {
    modelName: "Session",
  },
  account: {
    modelName: "Account",
  },
  verification: {
    modelName: "Verification",
  },
  emailAndPassword: {
    enabled: true,
    // Server-side registration uses auth.api.signUpEmail. The App Router
    // handler blocks this endpoint for every public HTTP method.
    disableSignUp: false,
    requireEmailVerification: true,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Reset your OPORA password",
        url,
        action: "reset your password",
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Verify your OPORA email address",
        url,
        action: "verify your email address",
      });
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session, endpointContext) => {
          const userId = parseDatabaseUserId(session.userId);
          if (userId === null) return false;

          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
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

          if (!user) return false;

          const authorizationFailure = evaluateAuthorization({
            role: user.role,
            accountStatus: user.accountStatus,
            emailVerified: user.emailVerified,
            hasPatientProfile: user.patient !== null,
            hasHcpProfile: user.healthcareProfessional !== null,
            hcpVerificationStatus:
              user.healthcareProfessional?.verificationStatus ?? null,
            hasAdminProfile: user.admin !== null,
          });
          if (authorizationFailure !== null) return false;

          if (endpointContext?.path === "/sign-in/email") {
            return isRoleAllowedForLoginMode(
              user.role,
              endpointContext.headers?.get(LOGIN_MODE_HEADER),
            );
          }

          return true;
        },
      },
    },
  },
  plugins: [nextCookies()],
});
