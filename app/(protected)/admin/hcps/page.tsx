import { Suspense } from "react";
import { redirect } from "next/navigation";

import HcpList, {
  type HcpListItem,
} from "@/components/admin/hcp-list";
import { AuthorizationError, requireAdmin } from "@/lib/authorization";
import { searchHcpRecords } from "@/lib/admin-hcp-management.mjs";
import prisma from "@/lib/prisma";
import styles from "@/components/admin/admin-desktop.module.css";

type PageProps = {
  searchParams: Promise<{
    page?: string | string[];
    search?: string | string[];
    status?: string | string[];
  }>;
};

function LoadingFallback() {
  return (
    <div className="admin-management-page mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading healthcare professionals…</p>
      </div>
    </div>
  );
}

export default function AdminHcpsPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminHcpsContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function AdminHcpsContent({ searchParams }: PageProps) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const query = await searchParams;
  const pageParam = Array.isArray(query.page) ? query.page[0] : query.page;
  const searchParam = Array.isArray(query.search) ? query.search[0] : query.search;
  const statusParam = Array.isArray(query.status) ? query.status[0] : query.status;

  const result = await searchHcpRecords({
    requireAdmin: async () => admin,
    prisma,
    search: searchParam ?? null,
    verificationStatus: statusParam ?? null,
    page: pageParam ?? 1,
    pageSize: 10,
  });

  const rawHcps: HcpListItem[] =
    result.status === "success" ? result.hcps : [];
  const hcps: HcpListItem[] = rawHcps.map((h) => ({
    hcpID: h.hcpID,
    userID: h.userID,
    licenseNo: h.licenseNo,
    specialization: h.specialization,
    workplace: h.workplace,
    yearsOfExperience: h.yearsOfExperience,
    verificationStatus: h.verificationStatus,
    verifiedAt: h.verifiedAt,
    user: {
      id: h.user.id,
      fullName: h.user.fullName,
      email: h.user.email,
      phoneNo: h.user.phoneNo,
      accountStatus: h.user.accountStatus,
      emailVerified: h.user.emailVerified,
      dateRegistered: h.user.dateRegistered,
    },
    _count: {
      appointments: h._count.appointments,
      patientConsents: h._count.patientConsents,
    },
  }));

  const total = result.status === "success" ? result.total : 0;
  const currentPage = result.status === "success" ? result.page : 1;
  const pageCount = result.status === "success" ? result.pageCount : 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className={`mb-6 ${styles.pageIntro}`}>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A3D53]">Administrative Management</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1B1C1B] sm:text-4xl font-headline">
          Healthcare Professional Management
        </h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[#705660]">
          Review, verify, update credentials, change account statuses, and manage healthcare professional records across the system.
        </p>
      </section>

      <HcpList
        hcps={hcps}
        total={total}
        currentPage={currentPage}
        pageCount={pageCount}
        searchQuery={searchParam ?? ""}
        activeStatus={statusParam ?? "All"}
      />
    </div>
  );
}
