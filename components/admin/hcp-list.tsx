"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Icon } from "@/components/ui/icon";

export type HcpListItem = {
  hcpID: number;
  userID: number;
  licenseNo: string;
  specialization: string;
  workplace: string;
  yearsOfExperience: number;
  verificationStatus: string;
  verifiedAt: Date | string | null;
  user: {
    id: number;
    fullName: string;
    email: string;
    phoneNo: string;
    accountStatus: string;
    emailVerified: boolean;
    dateRegistered: Date | string;
  };
  _count: {
    appointments: number;
    patientConsents: number;
  };
};

type Props = {
  hcps: HcpListItem[];
  total: number;
  currentPage: number;
  pageCount: number;
  searchQuery: string;
  activeStatus: string;
};

export default function HcpList({
  hcps,
  total,
  currentPage,
  pageCount,
  searchQuery,
  activeStatus,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [isPending, startTransition] = useTransition();

  function updateParams(newSearch?: string, newStatus?: string, newPage?: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (newSearch !== undefined) {
      if (newSearch.trim()) params.set("search", newSearch.trim());
      else params.delete("search");
    }
    if (newStatus !== undefined) {
      if (newStatus && newStatus !== "All") params.set("status", newStatus);
      else params.delete("status");
    }
    if (newPage !== undefined) {
      params.set("page", String(newPage));
    } else {
      params.set("page", "1");
    }
    startTransition(() => {
      router.push(`/admin/hcps?${params.toString()}`);
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams(searchTerm, undefined, 1);
  }

  const tabs = ["All", "Pending", "Approved", "Rejected"];

  return (
    <div className="admin-management-page space-y-5 sm:space-y-6">
      {/* Tabs and Search Bar */}
      <div className="admin-mobile-glass-panel space-y-4 rounded-3xl border border-[#E8D9DD] bg-white p-4 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-6">
        {/* Verification Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#F0E6E8] pb-4">
          <span className="mr-1 text-xs font-bold uppercase tracking-wider text-[#8A737A] sm:mr-2">
            Verification:
          </span>
          {tabs.map((tab) => {
            const isSelected = (activeStatus || "All") === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => updateParams(undefined, tab, 1)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  isSelected
                    ? "bg-[#6F1D35] text-white shadow-xs"
                    : "border border-[#E8D9DD] bg-white text-[#6F1D35] hover:bg-[#FCF9F7]"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by doctor name, email, license number, or specialization..."
              className="w-full rounded-xl border border-[#D8AAB5] bg-white px-4 py-2.5 text-sm font-medium text-[#29101A] shadow-sm transition placeholder:text-[#8A737A] focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6F1D35] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#57152A] disabled:opacity-50"
          >
            {isPending ? "Searching…" : "Search"}
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                updateParams("", undefined, 1);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E8D9DD] bg-white px-4 py-2.5 text-sm font-semibold text-[#6F1D35] hover:bg-[#FCF9F7]"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* HCP Table */}
      <div className="admin-mobile-glass-panel overflow-hidden rounded-3xl border border-[#E8D9DD] bg-white shadow-[0_3px_16px_rgba(70,20,39,0.04)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#F0E6E8] px-4 py-4 sm:px-6">
          <h2 className="text-base font-extrabold text-[#35101F]">
            Healthcare Professionals ({total})
          </h2>
          <span className="text-xs font-semibold text-[#8A737A]">
            Page {currentPage} of {pageCount}
          </span>
        </div>

        {hcps.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#FBF4F5] text-xl font-bold text-[#6F1D35]">
              <Icon name="hcp" className="h-6 w-6" />
            </div>
            <p className="text-base font-bold text-[#35101F]">No healthcare professional records found</p>
            <p className="mt-1 text-xs text-[#705660]">
              {searchQuery || activeStatus
                ? "Try adjusting your search criteria or status filter."
                : "No healthcare professionals have registered yet."}
            </p>
          </div>
        ) : (
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#F0E6E8] bg-[#FCF9F7] text-[11px] font-bold uppercase tracking-wider text-[#735762]">
                <tr>
                  <th className="px-6 py-3.5">Professional</th>
                  <th className="px-6 py-3.5">License No</th>
                  <th className="px-6 py-3.5">Specialization</th>
                  <th className="px-6 py-3.5">Workplace</th>
                  <th className="px-6 py-3.5">Verification</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6E8]">
                {hcps.map((h) => {
                  return (
                    <tr key={h.hcpID} className="transition hover:bg-[#FCF9F7]">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#35101F]">{h.user.fullName}</div>
                        <div className="text-xs text-[#705660]">{h.user.email}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-[#4F3540]">
                        {h.licenseNo}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#35101F]">
                        {h.specialization}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#705660]">
                        {h.workplace}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            h.verificationStatus === "Approved"
                              ? "bg-[#EDF6F0] text-[#28543A]"
                              : h.verificationStatus === "Pending"
                                ? "bg-[#FEF9E7] text-[#946C00]"
                                : "bg-[#FDF2F2] text-[#9B1C1C]"
                          }`}
                        >
                          {h.verificationStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            h.user.accountStatus === "ACTIVE"
                              ? "bg-[#EDF6F0] text-[#28543A]"
                              : "bg-[#FDF2F2] text-[#9B1C1C]"
                          }`}
                        >
                          {h.user.accountStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/hcps/${h.hcpID}`}
                          className="inline-flex items-center rounded-xl border border-[#D8AAB5] bg-white px-3.5 py-1.5 text-xs font-bold text-[#6F1D35] shadow-xs transition hover:bg-[#FBF4F5]"
                        >
                          Manage &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {hcps.length > 0 && (
          <ul className="grid gap-3 border-t border-[#F0E6E8] p-3 lg:hidden" aria-label="Healthcare professional records">
            {hcps.map((hcp) => {
              const verificationStyle = hcp.verificationStatus === "Approved"
                ? "bg-[#EDF6F0] text-[#28543A]"
                : hcp.verificationStatus === "Pending"
                  ? "bg-[#FEF9E7] text-[#946C00]"
                  : "bg-[#FDF2F2] text-[#9B1C1C]";
              const accountStyle = hcp.user.accountStatus === "ACTIVE"
                ? "bg-[#EDF6F0] text-[#28543A]"
                : "bg-[#FDF2F2] text-[#9B1C1C]";

              return (
                <li key={hcp.hcpID} className="admin-mobile-record-card rounded-2xl border border-[#E8D9DD] p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-[#35101F]">{hcp.user.fullName}</h3>
                      <p className="mt-1 break-all text-xs text-[#705660]">{hcp.user.email}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${verificationStyle}`}>
                      {hcp.verificationStatus}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-[#6F1D35]/10 pt-3 text-xs">
                    <div className="min-w-0">
                      <dt className="font-semibold text-[#8A737A]">License number</dt>
                      <dd className="mt-0.5 break-all font-mono text-[#4F3540]">{hcp.licenseNo}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="font-semibold text-[#8A737A]">Specialization</dt>
                      <dd className="mt-0.5 break-words font-medium text-[#35101F]">{hcp.specialization}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="font-semibold text-[#8A737A]">Workplace</dt>
                      <dd className="mt-0.5 break-words text-[#4F3540]">{hcp.workplace}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="font-semibold text-[#8A737A]">Phone</dt>
                      <dd className="mt-0.5 break-words text-[#4F3540]">{hcp.user.phoneNo || "Not provided"}</dd>
                    </div>
                    <div className="col-span-2 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#8A737A]">Account</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${accountStyle}`}>{hcp.user.accountStatus}</span>
                      <span className="text-[11px] text-[#705660]">{hcp.yearsOfExperience} years’ experience</span>
                    </div>
                  </dl>

                  <Link
                    href={`/admin/hcps/${hcp.hcpID}`}
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#D8AAB5] bg-white/80 px-3.5 py-2 text-xs font-bold text-[#6F1D35] shadow-xs transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35]"
                  >
                    Review professional <span className="ml-1" aria-hidden="true">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-[#F0E6E8] bg-[#FCF9F7] px-6 py-4">
            <button
              type="button"
              disabled={currentPage <= 1 || isPending}
              onClick={() => updateParams(undefined, undefined, currentPage - 1)}
              className="inline-flex items-center rounded-xl border border-[#E8D9DD] bg-white px-4 py-2 text-xs font-bold text-[#6F1D35] transition hover:bg-[#FCF9F7] disabled:opacity-40"
            >
              &larr; Previous
            </button>
            <span className="text-xs font-semibold text-[#705660]">
              Page {currentPage} of {pageCount}
            </span>
            <button
              type="button"
              disabled={currentPage >= pageCount || isPending}
              onClick={() => updateParams(undefined, undefined, currentPage + 1)}
              className="inline-flex items-center rounded-xl border border-[#E8D9DD] bg-white px-4 py-2 text-xs font-bold text-[#6F1D35] transition hover:bg-[#FCF9F7] disabled:opacity-40"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
