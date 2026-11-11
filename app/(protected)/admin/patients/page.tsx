import { Suspense } from "react";
import { redirect } from "next/navigation";

import PatientList, {
  type PatientListItem,
} from "@/components/admin/patient-list";
import { AuthorizationError, requireAdmin } from "@/lib/authorization";
import { searchPatientRecords } from "@/lib/admin-patient-management.mjs";
import prisma from "@/lib/prisma";
import styles from "@/components/admin/admin-desktop.module.css";

type PageProps = {
  searchParams: Promise<{ page?: string | string[]; search?: string | string[] }>;
};

function LoadingFallback() {
  return (
    <div className="admin-management-page mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading patient records…</p>
      </div>
    </div>
  );
}

export default function AdminPatientsPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminPatientsContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function AdminPatientsContent({ searchParams }: PageProps) {
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

  const result = await searchPatientRecords({
    requireAdmin: async () => admin,
    prisma,
    search: searchParam ?? null,
    page: pageParam ?? 1,
    pageSize: 10,
  });

  const rawPatients: PatientListItem[] =
    result.status === "success" ? result.patients : [];
  const patients: PatientListItem[] = rawPatients.map((p) => ({
    patientID: p.patientID,
    userID: p.userID,
    icNumber: p.icNumber,
    dateOfBirth: p.dateOfBirth,
    gender: p.gender,
    address: p.address,
    bloodType: p.bloodType,
    emergencyContact: p.emergencyContact,
    user: {
      id: p.user.id,
      fullName: p.user.fullName,
      email: p.user.email,
      phoneNo: p.user.phoneNo,
      accountStatus: p.user.accountStatus,
      emailVerified: p.user.emailVerified,
      dateRegistered: p.user.dateRegistered,
    },
    _count: {
      symptomRecords: p._count.symptomRecords,
      assessments: p._count.assessments,
      appointments: p._count.appointments,
      diagnoses: p._count.diagnoses,
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
          Patient Record Management
        </h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[#705660]">
          Search, review, update, deactivate, and manage patient accounts across the OPORA healthcare system.
        </p>
      </section>

      <PatientList
        patients={patients}
        total={total}
        currentPage={currentPage}
        pageCount={pageCount}
        searchQuery={searchParam ?? ""}
      />
    </div>
  );
}
