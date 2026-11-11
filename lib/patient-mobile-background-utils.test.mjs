import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildUnsplashReferralUrl,
  getPatientMobilePageGroupForPath,
  getHcpMobilePageGroupForPath,
  getPatientMobileBackgroundPresentation,
  getPatientDesktopBackgroundPresentation,
  isAllowedUnsplashImageUrl,
  patientMobileBackgroundFallback,
  validateCuratedBackgroundAssignments,
} from "./patient-mobile-background-utils.mjs";

test("keeps the warm gradient fallback when the manifest has no photo", () => {
  const presentation = getPatientMobileBackgroundPresentation(undefined);
  assert.equal(presentation.photo, null);
  assert.equal(presentation.backgroundImage, patientMobileBackgroundFallback);
  assert.equal(presentation.backgroundPosition, "center");
});

test("uses the API-returned image URL directly and preserves the configured crop", () => {
  const imageUrl = "https://images.unsplash.com/photo-123?ixid=original-api-value";
  const presentation = getPatientMobileBackgroundPresentation({
    imageUrl,
    objectPosition: "42% center",
  });
  assert.equal(presentation.photo.imageUrl, imageUrl);
  assert.ok(presentation.backgroundImage.includes(`url(${JSON.stringify(imageUrl)})`));
  assert.equal(presentation.backgroundPosition, "center, 42% center");
});

test("uses the existing curated Unsplash photo with a neutral charcoal desktop overlay", () => {
  const imageUrl = "https://images.unsplash.com/photo-123?ixid=curated-api-value";
  const presentation = getPatientDesktopBackgroundPresentation({ imageUrl, objectPosition: "42% center" });
  assert.equal(presentation.photo.imageUrl, imageUrl);
  assert.ok(presentation.backgroundImage.includes("linear-gradient(rgba(12, 12, 16, 0.62), rgba(12, 12, 16, 0.62))"));
  assert.equal(presentation.backgroundImage.includes("rgba(126, 45, 67"), false);
  assert.ok(presentation.backgroundImage.includes(`url(${JSON.stringify(imageUrl)})`));
  assert.equal(presentation.backgroundPosition, "center, 42% center");
});

