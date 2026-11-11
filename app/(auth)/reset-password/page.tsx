import { Suspense } from "react";

import AuthShell from "@/components/auth/auth-shell";
import ResetPasswordForm from "@/components/auth/reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

function ResetPasswordFallback() {
  return (
    <p
      role="status"
      className="mt-6 rounded-xl border border-[#E4BAC3] bg-[#FDF7F8] p-3 text-sm text-[#5C1E30]"
    >
      Loading the password reset form…
    </p>
  );
}

async function ResetPasswordContent({ searchParams }: ResetPasswordPageProps) {
  const query = await searchParams;
  const token = query.error ? "" : query.token ?? "";

  return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  return (
    <AuthShell>
      <div className="flex flex-1 flex-col">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Choose a new password</h1>
        <p className="mt-2 text-sm text-slate-500">Your new password must be at least 8 characters.</p>
        <Suspense fallback={<ResetPasswordFallback />}>
          <ResetPasswordContent searchParams={searchParams} />
        </Suspense>
      </div>
    </AuthShell>
  );
}
