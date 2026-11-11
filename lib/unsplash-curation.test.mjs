import assert from "node:assert/strict";
import test from "node:test";

import {
  searchUnsplashPhotos,
  triggerUnsplashDownloadEvent,
  UnsplashCurationError,
} from "./unsplash-curation.mjs";

const candidate = {
  id: "photo-123",
  width: 4000,
  height: 6000,
  alt_description: "A bright hospital corridor",
  description: "Hospital corridor",
  urls: {
    raw: "https://images.unsplash.com/photo-123?ixid=source",
    regular: "https://images.unsplash.com/photo-123?ixid=regular",
  },
  user: {
    name: "Photographer",
    links: { html: "https://unsplash.com/@photographer" },
  },
  links: {
    html: "https://unsplash.com/photos/photo-123",
    download_location: "https://api.unsplash.com/photos/photo-123/download?ixid=download",
  },
};

function mockResponse({ status = 200, body = { results: [candidate] }, headers = {} } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(headers),
    json: async () => body,
  };
}

test("search sends an authenticated official photo-search request and extracts manifest metadata", async () => {
  let requestedUrl;
  let requestedOptions;
  const photos = await searchUnsplashPhotos({
    query: "  modern hospital corridor  ",
    count: 5,
    accessKey: "test-access-key",
    fetchImpl: async (url, options) => {
      requestedUrl = new URL(url);
      requestedOptions = options;
      return mockResponse();
    },
  });

  assert.equal(requestedUrl.origin, "https://api.unsplash.com");
  assert.equal(requestedUrl.pathname, "/search/photos");
  assert.equal(requestedUrl.searchParams.get("query"), "modern hospital corridor");
  assert.equal(requestedUrl.searchParams.get("per_page"), "5");
  assert.equal(requestedOptions.headers.Authorization, "Client-ID test-access-key");
  assert.equal(requestedOptions.headers["Accept-Version"], "v1");
  assert.deepEqual(photos, [{
    id: "photo-123",
    imageUrl: candidate.urls.regular,
    alt: candidate.alt_description,
    photographerName: "Photographer",
    photographerProfileUrl: candidate.user.links.html,
    sourcePhotoUrl: candidate.links.html,
    width: 4000,
    height: 6000,
    downloadLocation: candidate.links.download_location,
  }]);
});

test("search accepts an empty result set without inventing candidates", async () => {
  const photos = await searchUnsplashPhotos({
    query: "quiet healthcare library",
    accessKey: "test-access-key",
    fetchImpl: async () => mockResponse({ body: { results: [] } }),
  });
  assert.deepEqual(photos, []);
});

test("returns only valid Unsplash photo URLs and metadata", async () => {
  const invalidPhoto = {
    ...candidate,
    id: "invalid-photo",
    urls: { regular: "https://example.com/unsupported.jpg" },
  };
  const photos = await searchUnsplashPhotos({
    query: "consultation room",
    accessKey: "test-access-key",
    fetchImpl: async () => mockResponse({ body: { results: [invalidPhoto, candidate] } }),
  });

  assert.deepEqual(photos.map((photo) => photo.id), [candidate.id]);
  assert.equal(photos[0].imageUrl, candidate.urls.regular);
  assert.equal("pageGroup" in photos[0], false);
  assert.equal("objectPosition" in photos[0], false);
});

test("uses API description fields and leaves alt text empty if Unsplash provides none", async () => {
  const described = { ...candidate, alt_description: null };
  const photos = await searchUnsplashPhotos({
    query: "examination room",
    accessKey: "test-access-key",
    fetchImpl: async () => mockResponse({ body: { results: [described] } }),
  });
  assert.equal(photos[0].alt, candidate.description);

  const undescribed = { ...candidate, alt_description: null, description: null };
  const emptyAlt = await searchUnsplashPhotos({
    query: "waiting lounge",
    accessKey: "test-access-key",
    fetchImpl: async () => mockResponse({ body: { results: [undescribed] } }),
  });
  assert.equal(emptyAlt[0].alt, "");
});

