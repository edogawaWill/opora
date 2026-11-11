import assert from "node:assert/strict";
import test from "node:test";

import {
  findConditionsForSymptoms,
  symptomIDsFromAssessmentAnswers,
} from "./assessment-condition-matching.mjs";

function diseaseHarness(records) {
  const calls = [];
  return {
    calls,
    prisma: {
      disease: {
        findMany: async (args) => {
          calls.push(args);
          return records;
        },
      },
    },
  };
}

const disease = (diseaseID, diseaseName, relatedSymptoms, fields = {}) => ({
  diseaseID,
  diseaseName,
  description: Object.hasOwn(fields, "description") ? fields.description : "A stored description.",
  causes: Object.hasOwn(fields, "causes") ? fields.causes : "",
  treatment: Object.hasOwn(fields, "treatment") ? fields.treatment : null,
  prevention: Object.hasOwn(fields, "prevention") ? fields.prevention : "Stored prevention information.",
  whenToSeekCare: Object.hasOwn(fields, "whenToSeekCare") ? fields.whenToSeekCare : "Seek care if appropriate.",
  diseaseSymptoms: relatedSymptoms.map((symptomName) => ({ symptom: { symptomName, bodyPart: "Head" } })),
});

test("queries through DiseaseSymptom and returns one condition for a related symptom", async () => {
  const { prisma, calls } = diseaseHarness([disease(1, "Condition A", ["Headache"])]);
  const result = await findConditionsForSymptoms({ prisma, symptomIDs: [4] });
  assert.equal(result.status, "success");
  if (result.status === "success") assert.deepEqual(result.diseases.map(({ diseaseName }) => diseaseName), ["Condition A"]);
  assert.deepEqual(calls[0].where, { diseaseSymptoms: { some: { symptomID: { in: [4] } } } });
  assert.deepEqual(Object.keys(calls[0].select), [
    "diseaseID", "diseaseName", "description", "causes", "treatment", "prevention", "whenToSeekCare", "diseaseSymptoms",
  ]);
});

test("deduplicates IDs and each matching disease when multiple symptoms share it", async () => {
  const { prisma, calls } = diseaseHarness([disease(1, "Condition A", ["Headache", "Nausea"])]);
  const result = await findConditionsForSymptoms({ prisma, symptomIDs: [4, 9, 4] });
  assert.equal(result.status, "success");
  if (result.status === "success") assert.equal(result.diseases.length, 1);
  assert.deepEqual(calls[0].where.diseaseSymptoms.some.symptomID.in, [4, 9]);
  assert.deepEqual(calls[0].select.diseaseSymptoms.where.symptomID.in, [4, 9]);
});

test("returns multiple conditions associated with submitted symptoms", async () => {
  const { prisma } = diseaseHarness([
    disease(1, "Condition A", ["Headache"]),
    disease(2, "Condition B", ["Nausea"]),
  ]);
  const result = await findConditionsForSymptoms({ prisma, symptomIDs: [4, 9] });
  assert.equal(result.status, "success");
  if (result.status === "success") assert.deepEqual(result.diseases.map(({ diseaseName }) => diseaseName), ["Condition A", "Condition B"]);
});

test("handles no associations and cleans missing disease fields", async () => {
  const noMatches = diseaseHarness([]);
  const empty = await findConditionsForSymptoms({ prisma: noMatches.prisma, symptomIDs: [4] });
  assert.deepEqual(empty, { status: "success", diseases: [] });

  const withMissing = diseaseHarness([disease(1, "Condition A", ["Headache"], { description: "  ", prevention: null })]);
  const result = await findConditionsForSymptoms({ prisma: withMissing.prisma, symptomIDs: [4] });
  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.diseases[0].description, null);
    assert.equal(result.diseases[0].causes, null);
    assert.equal(result.diseases[0].prevention, null);
  }
});

test("rejects invalid symptom IDs before querying and extracts saved catalog IDs", async () => {
  const { prisma, calls } = diseaseHarness([]);
  assert.deepEqual(await findConditionsForSymptoms({ prisma, symptomIDs: ["4"] }), { status: "invalid" });
  assert.equal(calls.length, 0);
  assert.deepEqual(symptomIDsFromAssessmentAnswers([
    { symptomID: 4 },
    { symptomID: 9 },
    { symptomID: 4 },
  ]), { status: "success", symptomIDs: [4, 9] });
  assert.deepEqual(symptomIDsFromAssessmentAnswers([{ symptomID: "4" }]), { status: "invalid" });
});

test("returns a safe error when the disease relationship query fails", async () => {
  const result = await findConditionsForSymptoms({ prisma: { disease: { findMany: async () => { throw new Error("private database detail"); } } }, symptomIDs: [4] });
  assert.deepEqual(result, { status: "error" });
});
