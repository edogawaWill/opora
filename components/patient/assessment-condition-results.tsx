type RelatedSymptom = { symptomName: string; bodyPart: string };
type ConditionInformation = {
  diseaseID: number;
  diseaseName: string;
  description: string | null;
  causes: string | null;
  treatment: string | null;
  prevention: string | null;
  whenToSeekCare: string | null;
  relatedSymptoms: RelatedSymptom[];
};

export function AssessmentConditionResults({ diseases }: { diseases: ConditionInformation[] }) {
  return (
    <div className="space-y-5">
      {diseases.length === 0 ? (
        <section className="rounded-2xl border border-[#E8D9DD] bg-white p-5" role="status">
          <h2 className="text-lg font-extrabold text-[#45162A]">No related condition information found</h2>
          <p className="mt-2 text-sm leading-6 text-[#705660]">
            No related condition information was found in the current database for the symptoms you submitted. This does not mean that you are healthy or that you have no health concern.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-[#705660]">
            Each listed condition is linked in the database to at least one symptom you submitted. These links do not predict which condition you may have.
          </p>
          {diseases.map((disease) => (
            <article key={disease.diseaseID} className="rounded-2xl border border-[#E8D9DD] bg-white p-5 shadow-[0_2px_12px_rgba(70,20,39,0.04)] sm:p-6">
              <h2 className="text-xl font-extrabold text-[#45162A]">{disease.diseaseName}</h2>
              <InformationField label="Description" value={disease.description} />
              <InformationField label="Related symptoms" value={disease.relatedSymptoms.length ? disease.relatedSymptoms.map(({ symptomName, bodyPart }) => bodyPart ? `${symptomName} · ${bodyPart}` : symptomName).join(", ") : null} />
              <InformationField label="Causes" value={disease.causes} />
              <InformationField label="Treatment information" value={disease.treatment} />
              <InformationField label="Prevention information" value={disease.prevention} />
              <InformationField label="When to seek medical care" value={disease.whenToSeekCare} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function InformationField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <section className="mt-4 border-t border-[#F0E6E9] pt-3">
      <h3 className="text-sm font-bold text-[#4D303A]">{label}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#705660]">{value}</p>
    </section>
  );
}
