import assert from "node:assert/strict";
import test from "node:test";

import {
  loadPatientDiseaseDetail,
  loadPatientDiseases,
  PATIENT_DISEASE_PAGE_SIZE,
} from "./patient-disease-directory.mjs";

const patientPrincipal = {
  role: "PATIENT",
  accountStatus: "ACTIVE",
  emailVerified: true,
  patient: { patientID: 1 },
};

function makePrisma({ count = 1, diseases = [], single = null, throws = false } = {}) {
  const calls = { count: [], findMany: [], findUnique: [] };
  const prisma = {
    disease: {
      count: async (args) => {
        calls.count.push(args);
        if (throws) throw new Error("Database count failed");
        return count;
      },
      findMany: async (args) => {
        calls.findMany.push(args);
        if (throws) throw new Error("Database findMany failed");
        return diseases;
      },
      findUnique: async (args) => {
        calls.findUnique.push(args);
        if (throws) throw new Error("Database findUnique failed");
        return single;
      },
    },
  };
  return { prisma, calls };
}

test("loadPatientDiseases denies non-patient session", async () => {
  const { prisma } = makePrisma();
  const result = await loadPatientDiseases({
    requirePatient: async () => { throw new Error("Unauthorized"); },
    prisma,
  });
  assert.equal(result.status, "denied");
  assert.deepEqual(result.diseases, []);
});

test("loadPatientDiseases retrieves diseases and maps symptoms", async () => {
  const mockDiseases = [
    {
      diseaseID: 1,
      diseaseName: "Common Cold",
      description: "Mild upper respiratory viral infection.",
      lastUpdated: new Date("2026-11-03T00:00:00.000Z"),
      diseaseSymptoms: [
        { symptom: { symptomID: 21, symptomName: "Cough", bodyPart: "Respiratory system" } },
        { symptom: { symptomID: 24, symptomName: "Nasal congestion", bodyPart: "Nose" } },
      ],
    },
  ];
  const { prisma, calls } = makePrisma({ count: 1, diseases: mockDiseases });
  const result = await loadPatientDiseases({
    requirePatient: async () => patientPrincipal,
    prisma,
    page: 1,
    query: "cold",
  });

  assert.equal(result.status, "success");
  assert.equal(result.total, 1);
  assert.equal(result.page, 1);
  assert.equal(result.pageCount, 1);
  assert.equal(result.query, "cold");
  assert.equal(result.diseases.length, 1);
  assert.equal(result.diseases[0].diseaseName, "Common Cold");
  assert.equal(result.diseases[0].symptoms.length, 2);

  assert.deepEqual(calls.count[0].where, {
    diseaseName: { contains: "cold", mode: "insensitive" },
  });
  assert.deepEqual(calls.findMany[0].where, {
    diseaseName: { contains: "cold", mode: "insensitive" },
  });
  assert.equal(calls.findMany[0].take, PATIENT_DISEASE_PAGE_SIZE);
});

test("loadPatientDiseases handles database errors safely", async () => {
  const { prisma } = makePrisma({ throws: true });
  const result = await loadPatientDiseases({
    requirePatient: async () => patientPrincipal,
    prisma,
  });
  assert.equal(result.status, "error");
  assert.deepEqual(result.diseases, []);
});

test("loadPatientDiseaseDetail returns unavailable for invalid ID or not found", async () => {
  const { prisma: p1 } = makePrisma({ single: null });
  const r1 = await loadPatientDiseaseDetail({
    requirePatient: async () => patientPrincipal,
    prisma: p1,
    diseaseId: "invalid-id",
  });
  assert.equal(r1.status, "unavailable");
  assert.equal(r1.disease, null);

  const { prisma: p2 } = makePrisma({ single: null });
  const r2 = await loadPatientDiseaseDetail({
    requirePatient: async () => patientPrincipal,
    prisma: p2,
    diseaseId: 999,
  });
  assert.equal(r2.status, "unavailable");
  assert.equal(r2.disease, null);
});

test("loadPatientDiseaseDetail returns complete disease detail", async () => {
  const mockSingle = {
    diseaseID: 1,
    diseaseName: "Common Cold",
    description: "Mild upper respiratory viral infection.",
    causes: "Rhinoviruses and other respiratory viruses.",
    treatment: "Rest, hydration, and symptom relief.",
    prevention: "Hand washing and avoiding close contact.",
    whenToSeekCare: "High fever, shortness of breath, or prolonged symptoms.",
    lastUpdated: new Date("2026-11-03T00:00:00.000Z"),
    diseaseSymptoms: [
      { symptom: { symptomID: 21, symptomName: "Cough", bodyPart: "Respiratory system", description: "Expulsion of air." } },
    ],
  };

  const { prisma, calls } = makePrisma({ single: mockSingle });
  const result = await loadPatientDiseaseDetail({
    requirePatient: async () => patientPrincipal,
    prisma,
    diseaseId: "1",
  });

  assert.equal(result.status, "success");
  assert.equal(result.disease.diseaseName, "Common Cold");
  assert.equal(result.disease.causes, mockSingle.causes);
  assert.equal(result.disease.treatment, mockSingle.treatment);
  assert.equal(result.disease.prevention, mockSingle.prevention);
  assert.equal(result.disease.whenToSeekCare, mockSingle.whenToSeekCare);
  assert.equal(result.disease.symptoms.length, 1);
  assert.equal(calls.findUnique[0].where.diseaseID, 1);
});
