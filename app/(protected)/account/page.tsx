import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AuthorizationError, requireAuthenticatedUser } from "@/lib/authorization";

function AccountLoadingFallback() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold text-[#7E2D43]">Loading your account…</p>
    </main>
  );
}

export default function AccountLandingPage() {
  return (
    <Suspense fallback={<AccountLoadingFallback />}>
      <AccountLandingContent />
    </Suspense>
  );
}

async function AccountLandingContent() {
  let principal;
  try {
    principal = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      if (error.code === "email_not_verified") redirect("/verify-email");
      if (error.code === "UNAUTHENTICATED") redirect("/login");
      redirect("/login?status=inactive");
    }
    throw error;
  }

  if (principal.role === "PATIENT") redirect("/patient");
  if (principal.role === "HCP") {
    redirect(
      principal.healthcareProfessional?.verificationStatus === "Approved"
        ? "/hcp"
        : "/hcp/status",
    );
  }
  if (principal.role === "ADMIN") redirect("/admin");

  redirect("/login");
  return null;
}
