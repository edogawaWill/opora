"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Icon } from "@/components/ui/icon";

export type DiseaseListItem = {
  diseaseID: number;
  diseaseName: string;
  description: string;
  lastUpdated: string;
  symptoms: Array<{
    symptomID: number;
    symptomName: string;
    bodyPart: string;
  }>;
};

type Props = {
  diseases: DiseaseListItem[];
  total: number;
  page: number;
  pageCount: number;
  query: string;
};

export default function PatientDiseaseList({
  diseases,
  total,
  page,
  pageCount,
  query,
}: Props) {
  const [searchTerm, setSearchTerm] = useState(query);

  // Client-side instant filter enhancement over the loaded diseases
  const filteredDiseases = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return diseases;
    return diseases.filter((d) => {
      const matchName = d.diseaseName.toLowerCase().includes(q);
      const matchDesc = d.description.toLowerCase().includes(q);
      const matchSymptom = d.symptoms.some((s) =>
        s.symptomName.toLowerCase().includes(q)
      );
      return matchName || matchDesc || matchSymptom;
    });
  }, [diseases, searchTerm]);

  function handleClear() {
    setSearchTerm("");
  }

  return (
    <div className="space-y-6">
      {/* Search Header Bar */}
      <section className="bg-white p-2.5 rounded-xl border border-[#EADDE0] shadow-xs">
        <form
          method="GET"
          action="/patient/diseases"
          className="flex flex-col sm:flex-row items-stretch gap-2 font-['Inter']"
        >
          <div className="relative flex-1 flex items-center bg-[#F6F3F1] rounded-lg px-3.5 py-2 border border-transparent focus-within:border-[#6F1D35] focus-within:bg-white transition-all">
            <Icon name="search" className="w-4 h-4 text-[#8A737A] mr-2.5 flex-shrink-0" />
            <label htmlFor="diseaseSearch" className="sr-only">
              Search by condition name, description, or symptoms
            </label>
            <input
              id="diseaseSearch"
              name="q"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by condition name, description, or symptoms (e.g. Cough, Asthma, Fever)…"
              className="w-full bg-transparent text-sm text-[#1B1C1B] placeholder-[#8A737A] focus:outline-none"
            />
            {searchTerm.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search query"
                className="text-[#8A737A] hover:text-[#6F1D35] p-1 transition-colors"
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-[#6F1D35] hover:bg-[#57152A] text-white font-['Manrope'] font-bold text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 transition-colors shadow-2xs"
          >
            <span>Search</span>
            <Icon name="arrow-right" className="w-4 h-4" />
          </button>
        </form>
      </section>

      {/* Index Heading Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-baseline gap-2">
          <span className="font-['Manrope'] text-base md:text-lg font-bold text-[#1B1C1B]">
            Catalog Index
          </span>
          <span className="font-['Inter'] text-xs text-[#8A737A]">
            Showing {filteredDiseases.length} condition{filteredDiseases.length === 1 ? "" : "s"}
          </span>
        </div>
        {query && (
          <Link
            href="/patient/diseases"
            className="text-xs font-['Inter'] font-semibold text-[#7E2D43] hover:underline"
          >
            Reset filter
          </Link>
        )}
      </div>

      {/* Disease Cards Grid */}
      {filteredDiseases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDiseases.map((disease) => {
            return (
              <article
                key={disease.diseaseID}
                className="group flex flex-col justify-between bg-white rounded-xl p-5 shadow-xs hover:shadow-sm border border-[#EADDE0] hover:border-[#DAC0C4] transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-[#F6F3F1] flex items-center justify-center text-[#6F1D35] group-hover:bg-[#EADDE0] transition-colors">
                        <Icon name="verified" className="w-4 h-4" />
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EADDE0]/60 text-[#7E2D43] font-['Inter'] text-[11px] font-semibold">
                        Condition Profile
                      </span>
                    </div>
                  </div>

                  <h2 className="font-['Manrope'] text-lg font-bold text-[#1B1C1B] group-hover:text-[#6F1D35] transition-colors mb-2 leading-snug">
                    {disease.diseaseName}
                  </h2>

                  <p className="font-['Inter'] text-xs text-[#544245] mb-4 line-clamp-3 leading-relaxed">
                    {disease.description}
                  </p>

                  {/* Associated Symptoms */}
                  <div className="mb-4">
                    <span className="font-['Manrope'] text-[10px] uppercase font-bold text-[#8A737A] block mb-1.5 tracking-wider">
                      Associated Symptoms
                    </span>
                    {disease.symptoms.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {disease.symptoms.slice(0, 4).map((symptom) => (
                          <span
                            key={symptom.symptomID}
                            className="px-2 py-0.5 rounded-md bg-[#F6F3F1] text-[#7E2D43] font-['Inter'] text-[11px] font-medium border border-[#EADDE0]/60"
                          >
                            {symptom.symptomName}
                          </span>
                        ))}
                        {disease.symptoms.length > 4 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-transparent text-[#8A737A] font-['Inter'] text-[11px]">
                            +{disease.symptoms.length - 4} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="font-['Inter'] text-[11px] text-[#8A737A]">
                        None documented
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-[#EADDE0]/60 flex items-center justify-between">
                  <span className="font-['Inter'] text-[11px] text-[#8A737A] flex items-center gap-1">
                    <Icon name="clock" className="w-3.5 h-3.5 text-[#8A737A]" />
                    <span>Catalog entry #{disease.diseaseID}</span>
                  </span>

                  <Link
                    href={`/patient/diseases/${disease.diseaseID}`}
                    className="inline-flex items-center gap-1 font-['Manrope'] text-xs font-bold text-[#6F1D35] hover:text-[#520420] transition-colors group-hover:translate-x-0.5 duration-150"
                  >
                    <span>View Information</span>
                    <Icon name="chevron-right" className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-[#EADDE0] p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F6F3F1] text-[#7E2D43] mx-auto flex items-center justify-center">
            <Icon name="search" className="w-6 h-6" />
          </div>
          <h3 className="font-['Manrope'] text-base font-bold text-[#1B1C1B]">
            No matching conditions found
          </h3>
          <p className="font-['Inter'] text-xs text-[#544245] max-w-sm mx-auto">
            We couldn&apos;t find any conditions matching &ldquo;{searchTerm}&rdquo;. Try searching with a different term such as &ldquo;cough&rdquo;, &ldquo;fever&rdquo;, or &ldquo;cold&rdquo;.
          </p>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 text-xs font-['Manrope'] font-bold text-[#6F1D35] hover:underline pt-2"
          >
            <span>Clear search and view all conditions</span>
          </button>
        </div>
      )}

      {/* Pagination - Rendered only when pageCount > 1 */}
      {pageCount > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#EADDE0] shadow-2xs font-['Inter'] text-xs">
          <span className="text-[#544245]">
            Page <strong className="text-[#1B1C1B]">{page}</strong> of{" "}
            <strong className="text-[#1B1C1B]">{pageCount}</strong> ({total} total entries)
          </span>

          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={`/patient/diseases?page=${page - 1}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                className="px-3 py-1.5 rounded-lg border border-[#EADDE0] hover:bg-[#F6F3F1] text-[#544245] font-semibold transition-colors"
              >
                Previous
              </Link>
            )}
            {page < pageCount && (
              <Link
                href={`/patient/diseases?page=${page + 1}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                className="px-3 py-1.5 rounded-lg bg-[#6F1D35] hover:bg-[#57152A] text-white font-semibold transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
