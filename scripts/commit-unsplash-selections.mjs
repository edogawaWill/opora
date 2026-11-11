import nextEnv from "@next/env";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { triggerUnsplashDownloadEvent } from "../lib/unsplash-curation.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifestPath = resolve(projectRoot, "lib/patient-mobile-backgrounds.ts");
const ledgerPath = resolve(projectRoot, "data/unsplash-selection-events.json");

function persistLedger(ledger) {
  return writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
}

async function main() {
  const ids = [...new Set(process.argv.slice(2))];
  if (ids.length === 0) {
    console.error("Provide the selected photo IDs after the manifest has been committed.");
    process.exitCode = 1;
    return;
  }

  nextEnv.loadEnvConfig(projectRoot);
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.error("UNSPLASH_ACCESS_KEY is not configured; no events were sent.");
    process.exitCode = 1;
    return;
  }

  const manifest = await readFile(manifestPath, "utf8");
  for (const id of ids) {
    if (!manifest.includes(`id: "${id}"`)) {
      console.error(`Photo ${id} is not present in the committed manifest; no event was sent for it.`);
      process.exitCode = 1;
      return;
    }
  }

  let ledger = {};
  try {
    ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  for (const id of ids) {
    if (ledger[id]) {
      console.log(`Skipped ${id}: selection event already recorded as ${ledger[id].status}.`);
      continue;
    }

    // Persist before calling the API so reruns never repeat an event after a crash.
    ledger[id] = { status: "started", attemptedAt: new Date().toISOString() };
    await persistLedger(ledger);

    try {
      const response = await fetch(`https://api.unsplash.com/photos/${encodeURIComponent(id)}`, {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
          "Accept-Version": "v1",
          Accept: "application/json",
        },
      });
      if (!response.ok) throw new Error(`Unsplash metadata request failed (HTTP ${response.status}).`);
      const photo = await response.json();
      if (photo.id !== id || typeof photo.links?.download_location !== "string") {
        throw new Error("Unsplash did not return the selected photo's download location.");
      }
      await triggerUnsplashDownloadEvent({
        downloadLocation: photo.links.download_location,
        accessKey,
      });
      ledger[id] = { status: "succeeded", attemptedAt: ledger[id].attemptedAt };
      await persistLedger(ledger);
      console.log(`Recorded selection event for ${id}.`);
    } catch (error) {
      ledger[id] = { status: "started", attemptedAt: ledger[id].attemptedAt };
      await persistLedger(ledger);
      console.error(`Selection event for ${id} did not complete: ${error.message}`);
      process.exitCode = 1;
      return;
    }
  }
}

await main();
