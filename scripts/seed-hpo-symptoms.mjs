import nextEnv from "@next/env";
import { createJiti } from "jiti";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateDevelopmentDatabaseTarget } from "./database-target.mjs";
import { validateHpoSymptomManifest } from "../lib/hpo-symptom-manifest.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifestPath = resolve(projectRoot, "data/hpo-symptom-catalog-v2026-09-01.json");
const { loadEnvConfig } = nextEnv;

async function main() {
  let prisma;
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const validation = validateHpoSymptomManifest(manifest);
    if (!validation.valid) {
      console.error("The HPO symptom catalog failed validation:");
      for (const error of validation.errors) console.error(`- ${error}`);
      process.exitCode = 1;
      return;
    }

    loadEnvConfig(projectRoot);
    const databaseTargetError = validateDevelopmentDatabaseTarget({
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL,
    });
    if (databaseTargetError) {
      console.error(`${databaseTargetError} No catalog entries were imported.`);
      process.exitCode = 1;
      return;
    }

    const jiti = createJiti(import.meta.url, {
      tsconfigPaths: resolve(projectRoot, "tsconfig.json"),
    });
    const prismaModule = await jiti.import(resolve(projectRoot, "lib/prisma.ts"));
    prisma = prismaModule.default;

    const result = await prisma.symptom.createMany({
      data: manifest.entries.map((entry) => ({
        symptomName: entry.label,
        bodyPart: entry.oporaBodyPart,
        description: entry.definition,
      })),
      skipDuplicates: true,
    });
    const skipped = manifest.entries.length - result.count;
    console.log(`HPO symptom catalog import complete: ${result.count} inserted, ${skipped} skipped as existing names.`);
  } catch {
    console.error("HPO symptom catalog import failed. No existing symptom records were updated.");
    process.exitCode = 1;
  } finally {
    if (prisma) {
      try {
        await prisma.$disconnect();
      } catch {
        // Do not replace the sanitized command result with adapter details.
      }
    }
  }
}

await main();
