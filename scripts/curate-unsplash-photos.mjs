import nextEnv from "@next/env";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  searchUnsplashPhotos,
  UnsplashCurationError,
} from "../lib/unsplash-curation.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const { loadEnvConfig } = nextEnv;

async function main() {
  const [query, rawCount] = process.argv.slice(2);
  if (!query) {
    console.error('Usage: npm run unsplash:curate -- "search query" [result count]');
    process.exitCode = 1;
    return;
  }

  const count = rawCount === undefined ? 8 : Number(rawCount);
  loadEnvConfig(projectRoot);

  try {
    const candidates = await searchUnsplashPhotos({
      query,
      count,
      accessKey: process.env.UNSPLASH_ACCESS_KEY,
    });
    console.log(JSON.stringify(candidates, null, 2));
    if (candidates.length === 0) {
      console.error("No valid photo candidates were returned; the manifest was not changed.");
    }
  } catch (error) {
    console.error(
      error instanceof UnsplashCurationError
        ? error.message
        : "Photo curation failed. The manifest was not changed.",
    );
    process.exitCode = 1;
  }
}

await main();