test("uses a neutral charcoal fallback for the desktop background", () => {
  const presentation = getPatientDesktopBackgroundPresentation(undefined);
  assert.match(presentation.backgroundImage, /#18191d/);
  assert.match(presentation.backgroundImage, /#0c0c10/);
  assert.doesNotMatch(presentation.backgroundImage, /#6f1d35|#520420|#300714/i);
  assert.equal(presentation.backgroundPosition, "center");
});

test("rejects unsupported or insecure image URLs and keeps the fallback", () => {
  for (const value of [
    "http://images.unsplash.com/photo.jpg",
    "https://example.com/photo.jpg",
    "not a URL",
  ]) {
    assert.equal(isAllowedUnsplashImageUrl(value), false);
    const presentation = getPatientMobileBackgroundPresentation({
      imageUrl: value,
      objectPosition: "center",
    });
    assert.equal(presentation.photo, null);
    assert.equal(presentation.backgroundImage, patientMobileBackgroundFallback);
  }
});

test("adds Unsplash referral parameters while retaining existing API query data", () => {
  const link = new URL(buildUnsplashReferralUrl("https://unsplash.com/@photographer?existing=1"));
  assert.equal(link.searchParams.get("existing"), "1");
  assert.equal(link.searchParams.get("utm_source"), "opora");
  assert.equal(link.searchParams.get("utm_medium"), "referral");
});

test("refuses non-Unsplash attribution targets", () => {
  assert.throws(
    () => buildUnsplashReferralUrl("https://example.com/@photographer"),
    /Attribution link must point to Unsplash over HTTPS\./,
  );
});

test("maps every authenticated Patient screen to a stable photo group", () => {
  const routes = [
    ["/patient", "dashboard"],
    ["/patient/history", "symptom-history"],
    ["/patient/assessment", "guided-assessment"],
    ["/patient/assessment/history", "assessment-history"],
    ["/patient/assessment/a-fixed-record-id", "assessment-detail"],
    ["/patient/diseases", "disease-directory"],
    ["/patient/diseases/a-fixed-disease-id", "disease-details"],
    ["/patient/appointments", "appointments"],
    ["/patient/messages", "messages"],
    ["/patient/messages/a-fixed-user-id", "conversation-detail"],
    ["/patient/profile", "profile"],
  ];
  for (const [path, group] of routes) {
    assert.equal(getPatientMobilePageGroupForPath(path), group);
  }
  assert.equal(getPatientMobilePageGroupForPath("/hcp"), null);
  assert.equal(getPatientMobilePageGroupForPath(null), null);
});

test("maps HCP screens and dynamic detail routes to stable HCP-specific photo groups", () => {
  const routes = [
    ["/hcp", "hcp-dashboard"],
    ["/hcp/patients", "hcp-patients"],
    ["/hcp/patients/42", "hcp-patient-detail"],
    ["/hcp/appointments", "hcp-appointments"],
    ["/hcp/appointments/42", "hcp-appointments"],
    ["/hcp/messages", "hcp-messages"],
    ["/hcp/messages/42", "hcp-conversation"],
    ["/hcp/profile", "hcp-profile"],
    ["/hcp/status", "hcp-profile"],
  ];
  for (const [path, group] of routes) {
    assert.equal(getHcpMobilePageGroupForPath(path), group);
  }
  assert.equal(getHcpMobilePageGroupForPath("/admin"), null);
  assert.equal(getHcpMobilePageGroupForPath(null), null);
});

test("detects repeated photo IDs and repeated page groups in the manifest", () => {
  assert.equal(validateCuratedBackgroundAssignments([
    { id: "one", pageGroup: "dashboard" },
    { id: "two", pageGroup: "profile" },
  ]), true);
  assert.equal(validateCuratedBackgroundAssignments([
    { id: "one", pageGroup: "dashboard" },
    { id: "one", pageGroup: "profile" },
  ]), false);
  assert.equal(validateCuratedBackgroundAssignments([
    { id: "one", pageGroup: "dashboard" },
    { id: "two", pageGroup: "dashboard" },
  ]), false);
});

test("the committed manifest covers every Patient screen with distinct API metadata", async () => {
  const source = await readFile(new URL("./patient-mobile-backgrounds.ts", import.meta.url), "utf8");
  const entries = [...source.matchAll(/\{ id: "([^"]+)"[^\n]+\}/g)].map((match) => match[0]);
  const expectedGroups = [
    "dashboard", "symptom-history", "guided-assessment", "assessment-history",
    "assessment-detail", "disease-directory", "disease-details", "appointments",
    "messages", "profile", "conversation-detail",
  ];
  const patientEntries = entries.filter((entry) => expectedGroups.some((group) => entry.includes(`pageGroup: "${group}"`)));
  const assignments = patientEntries.map((entry) => ({
    id: entry.match(/id: "([^"]+)"/)?.[1],
    pageGroup: entry.match(/pageGroup: "([^"]+)"/)?.[1],
  }));

  assert.equal(patientEntries.length, expectedGroups.length);
  assert.equal(validateCuratedBackgroundAssignments(assignments), true);
  assert.deepEqual(new Set(assignments.map(({ pageGroup }) => pageGroup)), new Set(expectedGroups));
  for (const entry of patientEntries) {
    assert.match(entry, /imageUrl: "https:\/\/images\.unsplash\.com\//);
    assert.match(entry, /photographerName: "[^"]+"/);
    assert.match(entry, /photographerProfileUrl: "https:\/\/unsplash\.com\//);
    assert.match(entry, /sourcePhotoUrl: "https:\/\/unsplash\.com\//);
    assert.match(entry, /width: \d+, height: \d+/);
    assert.match(entry, /downloadLocation: "https:\/\/api\.unsplash\.com\/photos\//);
  }
});

test("the shared manifest assigns distinct Unsplash metadata to every HCP background group", async () => {
  const source = await readFile(new URL("./patient-mobile-backgrounds.ts", import.meta.url), "utf8");
  const entries = [...source.matchAll(/\{ id: "([^"]+)"[^\n]+\}/g)].map((match) => match[0]);
  const expectedGroups = [
    "hcp-dashboard", "hcp-patients", "hcp-patient-detail", "hcp-appointments",
    "hcp-messages", "hcp-conversation", "hcp-profile",
  ];
  const hcpEntries = entries.filter((entry) => expectedGroups.some((group) => entry.includes(`pageGroup: "${group}"`)));
  const assignments = hcpEntries.map((entry) => ({
    id: entry.match(/id: "([^"]+)"/)?.[1],
    pageGroup: entry.match(/pageGroup: "([^"]+)"/)?.[1],
  }));

  assert.equal(hcpEntries.length, expectedGroups.length);
  assert.equal(validateCuratedBackgroundAssignments(assignments), true);
  assert.deepEqual(new Set(assignments.map(({ pageGroup }) => pageGroup)), new Set(expectedGroups));
  for (const entry of hcpEntries) {
    assert.match(entry, /imageUrl: "https:\/\/images\.unsplash\.com\//);
    assert.match(entry, /photographerName: "[^"]+"/);
    assert.match(entry, /photographerProfileUrl: "https:\/\/unsplash\.com\//);
    assert.match(entry, /sourcePhotoUrl: "https:\/\/unsplash\.com\//);
    assert.match(entry, /width: \d+, height: \d+/);
    assert.match(entry, /downloadLocation: "https:\/\/api\.unsplash\.com\/photos\//);
  }
});
