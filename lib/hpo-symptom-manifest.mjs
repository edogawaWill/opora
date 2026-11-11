const HPO_ID_PATTERN = /^HP:\d{7,}$/;
const MAX_ENTRIES = 40;
const MIN_ENTRIES = 25;
const SOURCE_FILE_URL = "https://raw.githubusercontent.com/obophenotype/human-phenotype-ontology/v2026-09-01/hp.obo";
const LICENSE_URL = "https://human-phenotype-ontology.github.io/license.html";

/** @param {unknown} manifest */
export function validateHpoSymptomManifest(manifest) {
  /** @type {string[]} */
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { valid: false, errors: ["Manifest must be an object."] };
  }

  const metadata = manifest.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    errors.push("Source metadata is required.");
  } else {
    if (metadata.sourceName !== "Human Phenotype Ontology" || metadata.sourceAbbreviation !== "HPO") {
      errors.push("The HPO source name and abbreviation are required.");
    }
    if (metadata.releaseVersion !== "2026-09-01" || metadata.releaseTag !== "v2026-09-01") {
      errors.push("The manifest must identify HPO release v2026-09-01.");
    }
    if (metadata.sourceDataVersion !== "hp/releases/2026-09-01") {
      errors.push("The source data version does not match the pinned release.");
    }
    if (metadata.sourceFile !== SOURCE_FILE_URL) {
      errors.push("The source file URL must point to the pinned official HPO release.");
    }
    if (metadata.licenseUrl !== LICENSE_URL) {
      errors.push("The HPO license URL is required.");
    }
    if (typeof metadata.acknowledgement !== "string" ||
        !metadata.acknowledgement.includes("2026-09-01") ||
        !metadata.acknowledgement.includes("does not endorse OPORA")) {
      errors.push("The acknowledgement must include the release and avoid implying HPO endorsement.");
    }
    for (const key of ["sourceFile", "licenseUrl", "acknowledgement", "citation", "licenseConditions"]) {
      if (typeof metadata[key] !== "string" || metadata[key].trim().length === 0) {
        errors.push(`Required source attribution field is missing: ${key}.`);
      }
    }
  }

  if (!Array.isArray(manifest.entries)) {
    errors.push("Entries must be an array.");
    return { valid: false, errors };
  }
  if (manifest.entries.length < MIN_ENTRIES || manifest.entries.length > MAX_ENTRIES) {
    errors.push(`Catalog must contain between ${MIN_ENTRIES} and ${MAX_ENTRIES} entries.`);
  }

  const ids = new Set();
  const labels = new Set();
  manifest.entries.forEach((entry, index) => {
    const prefix = `Entry ${index + 1}`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`${prefix} must be an object.`);
      return;
    }
    if (typeof entry.hpoId !== "string" || !HPO_ID_PATTERN.test(entry.hpoId)) {
      errors.push(`${prefix} has an invalid HPO identifier.`);
    } else if (ids.has(entry.hpoId)) {
      errors.push(`${prefix} duplicates an HPO identifier.`);
    } else {
      ids.add(entry.hpoId);
    }

    if (typeof entry.label !== "string" || entry.label.trim().length === 0) {
      errors.push(`${prefix} has no source label.`);
    } else {
      if (entry.label.length > 80) errors.push(`${prefix} source label exceeds 80 characters.`);
      const normalizedLabel = entry.label.trim().toLocaleLowerCase("en");
      if (labels.has(normalizedLabel)) errors.push(`${prefix} duplicates a source label.`);
      labels.add(normalizedLabel);
    }

    if (typeof entry.definition !== "string" || entry.definition.trim().length === 0) {
      errors.push(`${prefix} has no verified source definition.`);
    }
    if (typeof entry.oporaBodyPart !== "string" || entry.oporaBodyPart.trim().length === 0) {
      errors.push(`${prefix} has no OPORA body-area classification.`);
    } else if (entry.oporaBodyPart.length > 50) {
      errors.push(`${prefix} OPORA body-area classification exceeds 50 characters.`);
    }
    if (typeof entry.oporaMappingRationale !== "string" || entry.oporaMappingRationale.trim().length === 0) {
      errors.push(`${prefix} has no rationale for its OPORA classification.`);
    }
  });

  return { valid: errors.length === 0, errors };
}
