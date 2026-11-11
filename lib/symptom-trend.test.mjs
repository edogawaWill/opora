import assert from "node:assert/strict";
import test from "node:test";

import { buildSymptomSeverityTrend } from "./symptom-trend.mjs";

test("buildSymptomSeverityTrend returns 14 days when no records exist without inventing data", () => {
  const ref = new Date("2026-10-28T00:00:00.000Z");
  const result = buildSymptomSeverityTrend([], ref);

  assert.equal(result.days.length, 14);
  assert.equal(result.summary.totalObservations, 0);
  assert.equal(result.summary.activeDays, 0);
  assert.equal(result.summary.peakSeverity, null);
  assert.equal(result.summary.averageSeverity, null);
  assert.equal(result.summary.mostFrequentSymptom, null);

  for (const day of result.days) {
    assert.equal(day.hasData, false);
    assert.equal(day.maxSeverity, null);
    assert.equal(day.avgSeverity, null);
    assert.equal(day.recordCount, 0);
    assert.deepEqual(day.symptoms, []);
  }
});

test("buildSymptomSeverityTrend populates matching days and computes summaries correctly", () => {
  const ref = new Date("2026-10-28T00:00:00.000Z");
  const records = [
    {
      recordID: 1,
      severity: 6,
      onsetDate: "2026-10-28T00:00:00.000Z",
      symptom: { symptomName: "Headache" },
    },
    {
      recordID: 2,
      severity: 8,
      onsetDate: "2026-10-28T00:00:00.000Z",
      symptom: { symptomName: "Migraine" },
    },
    {
      recordID: 3,
      severity: 4,
      onsetDate: "2026-10-26T00:00:00.000Z",
      symptom: { symptomName: "Headache" },
    },
    // Older record outside 14-day window:
    {
      recordID: 4,
      severity: 9,
      onsetDate: "2026-09-01T00:00:00.000Z",
      symptom: { symptomName: "Fever" },
    },
  ];

  const result = buildSymptomSeverityTrend(records, ref);

  assert.equal(result.days.length, 14);
  assert.equal(result.summary.totalObservations, 3);
  assert.equal(result.summary.activeDays, 2);
  assert.equal(result.summary.peakSeverity, 8);
  assert.equal(result.summary.averageSeverity, 6.0); // (6 + 8 + 4) / 3 = 6
  assert.equal(result.summary.mostFrequentSymptom, "Headache");

  const today = result.days.find((d) => d.date === "2026-10-28");
  assert.ok(today);
  assert.equal(today.hasData, true);
  assert.equal(today.maxSeverity, 8);
  assert.equal(today.avgSeverity, 7.0); // (6 + 8) / 2 = 7
  assert.equal(today.recordCount, 2);
  assert.equal(today.symptoms.length, 2);

  const twoDaysAgo = result.days.find((d) => d.date === "2026-10-26");
  assert.ok(twoDaysAgo);
  assert.equal(twoDaysAgo.hasData, true);
  assert.equal(twoDaysAgo.maxSeverity, 4);

  const missingDay = result.days.find((d) => d.date === "2026-10-27");
  assert.ok(missingDay);
  assert.equal(missingDay.hasData, false);
  assert.equal(missingDay.maxSeverity, null);
});

test("activity and chart date use recordedAt rather than an older onsetDate", () => {
  const ref = new Date("2026-11-05T14:00:00.000Z");
  const result = buildSymptomSeverityTrend([{
    recordID: 9,
    severity: 8,
    onsetDate: "2026-10-10T00:00:00.000Z",
    recordedAt: "2026-10-23T04:30:00.000Z",
    symptom: { symptomName: "Blurred vision" },
  }], ref);

  assert.equal(result.windowStart, "2026-10-23");
  assert.equal(result.windowEnd, "2026-11-05");
  assert.equal(result.summary.activeDays, 1);
  assert.equal(result.summary.totalObservations, 1);
  const recordedDay = result.days.find((day) => day.date === "2026-10-23");
  assert.equal(recordedDay?.maxSeverity, 8);
  assert.equal(recordedDay?.symptoms[0]?.name, "Blurred vision");
});

test("records outside the 14-day window remain excluded by recordedAt", () => {
  const result = buildSymptomSeverityTrend([{
    recordID: 10,
    severity: 5,
    onsetDate: "2026-11-04T00:00:00.000Z",
    recordedAt: "2026-10-22T23:59:59.000Z",
    symptom: { symptomName: "Cough" },
  }], new Date("2026-11-05T12:00:00.000Z"));

  assert.equal(result.summary.activeDays, 0);
  assert.equal(result.summary.totalObservations, 0);
});
