"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SignupRoleModal from "@/components/auth/signup-role-modal";
import AdminLoginForm from "@/components/auth/admin-login-form";
import { signInRegularAction } from "@/app/(auth)/actions";
import { INITIAL_LOGIN_STATE } from "@/lib/login-state";

export default function LoginForm() {
  const router = useRouter();
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [loginState, loginAction, isPending] = useActionState(
    signInRegularAction,
    INITIAL_LOGIN_STATE,
  );

  useEffect(() => {
    const showAdminLoginForm = () => setShowAdminLogin(true);
    window.addEventListener("opora:show-admin-login", showAdminLoginForm);
    return () => window.removeEventListener("opora:show-admin-login", showAdminLoginForm);
  }, []);

  function handleCloseRoleModal() {
    setIsRoleModalOpen(false);
  }

  function handlePatientSignup() {
    setIsRoleModalOpen(false);
    router.push("/signup");
  }

  function handleHealthcareProfessionalSignup() {
    setIsRoleModalOpen(false);
    router.push("/signup/healthcare-professional");
  }

  const [showPassword, setShowPassword] = useState(false);

  if (showAdminLogin) {
    return <AdminLoginForm onBack={() => setShowAdminLogin(false)} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Log in
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Log in to continue to your OPORA account.
        </p>
      </div>

      <form action={loginAction} className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-slate-700"
          >
            Email address
          </label>

          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#A34F64]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </span>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email address"
              required
              className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-slate-700"
          >
            Password
          </label>

          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#A34F64]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <rect x="5" y="10" width="14" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
            </span>

            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#7E2D43] focus:ring-4 focus:ring-[#7E2D43]/10"
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition hover:text-[#7E2D43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7E2D43]"
            >
              {showPassword ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.1-2.2 3.2M6.2 6.2C3.7 7.7 2.5 10 2 12c1 2.5 4.5 7 10 7 1.2 0 2.3-.2 3.3-.6" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-[#7E2D43] transition hover:text-[#4A1525] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-2xl bg-[#4A1525] px-6 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-[#350F1B]/20 transition hover:bg-[#350F1B] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7E2D43]/25 active:scale-[0.99]"
        >
          {isPending ? "Signing in…" : "Log In"}
        </button>

        {loginState.message && (
          <p
            role="status"
            aria-live="polite"
            className="rounded-xl border border-[#E4BAC3] bg-[#FDF7F8] p-3 text-sm text-[#5C1E30]"
          >
            {loginState.message}
          </p>
        )}
      </form>

      <div className="mt-auto pt-8">
        <div className="border-t border-slate-100 pt-5 text-center">
          <p className="text-sm text-slate-500">
            New to OPORA?{" "}
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(true)}
              className="ml-1 font-bold text-[#7E2D43] transition hover:text-[#4A1525] hover:underline"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>

      {/* Account type selection popup */}
      {isRoleModalOpen && (
        <SignupRoleModal
          onClose={handleCloseRoleModal}
          onSelectPatient={handlePatientSignup}
          onSelectHealthcareProfessional={
            handleHealthcareProfessionalSignup
          }
        />
      )}
    </div>
  );
}

