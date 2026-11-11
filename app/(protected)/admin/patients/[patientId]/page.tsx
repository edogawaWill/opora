import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import PatientDetail, {
  type PatientDetailData,
} from "@/components/admin/patient-detail";
import { Icon } from "@/components/ui/icon";
import { AuthorizationError, requireAdmin } from "@/lib/authorization";
import { getPatientDetail } from "@/lib/admin-patient-management.mjs";
import prisma from "@/lib/prisma";

type PageProps = {
  params: Promise<{ patientId: string }>;
};

function LoadingFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading patient detail…</p>
      </div>
    </div>
  );
}

export default function AdminPatientDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminPatientDetailContent params={props.params} />
    </Suspense>
  );
}

async function AdminPatientDetailContent({ params }: PageProps) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const { patientId } = await params;
  const parsedID = Number(patientId);
  if (!Number.isSafeInteger(parsedID) || parsedID <= 0) {
    notFound();
  }

  const result = await getPatientDetail({
    requireAdmin: async () => admin,
    prisma,
    patientID: parsedID,
  });

  if (result.status !== "success" || !result.patient) {
    notFound();
  }

  const patientData: PatientDetailData = {
    patientID: result.patient.patientID,
    userID: result.patient.userID,
    icNumber: result.patient.icNumber,
    dateOfBirth: result.patient.dateOfBirth,
    gender: result.patient.gender,
    address: result.patient.address,
    bloodType: result.patient.bloodType,
    allergies: result.patient.allergies,
    emergencyContact: result.patient.emergencyContact,
    user: {
      id: result.patient.user.id,
      fullName: result.patient.user.fullName,
      email: result.patient.user.email,
      phoneNo: result.patient.user.phoneNo,
      accountStatus: result.patient.user.accountStatus,
      emailVerified: result.patient.user.emailVerified,
      dateRegistered: result.patient.user.dateRegistered,
      updatedAt: result.patient.user.updatedAt,
    },
    _count: {
      symptomRecords: result.patient._count.symptomRecords,
      assessments: result.patient._count.assessments,
      appointments: result.patient._count.appointments,
      diagnoses: result.patient._count.diagnoses,
      hcpConsents: result.patient._count.hcpConsents,
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page contextual action */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin/patients"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#6F1D35] hover:text-[#57152A] transition-colors"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          Back to Patient Management
        </Link>
      </div>

      <PatientDetail patient={patientData} />
    </div>
  );
}
