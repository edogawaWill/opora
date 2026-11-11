import assert from "node:assert/strict";
import test from "node:test";

import { ASSESSMENT_SAFETY_COPY } from "./assessment-safety-copy.mjs";

test("assessment safety copy distinguishes database references from predictions and diagnosis", () => {
  assert.match(ASSESSMENT_SAFETY_COPY.information, /informational purposes only/i);
  assert.match(ASSESSMENT_SAFETY_COPY.information, /not predictions/i);
  assert.match(ASSESSMENT_SAFETY_COPY.information, /not constitute a confirmed medical diagnosis/i);
  assert.match(ASSESSMENT_SAFETY_COPY.professionalCare, /seek professional medical advice/i);
});

test("emergency copy directs users to verified 999 support without triage rules", () => {
  assert.match(ASSESSMENT_SAFETY_COPY.emergency, /believe you are experiencing a medical emergency/i);
  assert.match(ASSESSMENT_SAFETY_COPY.emergency, /999/);
  assert.match(ASSESSMENT_SAFETY_COPY.emergency, /do not rely on OPORA/i);
  assert.doesNotMatch(ASSESSMENT_SAFETY_COPY.emergency, /if you have|symptoms include|severity|threshold/i);
  assert.equal(ASSESSMENT_SAFETY_COPY.sources.length, 2);
  assert.ok(ASSESSMENT_SAFETY_COPY.sources.every(({ href }) => /^https:\/\/(www\.malaysia\.gov\.my|jknjohor\.moh\.gov\.my)\//.test(href)));
  assert.ok(ASSESSMENT_SAFETY_COPY.sources.some(({ href }) => href === "https://www.malaysia.gov.my/en/topics/mers-999-emergency-line"));
});
