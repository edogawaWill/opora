import nextEnv from "@next/env";
import { createJiti } from "jiti";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateDevelopmentDatabaseTarget } from "./database-target.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const { loadEnvConfig } = nextEnv;
loadEnvConfig(projectRoot);

const jiti = createJiti(import.meta.url, {
  tsconfigPaths: resolve(projectRoot, "tsconfig.json"),
});

class ProvisioningError extends Error {}

function stop(message) {
  throw new ProvisioningError(message);
}

function promptLine(label, { masked = false } = {}) {
  const { stdin, stdout } = process;
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function") {
    stop("Run this command from an interactive terminal.");
  }

  return new Promise((resolvePrompt, rejectPrompt) => {
    const characters = [];
    let settled = false;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      stdin.off("data", onData);
      stdin.off("end", onEnd);
      stdin.setRawMode(false);
      stdout.write("\n");
      if (error) rejectPrompt(error);
      else resolvePrompt(characters.join(""));
    };

    const onEnd = () => finish(new ProvisioningError("Input was interrupted."));
    const onData = (chunk) => {
      for (const character of String(chunk)) {
        if (character === "\u0003" || character === "\u0004") {
          finish(new ProvisioningError("Provisioning was cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          if (characters.length > 0) {
            characters.pop();
            stdout.write("\b \b");
          }
          continue;
        }
        if (character >= " " && character !== "\u007f") {
          characters.push(character);
          stdout.write(masked ? "*" : character);
        }
      }
    };

    stdout.write(label);
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.on("data", onData);
    stdin.once("end", onEnd);
    stdin.resume();
  });
}

function validateInput({ fullName, email, phoneNo, position, password, confirmation }) {
  const name = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phoneNo.trim();
  const normalizedPosition = position.trim();

  if (!name || name.length > 100) {
    stop("Full name is required and must be at most 100 characters.");
  }
  if (
    normalizedEmail.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    stop("Enter a valid email address of at most 100 characters.");
  }
  if (
    normalizedPhone.length < 7 ||
    normalizedPhone.length > 15 ||
    !/^\+?[0-9][0-9\s().-]*$/.test(normalizedPhone)
  ) {
    stop("Enter a valid phone number of 7 to 15 characters.");
  }
  if (!normalizedPosition || normalizedPosition.length > 50) {
    stop("Position is required and must be at most 50 characters.");
  }
  if (password.length < 8 || password.length > 128) {
    stop("Password must be between 8 and 128 characters.");
  }
  if (password !== confirmation) {
    stop("The password entries did not match.");
  }

  return {
    fullName: name,
    email: normalizedEmail,
    phoneNo: normalizedPhone,
    position: normalizedPosition,
    password,
  };
}

