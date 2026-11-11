import Image from "next/image";
import type { ReactNode } from "react";

type RegistrationShellProps = {
    children: ReactNode;
    variant?: "patient" | "hcp";
};

export default function RegistrationShell({
    children,
    variant = "patient",
}: RegistrationShellProps) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FCF9FA] via-[#F8F3F5] to-[#F5EFF2] p-3 sm:p-5 lg:p-6">
            <section className="relative flex min-h-[calc(100vh-24px)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-[#F0DFE3] bg-[#FDF7F8] shadow-[0_30px_80px_-15px_rgba(45,12,23,0.22)] sm:min-h-[calc(100vh-40px)] lg:h-[640px] lg:min-h-0 lg:max-h-[calc(100vh-48px)] lg:flex-row lg:rounded-[32px]">

                {/* Scrollable registration form panel */}
                <section className="relative z-20 w-full bg-[#FDF7F8] p-6 sm:p-8 md:p-10 lg:h-full lg:w-[58%] lg:shrink-0 lg:overflow-y-auto lg:p-10 xl:p-12">
                    <a
                        href="/login"
                        aria-label="OPORA login page"
                        className="flex w-fit items-center gap-3"
                    >
                        {/* Use the existing OPORA emblem asset */}

                        <Image
                            src="/images/opora-logo.png"
                            alt=""
                            width={48}
                            height={40}
                            priority
                            className="h-10 w-12 shrink-0 object-contain"
                        />

                        <span className="text-2xl font-extrabold tracking-[0.08em] text-[#4A1525]">
                            OPORA
                        </span>
                    </a>

                    <div className="mt-8">
                        {children}
                    </div>
                </section>

                {/* Fixed desktop branding panel */}
                <section className="relative hidden h-full min-h-0 w-[42%] shrink-0 flex-col justify-end overflow-hidden bg-[#230711] p-8 text-white lg:flex xl:p-10">

                    {/* Hospital photograph */}
                    <div aria-hidden="true" className="absolute inset-0">
                        <Image
                            src="/images/auth-panel.jpg"
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 42vw, 0px"
                            className="object-cover object-center opacity-45"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-[#230711]/90 via-[#4A1525]/55 to-[#230711]/55" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#230711]/20 to-[#230711]/70" />
                    </div>

                    {/* Layered burgundy paper-cut curves */}
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 100 800"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute inset-y-0 left-0 z-10 h-full w-5 fill-[#230711]"
                    >
                        <path d="M0,0 C35,160 5,280 40,420 C75,560 10,680 0,800 L0,0 Z" />
                    </svg>

                    <svg
                        aria-hidden="true"
                        viewBox="0 0 100 800"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute inset-y-0 left-0 z-10 h-full w-8 fill-[#4A1525]"
                    >
                        <path d="M0,0 C45,150 15,270 48,410 C80,550 20,690 0,800 L0,0 Z" />
                    </svg>

                    <svg
                        aria-hidden="true"
                        viewBox="0 0 100 800"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute inset-y-0 left-0 z-10 h-full w-11 fill-[#C78393]"
                    >
                        <path d="M0,0 C50,140 25,260 52,400 C82,540 28,700 0,800 L0,0 Z" />
                    </svg>

                    <svg
                        aria-hidden="true"
                        viewBox="0 0 100 800"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute inset-y-0 left-0 z-10 h-full w-14 fill-[#FDF7F8]"
                    >
                        <path d="M0,0 C55,130 30,250 55,390 C85,530 35,710 0,800 L0,0 Z" />
                    </svg>

                    {/* Branding content stays fixed while the form scrolls */}
                    <div className="relative z-20 mt-auto pl-10 xl:pl-12">
                        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#F3DEE3] shadow-lg backdrop-blur-sm">
                            <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M20.8 8.7c0 5.1-8.8 10.1-8.8 10.1S3.2 13.8 3.2 8.7a4.5 4.5 0 0 1 8.8-1.3 4.5 4.5 0 0 1 8.8 1.3Z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M7 11h3l1.5-3 2.2 6 1.5-3H17"
                                />
                            </svg>
                        </div>

                        <h2 className="text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
                            {variant === "hcp" ? (
                                <>
                                    Empower better care.
                                    <br />
                                    <span className="text-[#F3DEE3]">
                                        Connect with your patients.
                                    </span>
                                </>
                            ) : (
                                <>
                                    Know your symptoms.
                                    <br />
                                    <span className="text-[#F3DEE3]">
                                        Reach your doctor sooner.
                                    </span>
                                </>
                            )}
                        </h2>

                        <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80 xl:text-base">
                            {variant === "hcp"
                                ? "Access relevant patient information, manage appointments, and communicate with patients through OPORA."
                                : "Your symptoms, health history, and healthcare connections in one place."}
                        </p>

                        <div className="mt-8 space-y-3 border-t border-white/15 pt-5 text-xs leading-relaxed text-white/75">
                            {variant === "hcp" ? (
                                <>
                                    <p className="flex items-start gap-2.5">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C78393]" />
                                        Professional credentials reviewed before verified access
                                    </p>

                                    <p className="flex items-start gap-2.5">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C78393]" />
                                        Communication with authorised patients
                                    </p>

                                    <p className="flex items-start gap-2.5">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C78393]" />
                                        Patient information accessed according to role permissions
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="flex items-start gap-2.5">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C78393]" />
                                        Comprehensive symptom and health history tracking
                                    </p>

                                    <p className="flex items-start gap-2.5">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C78393]" />
                                        Communication with healthcare professionals
                                    </p>

                                    <p className="flex items-start gap-2.5">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C78393]" />
                                        Personal health information in one place
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </section>
            </section>
        </main>
    );
}
