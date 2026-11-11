import { ASSESSMENT_SAFETY_COPY } from "@/lib/assessment-safety-copy.mjs";

export function AssessmentSafetyNotice() {
  return (
    <aside className="rounded-2xl border border-[#D8C4A5] bg-[#FFFAEF] p-5 text-sm leading-6 text-[#5B4930]" aria-labelledby="assessment-safety-heading">
      <h2 id="assessment-safety-heading" className="font-extrabold text-[#4A3925]">Important health information</h2>
      <p className="mt-2">{ASSESSMENT_SAFETY_COPY.information}</p>
      <p className="mt-2">{ASSESSMENT_SAFETY_COPY.professionalCare}</p>
      <p className="mt-2 font-semibold">{ASSESSMENT_SAFETY_COPY.emergency}</p>
      <p className="mt-3 border-t border-[#E7D9C2] pt-2 text-xs text-[#66563D]">
        Emergency number sources: {ASSESSMENT_SAFETY_COPY.sources.map((source, index) => (
          <span key={source.href}>
            {index > 0 ? "; " : null}
            <a href={source.href} target="_blank" rel="noreferrer" className="font-semibold underline">{source.label}</a>
          </span>
        ))}
      </p>
    </aside>
  );
}
