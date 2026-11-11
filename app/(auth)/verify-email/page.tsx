import { Suspense } from "react";
import Link from "next/link";

import AuthShell from "@/components/auth/auth-shell";

type VerifyEmailPageProps = {
  searchParams: Promise<{ sent?: string; verified?: string; error?: string }>;
};

const defaultMessage =
  "If your account requires verification, access remains blocked until OPORA confirms your email. If you received a verification link, follow it. Otherwise, sign in to check your account status.";

function MessageFallback() {
  return <p className="mt-3 text-sm leading-relaxed text-slate-500">{defaultMessage}</p>;
}

async function VerificationMessage({
  searchParams,
}: Pick<VerifyEmailPageProps, "searchParams">) {
  const query = await searchParams;
  const message = query.error
    ? "We couldn't confirm the verification link. Try signing in to check your account status. Access remains unavailable until OPORA confirms your email."
    : defaultMessage;

  return <p className="mt-3 text-sm leading-relaxed text-slate-500">{message}</p>;
}

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  return (
    <AuthShell>
      <div className="flex flex-1 flex-col">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Verify your email</h1>
        <Suspense fallback={<MessageFallback />}>
          <VerificationMessage searchParams={searchParams} />
        </Suspense>
        <Link href="/login" className="mt-7 inline-flex justify-center rounded-2xl bg-[#4A1525] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#350F1B]">Continue to login</Link>
      </div>
    </AuthShell>
  );
}
