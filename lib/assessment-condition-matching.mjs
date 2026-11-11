const MAX_ID = 2_147_483_647;

function cleanText(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : null;
}

/**
 * Extract the catalog IDs from the JSON answers saved by the assessment
 * persistence service. Invalid saved data fails closed instead of producing an
 * empty-match result that could be mistaken for a meaningful assessment.
 * @param {unknown} answers
 * @returns {{status: "success", symptomIDs: number[]} | {status: "invalid"}}
 */
export function symptomIDsFromAssessmentAnswers(answers) {
  if (!Array.isArray(answers) || answers.length === 0) return { status: "invalid" };
  const ids = [];
  for (const answer of answers) {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) return { status: "invalid" };
    const id = answer.symptomID;
    if (!Number.isSafeInteger(id) || id < 1 || id > MAX_ID) return { status: "invalid" };
    ids.push(id);
  }
  return { status: "success", symptomIDs: [...new Set(ids)] };
}

/**
 * Returns diseases associated through DiseaseSymptom with at least one
 * submitted catalog symptom. This is information retrieval, not diagnosis.
 * @param {{prisma: any, symptomIDs: unknown}} input
 * @returns {Promise<{status: "success", diseases: Array<{diseaseID: number, diseaseName: string, description: string | null, causes: string | null, treatment: string | null, prevention: string | null, whenToSeekCare: string | null, relatedSymptoms: Array<{symptomName: string, bodyPart: string}>}> | {status: "invalid"} | {status: "error"}>}
 */
export async function findConditionsForSymptoms({ prisma, symptomIDs }) {
  if (!Array.isArray(symptomIDs) || symptomIDs.length === 0) return { status: "invalid" };
  if (symptomIDs.some((id) => !Number.isSafeInteger(id) || id < 1 || id > MAX_ID)) {
    return { status: "invalid" };
  }
  const ids = [...new Set(symptomIDs)];

  try {
    const records = await prisma.disease.findMany({
      where: { diseaseSymptoms: { some: { symptomID: { in: ids } } } },
      orderBy: { diseaseName: "asc" },
      select: {
        diseaseID: true,
        diseaseName: true,
        description: true,
        causes: true,
        treatment: true,
        prevention: true,
        whenToSeekCare: true,
        diseaseSymptoms: {
          where: { symptomID: { in: ids } },
          orderBy: { symptom: { symptomName: "asc" } },
          select: { symptom: { select: { symptomName: true, bodyPart: true } } },
        },
      },
    });

    const diseases = records.map((record) => ({
      diseaseID: record.diseaseID,
      diseaseName: record.diseaseName,
      description: cleanText(record.description),
      causes: cleanText(record.causes),
      treatment: cleanText(record.treatment),
      prevention: cleanText(record.prevention),
      whenToSeekCare: cleanText(record.whenToSeekCare),
      relatedSymptoms: record.diseaseSymptoms.map(({ symptom }) => ({
        symptomName: symptom.symptomName,
        bodyPart: symptom.bodyPart,
      })),
    }));

    return { status: "success", diseases };
  } catch {
    return { status: "error" };
  }
}
