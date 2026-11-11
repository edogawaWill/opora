/** @param {unknown} value */
function positiveInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 2_147_483_647;
}

const unavailable = Object.freeze({
  ok: false,
  message: "This symptom entry is unavailable.",
});

/** @param {unknown} recordId @param {unknown} patientId */
export function patientOwnedSymptomRecordWhere(recordId, patientId) {
  if (!positiveInteger(recordId) || !positiveInteger(patientId)) return null;
  return { recordID: recordId, patientID: patientId };
}

/** @param {{ symptomRecord: { updateMany: Function } }} prisma @param {unknown} recordId @param {unknown} patientId @param {object} data @returns {Promise<{ ok: true } | { ok: false, message: string }>} */
export async function updatePatientOwnedSymptomRecord(prisma, recordId, patientId, data) {
  const where = patientOwnedSymptomRecordWhere(recordId, patientId);
  if (!where) return unavailable;
  const result = await prisma.symptomRecord.updateMany({ where, data });
  return result.count === 1 ? { ok: true } : unavailable;
}

/** @param {{ symptomRecord: { deleteMany: Function } }} prisma @param {unknown} recordId @param {unknown} patientId @returns {Promise<{ ok: true } | { ok: false, message: string }>} */
export async function deletePatientOwnedSymptomRecord(prisma, recordId, patientId) {
  const where = patientOwnedSymptomRecordWhere(recordId, patientId);
  if (!where) return unavailable;
  const result = await prisma.symptomRecord.deleteMany({ where });
  return result.count === 1 ? { ok: true } : unavailable;
}
