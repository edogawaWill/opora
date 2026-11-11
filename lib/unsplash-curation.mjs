const API_BASE_URL = "https://api.unsplash.com";
const MAX_RESULTS_PER_PAGE = 30;

export class UnsplashCurationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "UnsplashCurationError";
    this.code = code;
  }
}

/**
 * Query Unsplash for photo candidates. The caller must provide the server-side
 * access key; this module never reads or logs process environment values.
 * @param {{ query: string, accessKey: string, count?: number, fetchImpl?: typeof fetch }} options
 */
export async function searchUnsplashPhotos({
  query,
  accessKey,
  count = 8,
  fetchImpl = fetch,
}) {
  const normalizedQuery = typeof query === "string" ? query.trim() : "";
  if (!normalizedQuery || normalizedQuery.length > 200) {
    throw new UnsplashCurationError("invalid_query", "Provide a search query up to 200 characters.");
  }
  if (typeof accessKey !== "string" || !accessKey.trim()) {
    throw new UnsplashCurationError(
      "missing_access_key",
      "UNSPLASH_ACCESS_KEY is not configured in the server environment.",
    );
  }
  if (!Number.isInteger(count) || count < 1 || count > MAX_RESULTS_PER_PAGE) {
    throw new UnsplashCurationError(
      "invalid_count",
      `Result count must be an integer from 1 to ${MAX_RESULTS_PER_PAGE}.`,
    );
  }
  if (typeof fetchImpl !== "function") {
    throw new UnsplashCurationError("invalid_fetch", "A fetch implementation is required.");
  }

  const url = new URL(`${API_BASE_URL}/search/photos`);
  url.searchParams.set("query", normalizedQuery);
  url.searchParams.set("per_page", String(count));

  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Authorization: `Client-ID ${accessKey.trim()}`,
        "Accept-Version": "v1",
        Accept: "application/json",
      },
    });
  } catch {
    throw new UnsplashCurationError("network_error", "Unable to reach the Unsplash API.");
  }

  if (response.status === 401) {
    throw new UnsplashCurationError("invalid_credentials", "Unsplash rejected the access key.");
  }
  if (
    response.status === 429 ||
    (response.status === 403 && response.headers?.get("x-ratelimit-remaining") === "0")
  ) {
    throw new UnsplashCurationError("rate_limited", "Unsplash rate limit reached. Try again later.");
  }
  if (!response.ok) {
    throw new UnsplashCurationError(
      "api_error",
      `Unsplash photo search failed (HTTP ${response.status}).`,
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new UnsplashCurationError("invalid_response", "Unsplash returned an unreadable response.");
  }

  if (!payload || !Array.isArray(payload.results)) {
    throw new UnsplashCurationError("invalid_response", "Unsplash returned an unexpected response format.");
  }

  return payload.results
    .map(toCandidate)
    .filter((candidate) => candidate !== null);
}

/**
 * Fire Unsplash's required download-tracking request for a committed selection.
 * This helper must only be called by the explicit curation workflow.
 * @param {{ downloadLocation: string, accessKey: string, fetchImpl?: typeof fetch }} options
 */
export async function triggerUnsplashDownloadEvent({
  downloadLocation,
  accessKey,
  fetchImpl = fetch,
}) {
  if (!isHttpsUrlOnHost(downloadLocation, "api.unsplash.com")) {
    throw new UnsplashCurationError("invalid_download_location", "Unsplash returned an invalid download location.");
  }
  if (typeof accessKey !== "string" || !accessKey.trim()) {
    throw new UnsplashCurationError("missing_access_key", "UNSPLASH_ACCESS_KEY is not configured in the server environment.");
  }
  if (typeof fetchImpl !== "function") {
    throw new UnsplashCurationError("invalid_fetch", "A fetch implementation is required.");
  }

  let response;
  try {
    response = await fetchImpl(downloadLocation, {
      method: "GET",
      headers: {
        Authorization: `Client-ID ${accessKey.trim()}`,
        "Accept-Version": "v1",
        Accept: "application/json",
      },
    });
  } catch {
    throw new UnsplashCurationError("network_error", "Unable to reach the Unsplash download endpoint.");
  }
  if (!response.ok) {
    throw new UnsplashCurationError("api_error", `Unsplash download tracking failed (HTTP ${response.status}).`);
  }
  return true;
}

function toCandidate(photo) {
  if (!photo || typeof photo !== "object") return null;

  const imageUrl = photo.urls?.regular;
  const photographerProfileUrl = photo.user?.links?.html;
  const sourcePhotoUrl = photo.links?.html;
  const downloadLocation = photo.links?.download_location;
  const photographerName = photo.user?.name;
  const width = photo.width;
  const height = photo.height;

  if (
    typeof photo.id !== "string" || !photo.id ||
    !isHttpsUrlOnHost(imageUrl, "images.unsplash.com") ||
    !isUnsplashWebUrl(photographerProfileUrl) ||
    !isUnsplashWebUrl(sourcePhotoUrl) ||
    !isHttpsUrlOnHost(downloadLocation, "api.unsplash.com") ||
    typeof photographerName !== "string" || !photographerName.trim() ||
    !Number.isSafeInteger(width) || width <= 0 ||
    !Number.isSafeInteger(height) || height <= 0
  ) {
    return null;
  }

  const alt = [photo.alt_description, photo.description].find(
    (value) => typeof value === "string" && value.trim(),
  ) ?? "";

  return {
    id: photo.id,
    imageUrl,
    alt,
    photographerName,
    photographerProfileUrl,
    sourcePhotoUrl,
    width,
    height,
    downloadLocation,
  };
}

function isUnsplashWebUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["unsplash.com", "www.unsplash.com"].includes(url.hostname);
  } catch {
    return false;
  }
}

function isHttpsUrlOnHost(value, hostname) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === hostname;
  } catch {
    return false;
  }
}
