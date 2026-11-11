/**
 * Calculates a 14-day symptom severity trend from a patient's symptom records.
 * Gracefully handles days without records without fabricating clinical data.
 *
 * @param {Array<{
 *   recordID: number,
 *   severity: number,
 *   recordedAt: Date | string,
 *   onsetDate?: Date | string,
 *   symptom: { symptomName: string, bodyPart?: string }
 * }>} records
 * @param {Date | string} [referenceDate] - The UTC calendar date ending the 14-day window (defaults to now).
 * @returns {{
 *   windowStart: string,
 *   windowEnd: string,
 *   days: Array<{
 *     date: string,
 *     dayLabel: string,
 *     shortDayOfWeek: string,
 *     hasData: boolean,
 *     maxSeverity: number | null,
 *     avgSeverity: number | null,
 *     recordCount: number,
 *     symptoms: Array<{ name: string, severity: number }>
 *   }>,
 *   summary: {
 *     totalObservations: number,
 *     activeDays: number,
 *     peakSeverity: number | null,
 *     averageSeverity: number | null,
 *     mostFrequentSymptom: string | null
 *   }
 * }}
 */
export function buildSymptomSeverityTrend(records = [], referenceDate = new Date()) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const end = Number.isNaN(ref.getTime()) ? new Date() : ref;

  // Build map of YYYY-MM-DD -> array of records
  const recordsByDate = new Map();

  for (const record of records) {
    if (!record || typeof record.severity !== "number") continue;
    // Activity charts report when a symptom was recorded, not when it began.
    const recordedDate = record.recordedAt ?? record.onsetDate;
    if (recordedDate === undefined || recordedDate === null) continue;
    const dateObj = recordedDate instanceof Date ? recordedDate : new Date(recordedDate);
    if (Number.isNaN(dateObj.getTime())) continue;

    const yyyyMmDd = dateObj.toISOString().slice(0, 10);
    if (!recordsByDate.has(yyyyMmDd)) {
      recordsByDate.set(yyyyMmDd, []);
    }
    recordsByDate.get(yyyyMmDd).push(record);
  }

  const days = [];
  let totalObservations = 0;
  let activeDays = 0;
  let peakSeverity = null;
  let severitySum = 0;
  const symptomFrequency = new Map();

  // Generate 14 calendar days ending on `end`
  for (let i = 13; i >= 0; i--) {
    const dayDate = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - i));
    const yyyyMmDd = dayDate.toISOString().slice(0, 10);

    const dayLabel = dayDate.toLocaleDateString("en-MY", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

    const shortDayOfWeek = dayDate.toLocaleDateString("en-MY", {
      weekday: "short",
      timeZone: "UTC",
    });

    const dayRecords = recordsByDate.get(yyyyMmDd) || [];
    const hasData = dayRecords.length > 0;

    let maxSeverity = null;
    let avgSeverity = null;
    const symptoms = [];

    if (hasData) {
      activeDays += 1;
      totalObservations += dayRecords.length;
      let daySum = 0;

      for (const rec of dayRecords) {
        daySum += rec.severity;
        severitySum += rec.severity;

        if (maxSeverity === null || rec.severity > maxSeverity) {
          maxSeverity = rec.severity;
        }
        if (peakSeverity === null || rec.severity > peakSeverity) {
          peakSeverity = rec.severity;
        }

        const name = rec.symptom?.symptomName || "Unknown symptom";
        symptoms.push({ name, severity: rec.severity });
        symptomFrequency.set(name, (symptomFrequency.get(name) || 0) + 1);
      }

      avgSeverity = Math.round((daySum / dayRecords.length) * 10) / 10;
    }

    days.push({
      date: yyyyMmDd,
      dayLabel,
      shortDayOfWeek,
      hasData,
      maxSeverity,
      avgSeverity,
      recordCount: dayRecords.length,
      symptoms,
    });
  }

  let mostFrequentSymptom = null;
  let maxFreq = 0;
  for (const [name, count] of symptomFrequency.entries()) {
    if (count > maxFreq) {
      maxFreq = count;
      mostFrequentSymptom = name;
    }
  }

  const averageSeverity =
    totalObservations > 0 ? Math.round((severitySum / totalObservations) * 10) / 10 : null;

  return {
    windowStart: days[0]?.date || "",
    windowEnd: days[days.length - 1]?.date || "",
    days,
    summary: {
      totalObservations,
      activeDays,
      peakSeverity,
      averageSeverity,
      mostFrequentSymptom,
    },
  };
}
