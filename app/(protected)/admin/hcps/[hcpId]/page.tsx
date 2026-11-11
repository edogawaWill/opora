import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import HcpDetail, {
  type HcpDetailData,
} from "@/components/admin/hcp-detail";
import { Icon } from "@/components/ui/icon";
import { AuthorizationError, requireAdmin } from "@/lib/authorization";
import { getHcpDetail } from "@/lib/admin-hcp-management.mjs";
import prisma from "@/lib/prisma";

type PageProps = {
  params: Promise<{ hcpId: string }>;
};

function LoadingFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#EADDE0] bg-white p-8">
        <p className="text-sm font-semibold text-[#7E2D43]">Loading professional detail…</p>
      </div>
    </div>
  );
}

export default function AdminHcpDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminHcpDetailContent params={props.params} />
    </Suspense>
  );
}

async function AdminHcpDetailContent({ params }: PageProps) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/account");
    throw error;
  }

  const { hcpId } = await params;
  const parsedID = Number(hcpId);
  if (!Number.isSafeInteger(parsedID) || parsedID <= 0) {
    notFound();
  }

  const result = await getHcpDetail({
    requireAdmin: async () => admin,
    prisma,
    hcpID: parsedID,
  });

  if (result.status !== "success" || !result.hcp) {
    notFound();
  }

  const hcpData: HcpDetailData = {
    hcpID: result.hcp.hcpID,
    userID: result.hcp.userID,
    licenseNo: result.hcp.licenseNo,
    specialization: result.hcp.specialization,
    workplace: result.hcp.workplace,
    yearsOfExperience: result.hcp.yearsOfExperience,
    verificationStatus: result.hcp.verificationStatus,
    verifiedAt: result.hcp.verifiedAt,
    verifiedBy: result.hcp.verifiedBy,
    verifier: result.hcp.verifier
      ? {
          adminID: result.hcp.verifier.adminID,
          user: { fullName: result.hcp.verifier.user.fullName },
        }
      : null,
    user: {
      id: result.hcp.user.id,
      fullName: result.hcp.user.fullName,
      email: result.hcp.user.email,
      phoneNo: result.hcp.user.phoneNo,
      accountStatus: result.hcp.user.accountStatus,
      emailVerified: result.hcp.user.emailVerified,
      dateRegistered: result.hcp.user.dateRegistered,
      updatedAt: result.hcp.user.updatedAt,
    },
    _count: {
      appointments: result.hcp._count.appointments,
      patientConsents: result.hcp._count.patientConsents,
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page contextual action */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin/hcps"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#6F1D35] hover:text-[#57152A] transition-colors"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          Back to Healthcare Professionals
        </Link>
      </div>

      <HcpDetail hcp={hcpData} />
    </div>
  );
}
