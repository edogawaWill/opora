import Link from "next/link";

import AuthShell from "@/components/auth/auth-shell";
import ForgotPasswordForm from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <div className="flex flex-1 flex-col">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-500">Enter the email address associated with your OPORA account.</p>
        <ForgotPasswordForm />
        <Link href="/login" className="mt-6 text-center text-sm font-semibold text-[#7E2D43] hover:underline">Back to login</Link>
      </div>
    </AuthShell>
  );
}
