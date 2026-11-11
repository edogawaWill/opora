import assert from "node:assert/strict";
import test from "node:test";

import { manageDisease } from "./disease-management.mjs";

const validInput = (overrides = {}) => ({
  diseaseName: "Example condition",
  description: "A reviewed description.",
  causes: "Reviewed causes.",
  treatment: "Reviewed treatment information.",
  prevention: "Reviewed prevention information.",
  whenToSeekCare: "Reviewed care guidance.",
  symptomIDs: [3, 4],
  ...overrides,
});

function makeHarness({ disease = true, auditFailure = false } = {}) {
  const initial = disease ? {
    diseaseID: 12,
    diseaseName: "Existing condition",
    description: "Old description",
    causes: "Old causes",
    treatment: "Old treatment",
    prevention: "Old prevention",
    whenToSeekCare: "Old care information",
    updatedBy: 6,
    lastUpdated: new Date("2026-01-01T00:00:00Z"),
  } : null;
  const state = {
    diseases: new Map(initial ? [[initial.diseaseID, initial]] : []),
    relations: initial ? [{ diseaseID: 12, symptomID: 1 }] : [],
    symptoms: new Set([1, 3, 4]),
    audits: [],
    transactions: 0,
  };
  let nextID = 13;
  const prisma = {
    $transaction: async (callback) => {
      state.transactions += 1;
      const draft = {
        diseases: new Map([...state.diseases.entries()].map(([id, item]) => [id, { ...item }])),
        relations: state.relations.map((item) => ({ ...item })),
        audits: [...state.audits],
      };
      const tx = {
        symptom: { count: async ({ where }) => where.symptomID.in.filter((id) => state.symptoms.has(id)).length },
        disease: {
          create: async ({ data }) => {
            const diseaseID = nextID++;
            draft.diseases.set(diseaseID, { ...data, diseaseID, lastUpdated: new Date() });
            return { diseaseID };
          },
          updateMany: async ({ where, data }) => {
            const item = draft.diseases.get(where.diseaseID);
            if (!item) return { count: 0 };
            Object.assign(item, data, { lastUpdated: new Date() });
            return { count: 1 };
          },
          findUnique: async ({ where }) => draft.diseases.has(where.diseaseID) ? { diseaseID: where.diseaseID } : null,
          deleteMany: async ({ where }) => ({ count: draft.diseases.delete(where.diseaseID) ? 1 : 0 }),
        },
        diseaseSymptom: {
          createMany: async ({ data, skipDuplicates }) => {
            let count = 0;
            for (const relation of data) {
              const exists = draft.relations.some((item) => item.diseaseID === relation.diseaseID && item.symptomID === relation.symptomID);
              if (exists && skipDuplicates) continue;
              draft.relations.push({ ...relation });
              count += 1;
            }
            return { count };
          },
          deleteMany: async ({ where }) => {
            const before = draft.relations.length;
            draft.relations = draft.relations.filter((relation) => relation.diseaseID !== where.diseaseID);
            return { count: before - draft.relations.length };
          },
        },
        auditLog: {
          create: async ({ data }) => {
            if (auditFailure) throw new Error("simulated audit failure");
            draft.audits.push(data);
          },
        },
      };
      const result = await callback(tx);
      state.diseases = draft.diseases;
      state.relations = draft.relations;
      state.audits = draft.audits;
      return result;
    },
  };
  return { state, prisma };
}

const admin = async () => ({ admin: { adminID: 7 } });

test("non-Admin users are denied before opening a transaction", async () => {
  const { state, prisma } = makeHarness();
  const result = await manageDisease({ requireAdmin: async () => { throw new Error("forbidden"); }, prisma, operation: "delete", diseaseID: 12 });
  assert.equal(result.status, "error");
  assert.equal(state.transactions, 0);
  assert.equal(state.audits.length, 0);
});

