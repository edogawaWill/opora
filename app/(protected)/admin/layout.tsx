import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { OporaLogo } from "@/components/brand/opora-logo";
import { AdminHeader, AdminFooter, AdminMobileBottomNavigation, type AdminNavUser } from "@/components/admin/admin-shell";
import { AuthorizationError, requireAdmin } from "@/lib/authorization";
import { getHcpMobileBackground } from "@/lib/patient-mobile-backgrounds";
import { getPatientDesktopBackgroundPresentation } from "@/lib/patient-mobile-background-utils.mjs";
import prisma from "@/lib/prisma";
import styles from "@/components/admin/admin-desktop.module.css";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={`min-h-screen flex flex-col bg-[#FCF9F7] text-[#1B1C1B] ${styles.adminPortal}`}>
      <Suspense fallback={<AdminShellLoadingFallback />}>
        <AuthenticatedAdminShell>{children}</AuthenticatedAdminShell>
      </Suspense>
    </div>
  );
}

async function AuthenticatedAdminShell({
  children,
}: {
  children: ReactNode;
}) {
  let principal;
  try {
    principal = await requireAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const navUser: AdminNavUser = {
    fullName: principal.fullName,
    email: principal.email,
    role: principal.role,
  };

  let pendingHcpCount: number | null = null;
  try {
    pendingHcpCount = await prisma.healthcareProfessional.count({
      where: { verificationStatus: "Pending" },
    });
  } catch {
    pendingHcpCount = null;
  }

  const backgroundPhoto = getHcpMobileBackground("hcp-dashboard");
  const backgroundPresentation = getPatientDesktopBackgroundPresentation(backgroundPhoto);

  return (
    <>
      <div
        className={styles.desktopBackground}
        aria-hidden="true"
        style={{
          backgroundImage: backgroundPresentation.backgroundImage,
          backgroundPosition: backgroundPresentation.backgroundPosition,
        }}
      />
      <AdminHeader user={navUser} pendingHcpCount={pendingHcpCount} />
      <div className={`admin-mobile-content ${styles.adminContent} flex-1 pt-16`}>{children}</div>
      <AdminFooter photoCredit={backgroundPresentation.photo ?? null} />
      <AdminMobileBottomNavigation />
    </>
  );
}

function AdminShellLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FCF9F7] text-[#1B1C1B]">
      <header className="fixed top-0 left-0 right-0 w-full z-40 bg-[#FCF9F7]/95 backdrop-blur-md border-b border-[#EADDE0]">
        <div className="h-16 max-w-[1240px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
          <OporaLogo size="md" subtitle="ADMINISTRATION" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#EADDE0]/50 animate-pulse" />
          </div>
        </div>
      </header>
      <div className="flex-1 pt-16 flex items-center justify-center p-8">
        <div className="rounded-xl border border-[#EADDE0] bg-white p-6 max-w-sm w-full text-center space-y-2 shadow-xs">
          <div className="w-6 h-6 border-2 border-[#6F1D35] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-['Inter'] text-xs font-semibold text-[#7E2D43]">
            Verifying administration access…
          </p>
        </div>
      </div>
      <footer className="w-full bg-[#F6F3F1] border-t border-[#EADDE0] py-6 text-[#8A737A] font-['Inter'] text-xs text-center">
        <span>© 2026 OPORA. All rights reserved.</span>
      </footer>
    </div>
  );
}