async function verifyLocalMailpit() {
  try {
    const response = await fetch("http://127.0.0.1:8025/", {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    await response.body?.cancel();
    if (!response.ok) stop("Local Mailpit is not responding successfully.");
  } catch {
    stop("Local Mailpit is unavailable; no account was created.");
  }
}

function parseNumericUserId(value) {
  const id = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN;

  return Number.isSafeInteger(id) && id > 0 && id <= 2_147_483_647
    ? id
    : null;
}

async function main() {
  let prisma;
  let signUpAttempted = false;
  let profileCommitted = false;

  try {
    const databaseTargetError = validateDevelopmentDatabaseTarget({
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL,
    });
    if (databaseTargetError) {
      stop(databaseTargetError);
    }
    if (process.env.OPORA_EMAIL_TRANSPORT !== "mailpit") {
      stop("Set OPORA_EMAIL_TRANSPORT=mailpit before provisioning.");
    }
    if (!process.env.BETTER_AUTH_SECRET) {
      stop("Better Auth configuration is missing.");
    }
    if (!process.env.RESEND_FROM_EMAIL) {
      stop("The authentication email sender is not configured.");
    }

    await verifyLocalMailpit();

    const fullName = await promptLine("Admin full name: ");
    const email = await promptLine("Admin email: ");
    const phoneNo = await promptLine("Admin phone number: ");
    const position = await promptLine("Admin position: ");
    let password = await promptLine("Password (input masked): ", { masked: true });
    let confirmation = await promptLine("Confirm password (input masked): ", { masked: true });
    const input = validateInput({
      fullName,
      email,
      phoneNo,
      position,
      password,
      confirmation,
    });
    password = "";
    confirmation = "";

    const confirmationPhrase = await promptLine(
      'Type "CREATE INITIAL ADMIN" to continue: ',
    );
    if (confirmationPhrase !== "CREATE INITIAL ADMIN") {
      stop("Provisioning was not confirmed; no account was created.");
    }

    const authModule = await jiti.import(resolve(projectRoot, "lib/auth.ts"));
    const prismaModule = await jiti.import(resolve(projectRoot, "lib/prisma.ts"));
    const auth = authModule.auth;
    prisma = prismaModule.default;

    await prisma.$connect();
    const [adminProfiles, adminRoleUsers, existingUser] = await Promise.all([
      prisma.admin.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.findFirst({
        where: { email: { equals: input.email, mode: "insensitive" } },
        select: { id: true },
      }),
    ]);

    if (adminProfiles !== 0 || adminRoleUsers !== 0) {
      stop("Initial Admin setup is no longer available; an Admin account already exists.");
    }
    if (existingUser) {
      stop("That email is already registered; no existing account was modified.");
    }

    signUpAttempted = true;
    let signUpResult;
    try {
      signUpResult = await auth.api.signUpEmail({
        body: {
          name: input.fullName,
          email: input.email,
          password: input.password,
          phoneNo: input.phoneNo,
          callbackURL: "/account",
        },
      });
    } finally {
      input.password = "";
    }

    const userId = parseNumericUserId(signUpResult?.user?.id);
    if (userId === null) {
      stop("Better Auth did not return a valid account identifier.");
    }

    await prisma.$transaction(
      async (tx) => {
        const [currentAdminProfiles, currentAdminRoleUsers, user] = await Promise.all([
          tx.admin.count(),
          tx.user.count({ where: { role: "ADMIN" } }),
          tx.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              email: true,
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
          }),
        ]);

        if (currentAdminProfiles !== 0 || currentAdminRoleUsers !== 0) {
          stop("An Admin was provisioned concurrently; no privileges were assigned by this run.");
        }
        if (
          !user ||
          user.email.toLowerCase() !== input.email ||
          user.role !== "UNASSIGNED" ||
          user.accountStatus !== "PROVISIONING" ||
          user.emailVerified !== false ||
          user.patient !== null ||
          user.healthcareProfessional !== null ||
          user.admin !== null ||
          user.accounts.length !== 1
        ) {
          stop("The new account did not have the expected unassigned provisioning state.");
        }

        await tx.admin.create({
          data: { userID: user.id, position: input.position },
        });

        const updated = await tx.user.updateMany({
          where: {
            id: user.id,
            email: user.email,
            role: "UNASSIGNED",
            accountStatus: "PROVISIONING",
            emailVerified: false,
          },
          data: { role: "ADMIN", accountStatus: "ACTIVE" },
        });
        if (updated.count !== 1) {
          stop("The account state changed during provisioning; transaction was rolled back.");
        }
      },
      { isolationLevel: "Serializable" },
    );

    profileCommitted = true;
    console.log(
      "Initial Admin profile provisioned. Authenticated access still requires email verification. Check Mailpit for the verification message; delivery is not confirmed by this command.",
    );
  } catch (error) {
    if (signUpAttempted && !profileCommitted) {
      console.error(
        "Provisioning stopped after Better Auth signup began. The User/credential may exist, but this run did not complete the Admin profile transaction. Do not rerun blindly; use a separately reviewed recovery procedure.",
      );
    } else if (error instanceof ProvisioningError) {
      console.error(error.message);
    } else {
      console.error("Initial Admin provisioning failed safely.");
    }
    process.exitCode = 1;
  } finally {
    if (prisma) {
      try {
        await prisma.$disconnect();
      } catch {
        // Preserve the sanitized provisioning result.
      }
    }
  }
}

await main();