test("create validates symptoms, assigns the authenticated Admin, and audits in one transaction", async () => {
  const { state, prisma } = makeHarness({ disease: false });
  const result = await manageDisease({ requireAdmin: admin, prisma, operation: "create", input: validInput() });
  assert.equal(result.status, "success");
  assert.equal(state.transactions, 1);
  assert.equal(state.diseases.size, 1);
  const created = [...state.diseases.values()][0];
  assert.equal(created.updatedBy, 7);
  assert.deepEqual(state.relations, [{ diseaseID: created.diseaseID, symptomID: 3 }, { diseaseID: created.diseaseID, symptomID: 4 }]);
  assert.deepEqual(state.audits[0], {
    adminID: 7,
    action: "DISEASE_CREATED",
    entityType: "Disease",
    entityID: created.diseaseID,
    changeSummary: "Created disease information.",
    changedFields: {
      diseaseName: { changed: true },
      description: { changed: true },
      causes: { changed: true },
      treatment: { changed: true },
      prevention: { changed: true },
      whenToSeekCare: { changed: true },
      diseaseSymptoms: { changed: true },
    },
  });
});

test("missing required values, excessive lengths, duplicate IDs, and unknown symptoms are rejected", async () => {
  const invalidInputs = [validInput({ diseaseName: " " }), validInput({ diseaseName: "x".repeat(101) })];
  for (const field of ["description", "causes", "treatment", "prevention", "whenToSeekCare"]) {
    invalidInputs.push(validInput({ [field]: "x".repeat(10_001) }));
    invalidInputs.push(validInput({ [field]: " " }));
  }
  invalidInputs.push(validInput({ symptomIDs: [3, 3] }), validInput({ symptomIDs: [999] }));

  for (const input of invalidInputs) {
    const { state, prisma } = makeHarness({ disease: false });
    const result = await manageDisease({ requireAdmin: admin, prisma, operation: "create", input });
    assert.equal(result.status, "error");
    assert.equal(state.diseases.size, 0);
    assert.equal(state.audits.length, 0);
  }
});

test("update replaces associations, records the acting Admin, and updates lastUpdated", async () => {
  const { state, prisma } = makeHarness();
  const result = await manageDisease({ requireAdmin: admin, prisma, operation: "update", diseaseID: "12", input: validInput({ symptomIDs: [4, 3] }) });
  assert.equal(result.status, "success");
  assert.equal(state.diseases.get(12).updatedBy, 7);
  assert.ok(state.diseases.get(12).lastUpdated > new Date("2026-01-01T00:00:00Z"));
  assert.deepEqual(state.relations, [{ diseaseID: 12, symptomID: 4 }, { diseaseID: 12, symptomID: 3 }]);
  assert.equal(state.audits[0].action, "DISEASE_UPDATED");
  assert.equal(state.audits[0].adminID, 7);
});

test("missing records and invalid IDs fail safely without audit entries", async () => {
  const { state, prisma } = makeHarness();
  const result = await manageDisease({ requireAdmin: admin, prisma, operation: "update", diseaseID: "12;bad", input: validInput() });
  const missing = await manageDisease({ requireAdmin: admin, prisma, operation: "delete", diseaseID: 99 });
  assert.equal(result.status, "error");
  assert.equal(missing.status, "error");
  assert.equal(state.audits.length, 0);
  assert.equal(state.diseases.size, 1);
});

test("delete removes only the disease and its symptom links, with an audit event", async () => {
  const { state, prisma } = makeHarness();
  const result = await manageDisease({ requireAdmin: admin, prisma, operation: "delete", diseaseID: 12 });
  assert.equal(result.status, "success");
  assert.equal(state.diseases.has(12), false);
  assert.equal(state.relations.some((relation) => relation.diseaseID === 12), false);
  assert.equal(state.audits[0].action, "DISEASE_DELETED");
  assert.equal(state.audits[0].entityID, 12);
});

test("transaction failure rolls back disease, symptom links, and audit changes", async () => {
  const { state, prisma } = makeHarness({ auditFailure: true });
  const result = await manageDisease({ requireAdmin: admin, prisma, operation: "update", diseaseID: 12, input: validInput() });
  assert.equal(result.status, "error");
  assert.equal(state.diseases.get(12).diseaseName, "Existing condition");
  assert.deepEqual(state.relations, [{ diseaseID: 12, symptomID: 1 }]);
  assert.equal(state.audits.length, 0);
});
