import assert from "node:assert/strict";
import test from "node:test";

import { getHcpPrimaryNavigationItem } from "./hcp-navigation.mjs";

test("maps HCP primary routes and nested details to their dock destinations", () => {
  const routes = [
    ["/hcp", "home"],
    ["/hcp/", "home"],
    ["/hcp/patients", "patients"],
    ["/hcp/patients/42", "patients"],
    ["/hcp/appointments", "appointments"],
    ["/hcp/appointments/42", "appointments"],
    ["/hcp/messages", "messages"],
    ["/hcp/messages/42", "messages"],
    ["/hcp/profile", "profile"],
    ["/hcp/status", "profile"],
  ];

  for (const [path, item] of routes) assert.equal(getHcpPrimaryNavigationItem(path), item);
});

test("does not mark non-HCP routes as an active HCP destination", () => {
  assert.equal(getHcpPrimaryNavigationItem("/patient"), null);
  assert.equal(getHcpPrimaryNavigationItem("/hcp/not-a-route"), null);
  assert.equal(getHcpPrimaryNavigationItem(null), null);
});
