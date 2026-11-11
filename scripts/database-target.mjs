import { createRequire } from "node:module";
import { isIP } from "node:net";

const EXPECTED_ASSESSMENT_DATABASE = "opora_assessment_test";
const EXPECTED_ASSESSMENT_PORT = 55433;
const ASSESSMENT_DATABASE_ENV = "OPORA_ASSESSMENT_TEST_DATABASE_URL";
const require = createRequire(import.meta.url);
// Use the same parser used by pg, which is in turn used by PrismaPg.
let parsePgConnectionString;
try {
  const pgTarget = require.resolve("pg");
  if (typeof pgTarget === "string" && !pgTarget.startsWith("[")) {
    parsePgConnectionString = createRequire(pgTarget)("pg-connection-string").parse;
  }
} catch {
  // Bundler or virtual path resolution
}
if (!parsePgConnectionString) {
  parsePgConnectionString = require("pg-connection-string").parse;
}

function canonicalHost(host) {
  if (typeof host !== "string" || host.length === 0 || /[,/\\\s\u0000]/.test(host)) {
    throw new Error("Database host cannot be safely determined.");
  }
  const unwrapped = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  if (isIP(unwrapped) === 6) return unwrapped.toLowerCase();
  let parsed;
  try {
    parsed = new URL(`postgresql://${unwrapped}`);
  } catch {
    throw new Error("Database host cannot be safely determined.");
  }
  if (parsed.port || parsed.username || parsed.password || (parsed.pathname !== "" && parsed.pathname !== "/") || parsed.search || parsed.hash) {
    throw new Error("Database host cannot be safely determined.");
  }
  return parsed.hostname.toLowerCase();
}

/** Resolve the effective destination using pg-connection-string, the parser used by the pg driver. */
export function parsePostgresConnectionTarget(databaseUrl) {
  if (typeof databaseUrl !== "string" || databaseUrl.length === 0 || databaseUrl !== databaseUrl.trim() ||
      /[\u0000-\u001f\u007f]/.test(databaseUrl) || databaseUrl.includes("#") || /%(?![a-f\d]{2})/i.test(databaseUrl)) {
    throw new Error("DATABASE_URL is malformed or ambiguous.");
  }

  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is malformed or ambiguous.");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use PostgreSQL.");
  }

  const seen = new Set();
  for (const [key] of url.searchParams) {
    const normalizedKey = key.toLowerCase();
    if (seen.has(normalizedKey)) throw new Error("DATABASE_URL contains duplicate query parameters.");
    seen.add(normalizedKey);
  }
  if (databaseUrl.includes("?") && url.searchParams.size === 0) {
    throw new Error("DATABASE_URL contains an empty query.");
  }

  let driverTarget;
  try {
    driverTarget = parsePgConnectionString(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is malformed or ambiguous.");
  }
  const host = canonicalHost(driverTarget?.host);
  const portText = driverTarget?.port;
  if (typeof portText !== "string" || !/^\d+$/.test(portText)) {
    throw new Error("DATABASE_URL must specify an explicit PostgreSQL port.");
  }
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DATABASE_URL has an invalid PostgreSQL port.");
  }
  if (typeof driverTarget?.database !== "string" || driverTarget.database.length === 0) {
    throw new Error("DATABASE_URL must specify a database name.");
  }
  return Object.freeze({ protocol: url.protocol, host, port, databaseName: driverTarget.database });
}

function isAssessmentTarget(target) {
  const normalizedHost = target.host.toLowerCase();
  const ipv4 = normalizedHost.split(".").map(Number);
  const loopback = normalizedHost === "localhost" || normalizedHost === "localhost." || normalizedHost === "::1" ||
    (isIP(normalizedHost) === 4 && ipv4[0] === 127) ||
    /^::ffff:127(?:\.\d{1,3}){3}$/i.test(normalizedHost);
  return target.databaseName === EXPECTED_ASSESSMENT_DATABASE || (loopback && target.port === EXPECTED_ASSESSMENT_PORT);
}

/** Prevent ordinary Prisma CLI operations from accidentally targeting assessment data. */
export function assertNotAssessmentTestDatabaseTarget(env = process.env) {
  if (Object.hasOwn(env ?? {}, ASSESSMENT_DATABASE_ENV)) {
    throw new Error("Use the guarded assessment test launcher for the assessment test database.");
  }
  if (typeof env?.DATABASE_URL !== "string" || env.DATABASE_URL.length === 0) return;
  let target;
  try {
    target = parsePostgresConnectionTarget(env.DATABASE_URL);
  } catch {
    throw new Error("DATABASE_URL cannot be safely validated by the ordinary Prisma config.");
  }
  if (isAssessmentTarget(target)) {
    throw new Error("Use the guarded assessment test launcher for the assessment test database.");
  }
}

/** Validate application runtime routing before constructing the shared Prisma client. */
export function assertSafeApplicationDatabaseTarget(env = process.env) {
  if (Object.hasOwn(env ?? {}, ASSESSMENT_DATABASE_ENV)) {
    throw new Error("The application runtime cannot use the reserved assessment test database target.");
  }

  if (typeof env?.DATABASE_URL !== "string" || env.DATABASE_URL.length === 0) {
    throw new Error("DATABASE_URL is required before creating the application database client.");
  }
  let target;
  try {
    target = parsePostgresConnectionTarget(env.DATABASE_URL);
  } catch {
    throw new Error("DATABASE_URL cannot be safely validated before creating the application database client.");
  }
  if (isAssessmentTarget(target)) {
    throw new Error("The application runtime cannot connect to the reserved assessment test database.");
  }
  return Object.freeze({ mode: "application", target });
}

/** Return a safe diagnostic, or null when the configured target is allowed. */
export function validateDevelopmentDatabaseTarget({ nodeEnv, databaseUrl }) {
  if (nodeEnv !== "development") {
    return "Initial Admin provisioning requires NODE_ENV=development.";
  }
  if (typeof databaseUrl !== "string" || databaseUrl.length === 0) {
    return "DATABASE_URL is not configured.";
  }

  try {
    const parsed = new URL(databaseUrl);
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
      return "DATABASE_URL must use PostgreSQL.";
    }
  } catch {
    return "DATABASE_URL is malformed or its effective target is ambiguous.";
  }

  let target;
  try {
    target = parsePostgresConnectionTarget(databaseUrl);
  } catch {
    return "DATABASE_URL is malformed or its effective target is ambiguous.";
  }

  const hostname = target.host;
  const ALLOWED_HOSTS = new Set(["localhost", "localhost.", "127.0.0.1", "::1"]);
  if (!ALLOWED_HOSTS.has(hostname)) {
    return "Database host must be localhost, 127.0.0.1, or ::1.";
  }
  if (target.port !== 5432) {
    return "Database port must be 5432.";
  }
  if (target.databaseName !== "opora_db") {
    return "Database name must be opora_db.";
  }

  return null;
}
