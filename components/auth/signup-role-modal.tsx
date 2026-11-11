"use client";

import { useEffect } from "react";

type SignupRoleModalProps = {
    onClose: () => void;
    onSelectPatient: () => void;
    onSelectHealthcareProfessional: () => void;
};

export default function SignupRoleModal({
    onClose,
    onSelectPatient,
    onSelectHealthcareProfessional,
}: SignupRoleModalProps) {
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#230711]/60 p-4 backdrop-blur-[3px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="signup-role-title"
                aria-describedby="signup-role-description"
                className="relative w-full max-w-lg rounded-3xl border border-[#E5CDD3] bg-[#FDF7F8] p-5 shadow-[0_24px_80px_rgba(35,7,17,0.3)] sm:p-7"
            >
                {/* Close button */}
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close account type selection"
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[#7E2D43] transition hover:bg-[#F3DEE3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7E2D43]"
                >
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m6 6 12 12M18 6 6 18"
                        />
                    </svg>
                </button>

                {/* Modal heading */}
                <div className="mb-6 pr-8">
                    <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3DEE3] text-[#7E2D43]">
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                        >
                            <circle cx="9" cy="8" r="3.5" />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.5 20v-2a6.5 6.5 0 0 1 13 0v2M17 8h5m-2.5-2.5v5"
                            />
                        </svg>
                    </span>

                    <h2
                        id="signup-role-title"
                        className="text-2xl font-extrabold tracking-tight text-[#230711] sm:text-3xl"
                    >
                        Join OPORA
                    </h2>

                    <p
                        id="signup-role-description"
                        className="mt-2 text-sm leading-relaxed text-[#4A1525]/75"
                    >
                        Choose the account type that best describes you.
                    </p>
                </div>

                {/* Patient option */}
                <div className="rounded-2xl border border-[#E5CDD3] bg-white p-4 transition hover:border-[#C78393] sm:p-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F9EFF1] text-[#7E2D43]">
                            <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                            >
                                <circle cx="12" cy="7" r="4" />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 21v-2a8 8 0 0 1 16 0v2"
                                />
                            </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-[#4A1525]">
                                I&apos;m a Patient
                            </h3>
                            <p className="mt-1 text-sm leading-relaxed text-[#75666A]">
                                Manage your symptoms, health history and healthcare
                                connections.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onSelectPatient}
                        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#7E2D43] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4A1525] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7E2D43]/25 active:scale-[0.99]"
                    >
                        Continue as Patient
                        <span aria-hidden="true">→</span>
                    </button>
                </div>

                {/* Healthcare Professional option */}
                <div className="mt-4 rounded-2xl border border-[#E5CDD3] bg-white p-4 transition hover:border-[#C78393] sm:p-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F9EFF1] text-[#7E2D43]">
                            <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8 3h8a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3ZM12 10v4m-2-2h4"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M7 14v1a5 5 0 0 0 10 0v-1M12 20v1m-3 0h6"
                                />
                            </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-[#4A1525]">
                                I&apos;m a Healthcare Professional
                            </h3>
                            <p className="mt-1 text-sm leading-relaxed text-[#75666A]">
                                Register your professional credentials for administrator
                                verification.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onSelectHealthcareProfessional}
                        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#7E2D43] bg-white px-4 py-3 text-sm font-semibold text-[#7E2D43] transition hover:bg-[#F9EFF1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7E2D43]/20 active:scale-[0.99]"
                    >
                        Continue as Healthcare Professional
                        <span aria-hidden="true">→</span>
                    </button>
                </div>

                <p className="mt-5 text-center text-xs leading-relaxed text-[#75666A]">
                    Already have an account? Close this window to log in.
                </p>
            </section>
        </div>
    );
}
