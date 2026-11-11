import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNotAssessmentTestDatabaseTarget,
  assertSafeApplicationDatabaseTarget,
  parsePostgresConnectionTarget,
  validateDevelopmentDatabaseTarget,
} from "./database-target.mjs";

const validTarget = (host) =>
  `postgresql://synthetic-user:synthetic-password@${host}:5432/opora_db?schema=public`;

test("accepts the configured local PostgreSQL targets", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    assert.equal(
      validateDevelopmentDatabaseTarget({
        nodeEnv: "development",
        databaseUrl: validTarget(host),
      }),
      null,
    );
  }
});

test("rejects non-development mode and missing or malformed URLs", () => {
  assert.match(
    validateDevelopmentDatabaseTarget({ nodeEnv: "production", databaseUrl: validTarget("localhost") }),
    /NODE_ENV=development/,
  );
  assert.match(
    validateDevelopmentDatabaseTarget({ nodeEnv: "development", databaseUrl: undefined }),
    /DATABASE_URL is not configured/,
  );
  assert.match(
    validateDevelopmentDatabaseTarget({ nodeEnv: "development", databaseUrl: "not a URL" }),
    /DATABASE_URL is malformed/,
  );
  assert.match(
    validateDevelopmentDatabaseTarget({ nodeEnv: undefined, databaseUrl: validTarget("localhost") }),
    /NODE_ENV=development/,
  );
});

test("rejects non-PostgreSQL, non-loopback, wrong-port, and wrong-database targets", () => {
  const rejectedTargets = [
    ["mysql://user:secret@localhost:5432/opora_db", /must use PostgreSQL/],
    ["postgresql://user:secret@example.com:5432/opora_db?sslpassword=private-query-marker", /Database host/],
    ["postgresql://user:secret@localhost:5433/opora_db", /Database port/],
    ["postgresql://user:secret@localhost:5432/other_db", /Database name/],
  ];

  for (const [databaseUrl, expectedMessage] of rejectedTargets) {
    const error = validateDevelopmentDatabaseTarget({
      nodeEnv: "development",
      databaseUrl,
    });
    assert.match(error, expectedMessage);
    assert.equal(error.includes("secret"), false);
    assert.equal(error.includes("synthetic-password"), false);
    assert.equal(error.includes("user"), false);
    assert.equal(error.includes("sslpassword"), false);
    assert.equal(error.includes("private-query-marker"), false);
  }
});

test("parses the effective PostgreSQL destination when valid URL parameters override the authority", () => {
  for (const value of [
    "postgresql://user:secret@localhost:5432/opora_db?schema=public",
    "postgresql://user:secret@ignored.example:5432/opora_db?port=5432&schema=public&host=127.0.0.1",
    "postgresql://user:secret@ignored.example:5432/opora_db?%68ost=localhost&port=5432",
  ]) {
    const parsed = parsePostgresConnectionTarget(value);
    assert.equal(parsed.port, 5432);
    assert.equal(parsed.databaseName, "opora_db");
    assert.ok(["localhost", "127.0.0.1"].includes(parsed.host));
  }
});

test("rejects malformed or ambiguous PostgreSQL destinations without echoing credentials", () => {
  for (const value of [
    "postgresql://user:secret@localhost:5432/opora_db?host=localhost&host=127.0.0.1",
    "postgresql://user:secret@localhost:5432/opora_db?port=5432&port=55433",
    "postgresql://user:secret@localhost:5432/opora_db?host=localhost&%68ost=127.0.0.1",
    "postgresql://user:secret@localhost:5432/opora_db?sslmode=require&sslmode=disable",
    "postgresql://user:secret@localhost:5432/opora_db?",
    "postgresql://user:bad%ZZ@localhost:5432/opora_db",
    "postgresql://user:secret@localhost/opora_db",
    "postgresql://user:secret@localhost:5432/opora_db#",
    "postgresql://user:secret@/opora_db",
  ]) {
    assert.throws(() => parsePostgresConnectionTarget(value), (error) => {
      assert.doesNotMatch(error.message, /secret|bad%ZZ|postgresql:/);
      return true;
    });
  }
});

test("ordinary Prisma configuration blocks reserved assessment database targets", () => {
  for (const env of [
    { OPORA_ASSESSMENT_TEST_DATABASE_URL: "postgresql://user:secret@127.0.0.1:55433/opora_assessment_test" },
    { DATABASE_URL: "postgresql://user:secret@localhost:5432/opora_assessment_test" },
    { DATABASE_URL: "postgresql://user:secret@localhost:5432/%6Fpora_assessment_test" },
    { DATABASE_URL: "postgresql://user:secret@127.0.0.1:55433/opora_db" },
    { DATABASE_URL: "postgresql://user:secret@other.example:5432/opora_db?host=127.0.0.1&port=55433" },
  ]) {
    assert.throws(() => assertNotAssessmentTestDatabaseTarget(env), (error) => {
      assert.doesNotMatch(error.message, /secret|postgresql:/);
      return true;
    });
  }
  assert.doesNotThrow(() => assertNotAssessmentTestDatabaseTarget({
    DATABASE_URL: "postgresql://user:secret@localhost:5432/opora_db",
  }));
  assert.doesNotThrow(() => assertNotAssessmentTestDatabaseTarget({}));
});

test("application runtime requires a valid URL and rejects reserved or ambiguous targets", () => {
  for (const databaseUrl of [
    "postgresql://user:secret@localhost:5432/opora_assessment_test",
    "postgresql://user:secret@127.0.0.1:55433/opora_db",
    "postgresql://user:secret@127.0.0.2:55433/opora_db",
    "postgresql://user:secret@other.example:5432/opora_db?host=127.0.0.1&port=55433",
    "postgresql://user:secret@localhost:5432/opora_db?port=5432&port=55433",
    "not a url",
    "postgresql://user:secret@localhost/opora_db",
  ]) {
    assert.throws(() => assertSafeApplicationDatabaseTarget({ DATABASE_URL: databaseUrl }), (error) => {
      assert.doesNotMatch(error.message, /secret|postgresql:/);
      return true;
    });
  }
  assert.throws(() => assertSafeApplicationDatabaseTarget({
    DATABASE_URL: "postgresql://user:secret@localhost:5432/opora_db",
    OPORA_ASSESSMENT_TEST_DATABASE_URL: "",
  }));
  assert.throws(() => assertSafeApplicationDatabaseTarget({}));
  assert.deepEqual(assertSafeApplicationDatabaseTarget({
    DATABASE_URL: "postgresql://user:secret@localhost:5432/opora_db?schema=public",
    PGHOST: "remote-host",
    PGPORT: "55433",
    PGDATABASE: "opora_assessment_test",
  }).target, {
    protocol: "postgresql:",
    host: "localhost",
    port: 5432,
    databaseName: "opora_db",
  });
});
