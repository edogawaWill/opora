import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { OporaLogo } from "@/components/brand/opora-logo";
import { HcpBottomNavigation, HcpHeader, HcpFooter, type HcpNavUser } from "@/components/hcp/hcp-shell";
import { HcpDesktopBackground, HcpMobileBackground } from "@/components/hcp/hcp-mobile-background";
import styles from "@/components/hcp/hcp-desktop.module.css";
import { AuthorizationError, requireHcpAccount } from "@/lib/authorization";
import { loadUnreadCount } from "@/lib/message-service.mjs";
import prisma from "@/lib/prisma";

export default function HcpLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={`min-h-screen flex flex-col bg-[#FCF9F7] text-[#1B1C1B] ${styles.portalShell}`}>
      <Suspense fallback={<HcpShellLoadingFallback />}>
        <AuthenticatedHcpShell>{children}</AuthenticatedHcpShell>
      </Suspense>
    </div>
  );
}

async function AuthenticatedHcpShell({
  children,
}: {
  children: ReactNode;
}) {
  let principal;
  try {
    principal = await requireHcpAccount();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  let totalUnread: number | null = null;
  try {
    const unreadResult = await loadUnreadCount({
      requireUser: async () => principal,
      prisma,
    });
    if (unreadResult.status === "success") {
      totalUnread = unreadResult.status === "success" ? unreadResult.count : null;
    } else totalUnread = null;
  } catch {
    totalUnread = null;
  }

  let specialization: string | null = null;
  try {
    const hcpProfile = await prisma.healthcareProfessional.findUnique({
      where: { userID: principal.userId },
      select: { specialization: true },
    });
    specialization = hcpProfile?.specialization ?? null;
  } catch {
    specialization = null;
  }

  const navUser: HcpNavUser = {
    fullName: principal.fullName,
    email: principal.email,
    specialization,
    totalUnread,
  };

  return (
    <>
      <HcpMobileBackground />
      <HcpDesktopBackground />
      <HcpHeader user={navUser} />
      <div className={`hcp-mobile-content ${styles.desktopContent} flex-1 pt-16`}>
        {children}
      </div>
      <HcpFooter />
      <HcpBottomNavigation user={navUser} />
    </>
  );
}

function HcpShellLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FCF9F7] text-[#1B1C1B]">
      <header className="fixed top-0 left-0 right-0 w-full z-40 bg-[#FCF9F7]/95 backdrop-blur-md border-b border-[#EADDE0]">
        <div className="h-16 max-w-[1240px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
          <OporaLogo size="md" subtitle="CLINICAL PORTAL" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#EADDE0]/50 animate-pulse" />
          </div>
        </div>
      </header>
      <div className="flex-1 pt-16 flex items-center justify-center p-8">
        <div className="rounded-xl border border-[#EADDE0] bg-white p-6 max-w-sm w-full text-center space-y-2 shadow-xs">
          <div className="w-6 h-6 border-2 border-[#6F1D35] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-['Inter'] text-xs font-semibold text-[#7E2D43]">
            Verifying professional credentials…
          </p>
        </div>
      </div>
      <footer className="w-full bg-[#F6F3F1] border-t border-[#EADDE0] py-6 text-[#8A737A] font-['Inter'] text-xs text-center">
        <span>© 2026 OPORA. All rights reserved.</span>
      </footer>
    </div>
  );
}
