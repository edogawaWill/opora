const PAGE_SIZE = 12;
const MAX_PAGE = 2_147_483_647;
const MAX_SEARCH_LENGTH = 100;

function parsePage(value) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= MAX_PAGE
    ? parsed
    : 1;
}

function parseId(value) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= MAX_PAGE
    ? parsed
    : null;
}

function sanitizeSearchQuery(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_SEARCH_LENGTH);
}

/**
 * Loads a paginated list of diseases for patient directory browsing (FR08).
 * Supports search filtering by disease name without requiring prior assessment.
 *
 * @param {{
 *   requirePatient: () => Promise<unknown>,
 *   prisma: any,
 *   page?: unknown,
 *   query?: unknown,
 * }} options
 */
export async function loadPatientDiseases({
  requirePatient,
  prisma,
  page = 1,
  query = "",
}) {
  try {
    await requirePatient();
  } catch {
    return { status: "denied", diseases: [], page: 1, pageCount: 1, total: 0 };
  }

  const currentPage = parsePage(page);
  const searchTerm = sanitizeSearchQuery(query);

  const where = searchTerm
    ? { diseaseName: { contains: searchTerm, mode: "insensitive" } }
    : undefined;

  try {
    const total = await prisma.disease.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(currentPage, pageCount);

    const rawDiseases = await prisma.disease.findMany({
      where,
      orderBy: { diseaseName: "asc" },
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        diseaseID: true,
        diseaseName: true,
        description: true,
        lastUpdated: true,
        diseaseSymptoms: {
          orderBy: { symptom: { symptomName: "asc" } },
          select: {
            symptom: {
              select: {
                symptomID: true,
                symptomName: true,
                bodyPart: true,
              },
            },
          },
        },
      },
    });

    const diseases = rawDiseases.map((d) => ({
      diseaseID: d.diseaseID,
      diseaseName: d.diseaseName,
      description: d.description,
      lastUpdated: d.lastUpdated instanceof Date ? d.lastUpdated.toISOString() : String(d.lastUpdated),
      symptoms: d.diseaseSymptoms.map(({ symptom }) => symptom),
    }));

    return {
      status: "success",
      diseases,
      page: safePage,
      pageCount,
      total,
      query: searchTerm,
    };
  } catch {
    return { status: "error", diseases: [], page: 1, pageCount: 1, total: 0 };
  }
}

/**
 * Loads a single detailed disease record for patient viewing (FR08).
 *
 * @param {{
 *   requirePatient: () => Promise<unknown>,
 *   prisma: any,
 *   diseaseId: unknown,
 * }} options
 */
export async function loadPatientDiseaseDetail({
  requirePatient,
  prisma,
  diseaseId,
}) {
  try {
    await requirePatient();
  } catch {
    return { status: "denied", disease: null };
  }

  const id = parseId(diseaseId);
  if (id === null) {
    return { status: "unavailable", disease: null };
  }

  try {
    const rawDisease = await prisma.disease.findUnique({
      where: { diseaseID: id },
      select: {
        diseaseID: true,
        diseaseName: true,
        description: true,
        causes: true,
        treatment: true,
        prevention: true,
        whenToSeekCare: true,
        lastUpdated: true,
        diseaseSymptoms: {
          orderBy: { symptom: { symptomName: "asc" } },
          select: {
            symptom: {
              select: {
                symptomID: true,
                symptomName: true,
                bodyPart: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!rawDisease) {
      return { status: "unavailable", disease: null };
    }

    const disease = {
      diseaseID: rawDisease.diseaseID,
      diseaseName: rawDisease.diseaseName,
      description: rawDisease.description,
      causes: rawDisease.causes,
      treatment: rawDisease.treatment,
      prevention: rawDisease.prevention,
      whenToSeekCare: rawDisease.whenToSeekCare,
      lastUpdated: rawDisease.lastUpdated instanceof Date ? rawDisease.lastUpdated.toISOString() : String(rawDisease.lastUpdated),
      symptoms: rawDisease.diseaseSymptoms.map(({ symptom }) => symptom),
    };

    return {
      status: "success",
      disease,
    };
  } catch {
    return { status: "error", disease: null };
  }
}

export const PATIENT_DISEASE_PAGE_SIZE = PAGE_SIZE;
