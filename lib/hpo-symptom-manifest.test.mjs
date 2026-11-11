import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateHpoSymptomManifest } from "./hpo-symptom-manifest.mjs";

const manifest = JSON.parse(
  await readFile(new URL("../data/hpo-symptom-catalog-v2026-09-01.json", import.meta.url), "utf8"),
);

test("the reviewed manifest meets source, attribution, and schema constraints", () => {
  assert.deepEqual(validateHpoSymptomManifest(manifest), { valid: true, errors: [] });
  assert.equal(manifest.entries.length, 32);
  assert.ok(manifest.entries.every((entry) => entry.label.length <= 80));
  assert.ok(manifest.entries.every((entry) => entry.oporaBodyPart.length <= 50));
});

test("duplicate labels and identifiers are rejected", () => {
  const duplicateLabel = structuredClone(manifest);
  duplicateLabel.entries[1].label = duplicateLabel.entries[0].label;
  assert.ok(validateHpoSymptomManifest(duplicateLabel).errors.some((error) => error.includes("duplicates a source label")));

  const duplicateId = structuredClone(manifest);
  duplicateId.entries[1].hpoId = duplicateId.entries[0].hpoId;
  assert.ok(validateHpoSymptomManifest(duplicateId).errors.some((error) => error.includes("duplicates an HPO identifier")));
});

test("invalid HPO identifiers and missing definitions are rejected", () => {
  const invalid = structuredClone(manifest);
  invalid.entries[0].hpoId = "HPO:1945";
  invalid.entries[1].definition = "   ";
  const errors = validateHpoSymptomManifest(invalid).errors;
  assert.ok(errors.some((error) => error.includes("invalid HPO identifier")));
  assert.ok(errors.some((error) => error.includes("no verified source definition")));
});

test("field limits and required attribution are enforced", () => {
  const invalid = structuredClone(manifest);
  invalid.entries[0].label = "x".repeat(81);
  invalid.entries[1].oporaBodyPart = "x".repeat(51);
  invalid.metadata.citation = " ";
  const errors = validateHpoSymptomManifest(invalid).errors;
  assert.ok(errors.some((error) => error.includes("source label exceeds 80")));
  assert.ok(errors.some((error) => error.includes("body-area classification exceeds 50")));
  assert.ok(errors.some((error) => error.includes("citation")));
});
