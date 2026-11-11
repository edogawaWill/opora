import { toNextJsHandler } from "better-auth/next-js";

import { AUTH_BASE_PATH, auth } from "@/lib/auth";
import { isBlockedPublicAuthPath } from "@/lib/login-policy.mjs";

const handlers = toNextJsHandler(auth);

function isBlockedPublicAuthRequest(request: Request): boolean {
  try {
    return isBlockedPublicAuthPath(new URL(request.url).pathname, AUTH_BASE_PATH);
  } catch {
    return true;
  }
}

function guardPublicAuthRequest(
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (isBlockedPublicAuthRequest(request)) {
      return Response.json({ message: "Not found" }, { status: 404 });
    }
    return handler(request);
  };
}

export const GET = guardPublicAuthRequest(handlers.GET);
export const POST = guardPublicAuthRequest(handlers.POST);
export const PATCH = guardPublicAuthRequest(handlers.PATCH);
export const PUT = guardPublicAuthRequest(handlers.PUT);
export const DELETE = guardPublicAuthRequest(handlers.DELETE);
export const HEAD = guardPublicAuthRequest(async (request) => {
  const response = await handlers.GET(request);
  return new Response(null, { status: response.status, headers: response.headers });
});
export const OPTIONS = guardPublicAuthRequest(async () =>
  new Response(null, {
    status: 204,
    headers: { Allow: "GET, HEAD, POST, PATCH, PUT, DELETE, OPTIONS" },
  }),
);
