const MAX_ID = 2_147_483_647;
const MAX_FIELD_LENGTH = 10_000;
const MAX_SYMPTOM_LINKS = 500;

const UNAVAILABLE = Object.freeze({
  status: "error",
  message: "This disease record is unavailable or could not be changed.",
});
const INVALID = Object.freeze({
  status: "error",
  message: "Check the disease details and selected symptoms, then try again.",
});
const FAILED = Object.freeze({
  status: "error",
  message: "We could not save this disease information. Please refresh and try again.",
});

function positiveInteger(value) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= MAX_ID ? parsed : null;
}

function validateInput(input) {
  if (!input || typeof input !== "object") return null;
  const fields = ["diseaseName", "description", "causes", "treatment", "prevention", "whenToSeekCare"];
  const data = {};
  for (const field of fields) {
    const value = input[field];
    if (typeof value !== "string") return null;
    const cleaned = value.trim();
    const maxLength = field === "diseaseName" ? 100 : MAX_FIELD_LENGTH;
    if (!cleaned || cleaned.length > maxLength) return null;
    data[field] = cleaned;
  }

  if (!Array.isArray(input.symptomIDs) || input.symptomIDs.length > MAX_SYMPTOM_LINKS) return null;
  const symptomIDs = input.symptomIDs.map(positiveInteger);
  if (symptomIDs.some((id) => id === null) || new Set(symptomIDs).size !== symptomIDs.length) return null;
  return { ...data, symptomIDs };
}

/**
 * Validates and performs an Admin disease mutation. All writes, relationship
 * replacement, and audit entries are committed or rolled back together.
 * @param {{ requireAdmin: () => Promise<{ admin: { adminID: number } | null }>, prisma: { $transaction: Function }, operation: "create" | "update" | "delete", diseaseID?: unknown, input?: unknown }} options
 * @returns {Promise<{ status: "success" | "error", message: string }>}
 */
export async function manageDisease({ requireAdmin, prisma, operation, diseaseID, input }) {
  let principal;
  try {
    principal = await requireAdmin();
  } catch {
    return UNAVAILABLE;
  }

  const adminID = positiveInteger(principal?.admin?.adminID);
  const id = operation === "create" ? null : positiveInteger(diseaseID);
  if (!adminID || !["create", "update", "delete"].includes(operation) || (operation !== "create" && id === null)) {
    return UNAVAILABLE;
  }

  const data = operation === "delete" ? null : validateInput(input);
  if (operation !== "delete" && !data) return INVALID;

  try {
    await prisma.$transaction(async (tx) => {
      if (data?.symptomIDs.length) {
        const count = await tx.symptom.count({ where: { symptomID: { in: data.symptomIDs } } });
        if (count !== data.symptomIDs.length) throw new Error("INVALID_SYMPTOM_SELECTION");
      }

      let entityID = id;
      if (operation === "create") {
        const disease = await tx.disease.create({
          data: {
            diseaseName: data.diseaseName,
            description: data.description,
            causes: data.causes,
            treatment: data.treatment,
            prevention: data.prevention,
            whenToSeekCare: data.whenToSeekCare,
            updatedBy: adminID,
          },
          select: { diseaseID: true },
        });
        entityID = disease.diseaseID;
        if (data.symptomIDs.length) {
          await tx.diseaseSymptom.createMany({
            data: data.symptomIDs.map((symptomID) => ({ diseaseID: entityID, symptomID })),
            skipDuplicates: true,
          });
        }
      } else if (operation === "update") {
        const changed = await tx.disease.updateMany({
          where: { diseaseID: id },
          data: {
            diseaseName: data.diseaseName,
            description: data.description,
            causes: data.causes,
            treatment: data.treatment,
            prevention: data.prevention,
            whenToSeekCare: data.whenToSeekCare,
            updatedBy: adminID,
          },
        });
        if (changed.count !== 1) throw new Error("DISEASE_UNAVAILABLE");

        await tx.diseaseSymptom.deleteMany({ where: { diseaseID: id } });
        if (data.symptomIDs.length) {
          await tx.diseaseSymptom.createMany({
            data: data.symptomIDs.map((symptomID) => ({ diseaseID: id, symptomID })),
            skipDuplicates: true,
          });
        }
      } else {
        const existing = await tx.disease.findUnique({ where: { diseaseID: id }, select: { diseaseID: true } });
        if (!existing) throw new Error("DISEASE_UNAVAILABLE");
        // The schema uses RESTRICT on DiseaseSymptom foreign keys, so remove only
        // these association rows in the same transaction before deleting Disease.
        await tx.diseaseSymptom.deleteMany({ where: { diseaseID: id } });
        const deleted = await tx.disease.deleteMany({ where: { diseaseID: id } });
        if (deleted.count !== 1) throw new Error("DISEASE_UNAVAILABLE");
      }

      const action = operation === "create" ? "DISEASE_CREATED" : operation === "update" ? "DISEASE_UPDATED" : "DISEASE_DELETED";
      const changedFieldNames = operation === "delete"
        ? ["disease", "diseaseSymptoms"]
        : [...Object.keys(data).filter((key) => key !== "symptomIDs"), "diseaseSymptoms"];
      await tx.auditLog.create({
        data: {
          adminID,
          action,
          entityType: "Disease",
          entityID,
          changeSummary: operation === "create"
            ? "Created disease information."
            : operation === "update"
              ? "Updated disease information."
              : "Deleted disease information and its symptom associations.",
          changedFields: Object.fromEntries(changedFieldNames.map((field) => [field, { changed: true }])),
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DISEASE_UNAVAILABLE") return UNAVAILABLE;
    if (error instanceof Error && error.message === "INVALID_SYMPTOM_SELECTION") return INVALID;
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { status: "error", message: "A disease or condition with that name already exists." };
    }
    return FAILED;
  }

  return {
    status: "success",
    message: operation === "create"
      ? "Disease information was added."
      : operation === "update"
        ? "Disease information was updated."
        : "Disease information was deleted.",
  };
}
