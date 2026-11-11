import assert from "node:assert/strict";
import test from "node:test";

import {
  deletePatientOwnedSymptomRecord,
  patientOwnedSymptomRecordWhere,
  updatePatientOwnedSymptomRecord,
} from "./symptom-record-mutations.mjs";

function makeFakePrisma(record) {
  const matches = (where) => record.recordID === where.recordID && record.patientID === where.patientID;
  return {
    symptomRecord: {
      updateMany: async ({ where, data }) => {
        if (!matches(where)) return { count: 0 };
        Object.assign(record, data);
        return { count: 1 };
      },
      deleteMany: async ({ where }) => {
        if (!matches(where)) return { count: 0 };
        record.deleted = true;
        return { count: 1 };
      },
    },
  };
}

test("record mutation scope contains both the record ID and authenticated Patient ID", () => {
  assert.deepEqual(patientOwnedSymptomRecordWhere(14, 8), { recordID: 14, patientID: 8 });
  assert.equal(patientOwnedSymptomRecordWhere(0, 8), null);
  assert.equal(patientOwnedSymptomRecordWhere(14, Number.NaN), null);
});

test("a Patient cannot update another Patient's symptom record", async () => {
  const record = { recordID: 14, patientID: 9, severity: 3 };
  const result = await updatePatientOwnedSymptomRecord(makeFakePrisma(record), 14, 8, { severity: 9 });
  assert.deepEqual(result, { ok: false, message: "This symptom entry is unavailable." });
  assert.equal(record.severity, 3);
});

test("a Patient cannot delete another Patient's symptom record", async () => {
  const record = { recordID: 14, patientID: 9, deleted: false };
  const result = await deletePatientOwnedSymptomRecord(makeFakePrisma(record), 14, 8);
  assert.deepEqual(result, { ok: false, message: "This symptom entry is unavailable." });
  assert.equal(record.deleted, false);
});

test("missing records return the same safe response as cross-Patient attempts", async () => {
  const record = { recordID: 14, patientID: 9, severity: 3, deleted: false };
  const prisma = makeFakePrisma(record);

  const missingUpdate = await updatePatientOwnedSymptomRecord(prisma, 99, 8, { severity: 9 });
  const otherPatientUpdate = await updatePatientOwnedSymptomRecord(prisma, 14, 8, { severity: 9 });
  const missingDelete = await deletePatientOwnedSymptomRecord(prisma, 99, 8);
  const otherPatientDelete = await deletePatientOwnedSymptomRecord(prisma, 14, 8);

  assert.deepEqual(missingUpdate, otherPatientUpdate);
  assert.deepEqual(missingDelete, otherPatientDelete);
  assert.equal(record.severity, 3);
  assert.equal(record.deleted, false);
});

test("the owning Patient can update or delete the scoped record", async () => {
  const updateRecord = { recordID: 14, patientID: 8, severity: 3 };
  assert.deepEqual(await updatePatientOwnedSymptomRecord(makeFakePrisma(updateRecord), 14, 8, { severity: 9 }), { ok: true });
  assert.equal(updateRecord.severity, 9);

  const deleteRecord = { recordID: 15, patientID: 8, deleted: false };
  assert.deepEqual(await deletePatientOwnedSymptomRecord(makeFakePrisma(deleteRecord), 15, 8), { ok: true });
  assert.equal(deleteRecord.deleted, true);
});