test("rejects missing credentials and invalid search inputs before fetching", async () => {
  let called = false;
  const fetchImpl = async () => {
    called = true;
    return mockResponse();
  };

  await assert.rejects(
    searchUnsplashPhotos({ query: "hospital", accessKey: "", fetchImpl }),
    (error) => error instanceof UnsplashCurationError && error.code === "missing_access_key",
  );
  await assert.rejects(
    searchUnsplashPhotos({ query: "  ", accessKey: "key", fetchImpl }),
    (error) => error instanceof UnsplashCurationError && error.code === "invalid_query",
  );
  await assert.rejects(
    searchUnsplashPhotos({ query: "hospital", accessKey: "key", count: 31, fetchImpl }),
    (error) => error instanceof UnsplashCurationError && error.code === "invalid_count",
  );
  assert.equal(called, false);
});

test("sanitizes invalid-key and rate-limit failures without including credentials", async () => {
  const secret = "do-not-print-this-key";
  await assert.rejects(
    searchUnsplashPhotos({
      query: "hospital",
      accessKey: secret,
      fetchImpl: async () => mockResponse({ status: 401, body: { errors: [secret] } }),
    }),
    (error) => error.code === "invalid_credentials" && !error.message.includes(secret),
  );
  await assert.rejects(
    searchUnsplashPhotos({
      query: "hospital",
      accessKey: secret,
      fetchImpl: async () => mockResponse({ status: 429 }),
    }),
    (error) => error.code === "rate_limited" && !error.message.includes(secret),
  );
  await assert.rejects(
    searchUnsplashPhotos({
      query: "hospital",
      accessKey: secret,
      fetchImpl: async () => mockResponse({ status: 403, headers: { "x-ratelimit-remaining": "0" } }),
    }),
    (error) => error.code === "rate_limited",
  );
});

test("sanitizes network, provider, and malformed response failures", async () => {
  await assert.rejects(
    searchUnsplashPhotos({ query: "hospital", accessKey: "key", fetchImpl: async () => { throw new Error("private network details"); } }),
    (error) => error.code === "network_error" && !error.message.includes("private network details"),
  );
  await assert.rejects(
    searchUnsplashPhotos({ query: "hospital", accessKey: "key", fetchImpl: async () => mockResponse({ status: 500 }) }),
    (error) => error.code === "api_error" && error.message === "Unsplash photo search failed (HTTP 500).",
  );
  await assert.rejects(
    searchUnsplashPhotos({ query: "hospital", accessKey: "key", fetchImpl: async () => ({ ...mockResponse(), json: async () => { throw new Error("response body details"); } }) }),
    (error) => error.code === "invalid_response" && !error.message.includes("response body details"),
  );
  await assert.rejects(
    searchUnsplashPhotos({ query: "hospital", accessKey: "key", fetchImpl: async () => mockResponse({ body: {} }) }),
    (error) => error.code === "invalid_response",
  );
});

test("sends one authenticated GET to the API-provided download location", async () => {
  let calls = 0;
  const ok = await triggerUnsplashDownloadEvent({
    downloadLocation: candidate.links.download_location,
    accessKey: "test-access-key",
    fetchImpl: async (url, options) => {
      calls += 1;
      assert.equal(String(url), candidate.links.download_location);
      assert.equal(options.method, "GET");
      assert.equal(options.headers.Authorization, "Client-ID test-access-key");
      return { ok: true };
    },
  });
  assert.equal(ok, true);
  assert.equal(calls, 1);
});

test("rejects an invalid download location without making a request", async () => {
  let calls = 0;
  await assert.rejects(
    triggerUnsplashDownloadEvent({
      downloadLocation: "https://example.com/download",
      accessKey: "test-access-key",
      fetchImpl: async () => { calls += 1; return { ok: true }; },
    }),
    (error) => error instanceof UnsplashCurationError && error.code === "invalid_download_location",
  );
  assert.equal(calls, 0);
});
