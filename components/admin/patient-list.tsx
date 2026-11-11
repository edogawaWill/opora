"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export type PatientListItem = {
  patientID: number;
  userID: number;
  icNumber: string;
  dateOfBirth: Date | string;
  gender: string;
  address: string;
  bloodType: string | null;
  emergencyContact: string | null;
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
    symptomRecords: number;
    assessments: number;
    appointments: number;
    diagnoses: number;
  };
};

type Props = {
  patients: PatientListItem[];
  total: number;
  currentPage: number;
  pageCount: number;
  searchQuery: string;
};

export default function PatientList({
  patients,
  total,
  currentPage,
  pageCount,
  searchQuery,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`/admin/patients?${params.toString()}`);
    });
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    startTransition(() => {
      router.push(`/admin/patients?${params.toString()}`);
    });
  }

  return (
    <div className="admin-management-page space-y-5 sm:space-y-6">
      {/* Search and Filters Bar */}
      <div className="admin-mobile-glass-panel rounded-3xl border border-[#E8D9DD] bg-white p-4 shadow-[0_3px_16px_rgba(70,20,39,0.04)] sm:p-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, IC number, or phone..."
              className="w-full rounded-xl border border-[#D8AAB5] bg-white px-4 py-2.5 text-sm font-medium text-[#29101A] shadow-sm transition placeholder:text-[#8A737A] focus:border-[#7E2D43] focus:outline-none focus:ring-2 focus:ring-[#7E2D43]/20"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6F1D35] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#57152A] disabled:opacity-50"
          >
            {isPending ? "Searching…" : "Search records"}
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                router.push("/admin/patients");
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E8D9DD] bg-white px-4 py-2.5 text-sm font-semibold text-[#6F1D35] hover:bg-[#FCF9F7]"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Patient Records Table */}
      <div className="admin-mobile-glass-panel overflow-hidden rounded-3xl border border-[#E8D9DD] bg-white shadow-[0_3px_16px_rgba(70,20,39,0.04)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#F0E6E8] px-4 py-4 sm:px-6">
          <h2 className="text-base font-extrabold text-[#35101F]">
            Registered Patients ({total})
          </h2>
          <span className="text-xs font-semibold text-[#8A737A]">
            Page {currentPage} of {pageCount}
          </span>
        </div>

        {patients.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#FBF4F5] text-xl font-bold text-[#6F1D35]">
              👥
            </div>
            <p className="text-base font-bold text-[#35101F]">No patient records found</p>
            <p className="mt-1 text-xs text-[#705660]">
              {searchQuery
                ? `No patients match the search query "${searchQuery}".`
                : "No patient accounts have been registered yet."}
            </p>
          </div>
        ) : (
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#F0E6E8] bg-[#FCF9F7] text-[11px] font-bold uppercase tracking-wider text-[#735762]">
                <tr>
                  <th className="px-6 py-3.5">Patient</th>
                  <th className="px-6 py-3.5">IC Number</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Account Status</th>
                  <th className="px-6 py-3.5">Records</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6E8]">
                {patients.map((p) => {
                  const totalRecords =
                    p._count.symptomRecords +
                    p._count.assessments +
                    p._count.appointments;
                  return (
                    <tr key={p.patientID} className="transition hover:bg-[#FCF9F7]">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#35101F]">{p.user.fullName}</div>
                        <div className="text-xs text-[#705660]">{p.user.email}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-[#4F3540]">
                        {p.icNumber}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#4F3540]">{p.user.phoneNo}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            p.user.accountStatus === "ACTIVE"
                              ? "bg-[#EDF6F0] text-[#28543A]"
                              : p.user.accountStatus === "DISABLED"
                                ? "bg-[#FDF2F2] text-[#9B1C1C]"
                                : "bg-[#FEF9E7] text-[#946C00]"
                          }`}
                        >
                          {p.user.accountStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#705660]">
                        <span className="font-semibold text-[#35101F]">{totalRecords}</span> entries
                        <span className="block text-[11px] text-[#8A737A]">
                          {p._count.symptomRecords} logs · {p._count.appointments} appts
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/patients/${p.patientID}`}
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

        {patients.length > 0 && (
          <ul className="grid gap-3 border-t border-[#F0E6E8] p-3 lg:hidden" aria-label="Patient records">
            {patients.map((p) => {
              const totalRecords = p._count.symptomRecords + p._count.assessments + p._count.appointments;
              const statusStyle = p.user.accountStatus === "ACTIVE"
                ? "bg-[#EDF6F0] text-[#28543A]"
                : p.user.accountStatus === "DISABLED"
                  ? "bg-[#FDF2F2] text-[#9B1C1C]"
                  : "bg-[#FEF9E7] text-[#946C00]";

              return (
                <li key={p.patientID} className="admin-mobile-record-card rounded-2xl border border-[#E8D9DD] p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-[#35101F]">{p.user.fullName}</h3>
                      <p className="mt-1 break-all text-xs text-[#705660]">{p.user.email}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyle}`}>
                      {p.user.accountStatus}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-[#6F1D35]/10 pt-3 text-xs">
                    <div className="min-w-0">
                      <dt className="font-semibold text-[#8A737A]">IC Number</dt>
                      <dd className="mt-0.5 break-all font-mono text-[#4F3540]">{p.icNumber}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="font-semibold text-[#8A737A]">Phone</dt>
                      <dd className="mt-0.5 break-words text-[#4F3540]">{p.user.phoneNo || "Not provided"}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="font-semibold text-[#8A737A]">Records</dt>
                      <dd className="mt-0.5 text-[#4F3540]">
                        <span className="font-semibold text-[#35101F]">{totalRecords}</span> entries
                        <span className="text-[#705660]"> · {p._count.symptomRecords} symptom logs · {p._count.assessments} assessments · {p._count.appointments} appointments</span>
                      </dd>
                    </div>
                  </dl>

                  <Link
                    href={`/admin/patients/${p.patientID}`}
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#D8AAB5] bg-white/80 px-3.5 py-2 text-xs font-bold text-[#6F1D35] shadow-xs transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6F1D35]"
                  >
                    Manage patient <span className="ml-1" aria-hidden="true">→</span>
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
              onClick={() => handlePageChange(currentPage - 1)}
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
              onClick={() => handlePageChange(currentPage + 1)}
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
