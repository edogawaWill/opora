import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifestPath = resolve(process.cwd(), "data/hpo-symptom-catalog-v2026-09-01.json");
const catalogPath = resolve(process.cwd(), "data/opora-initial-disease-catalog-v1.json");

test("initial disease catalog validation against HPO symptom manifest", () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

  // 1. Exactly 12 unique diseases
  assert.equal(catalog.diseases.length, 12, "Must contain exactly 12 disease records");
  const diseaseNames = catalog.diseases.map((d) => d.diseaseName);
  assert.equal(new Set(diseaseNames).size, 12, "All 12 disease names must be unique");

  // 2. All required disease fields are populated and source-backed
  const requiredFields = ["diseaseName", "description", "causes", "treatment", "prevention", "whenToSeekCare"];
  for (const d of catalog.diseases) {
    for (const field of requiredFields) {
      assert.ok(typeof d[field] === "string" && d[field].trim().length > 0, `${d.diseaseName} missing ${field}`);
      assert.ok(d[field].length <= 10000, `${d.diseaseName} ${field} exceeds max length`);
    }
    assert.ok(d.sources && d.sources.primaryTopicUrl && d.sources.primaryTopicUrl.startsWith("https://medlineplus.gov/"), `${d.diseaseName} missing valid MedlinePlus primary topic URL`);
  }

  // 3. Build lookup maps from HPO manifest
  const manifestSymptomByName = new Map();
  const manifestSymptomByHpoId = new Map();
  for (const entry of manifest.entries) {
    manifestSymptomByName.set(entry.label, entry);
    manifestSymptomByHpoId.set(entry.hpoId, entry);
  }
  assert.equal(manifest.entries.length, 32, "HPO manifest must have 32 symptoms");

  // 4. Verify exactly 49 Tier A associations and no duplicates per disease
  let totalTierA = 0;
  const tierADistinctSymptomNames = new Set();
  const seenPairs = new Set();

  for (const d of catalog.diseases) {
    assert.ok(Array.isArray(d.tierASymptomMappings), `${d.diseaseName} missing tierASymptomMappings`);
    const diseasePairNames = new Set();
    for (const m of d.tierASymptomMappings) {
      totalTierA += 1;
      assert.ok(m.symptomName, `${d.diseaseName} has empty symptomName`);
      assert.ok(m.hpoId, `${d.diseaseName} has empty hpoId`);

      // Verify pair uniqueness
      const pairKey = `${d.diseaseName}::${m.symptomName}`;
      assert.ok(!seenPairs.has(pairKey), `Duplicate disease-symptom pair detected: ${pairKey}`);
      seenPairs.add(pairKey);

      assert.ok(!diseasePairNames.has(m.symptomName), `${d.diseaseName} has duplicate mapping for ${m.symptomName}`);
      diseasePairNames.add(m.symptomName);

      // Verify against HPO manifest
      const fromName = manifestSymptomByName.get(m.symptomName);
      assert.ok(fromName, `Symptom name "${m.symptomName}" in ${d.diseaseName} not found in HPO manifest`);
      assert.equal(fromName.hpoId, m.hpoId, `HPO ID mismatch for "${m.symptomName}": expected ${fromName.hpoId}, got ${m.hpoId}`);

      tierADistinctSymptomNames.add(m.symptomName);
    }
  }

  assert.equal(totalTierA, 49, "Total Tier A associations must be exactly 49");
  assert.equal(tierADistinctSymptomNames.size, 20, "Tier A distinct symptoms must be exactly 20");

  // 5. Verify Tier B associations
  assert.equal(catalog.tierBAssociations.length, 5, "Tier B associations must be exactly 5");
  const allDistinctSymptomNames = new Set(tierADistinctSymptomNames);
  for (const b of catalog.tierBAssociations) {
    const fromName = manifestSymptomByName.get(b.symptomName);
    assert.ok(fromName, `Tier B symptom name "${b.symptomName}" not found in HPO manifest`);
    assert.equal(fromName.hpoId, b.hpoId, `Tier B HPO ID mismatch for "${b.symptomName}"`);
    allDistinctSymptomNames.add(b.symptomName);
  }

  assert.equal(allDistinctSymptomNames.size, 22, "Total distinct symptoms across Tier A and B must be exactly 22");

  // 6. Disease specific expected counts
  const expectedCounts = {
    "Common Cold": 3,
    "Influenza (Flu)": 6,
    "Acute Bronchitis": 4,
    "Pneumonia": 7,
    "Asthma": 2,
    "Sinusitis": 4,
    "Viral Gastroenteritis": 5,
    "Migraine": 3,
    "Dengue Fever": 6,
    "Osteoarthritis": 5,
    "Pink Eye (Conjunctivitis)": 1,
    "Allergic Rhinitis (Hay Fever)": 3,
  };

  for (const d of catalog.diseases) {
    assert.equal(d.tierASymptomMappings.length, expectedCounts[d.diseaseName], `Incorrect Tier A count for ${d.diseaseName}`);
  }
});
