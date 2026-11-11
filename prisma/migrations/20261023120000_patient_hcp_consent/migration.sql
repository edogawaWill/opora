-- CreateTable
CREATE TABLE "PatientHcpConsent" (
    "consentID" SERIAL NOT NULL,
    "patientID" INTEGER NOT NULL,
    "hcpID" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "grantedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "PatientHcpConsent_pkey" PRIMARY KEY ("consentID"),
    CONSTRAINT "PatientHcpConsent_status_check" CHECK ("status" IN ('ACTIVE', 'REVOKED')),
    CONSTRAINT "PatientHcpConsent_timestamps_check" CHECK (
        ("status" = 'ACTIVE' AND "revokedAt" IS NULL) OR
        ("status" = 'REVOKED' AND "revokedAt" IS NOT NULL)
    )
);

-- Preserve grant/revoke cycles while allowing only one active grant per pair.
CREATE UNIQUE INDEX "PatientHcpConsent_one_active_per_pair_key"
    ON "PatientHcpConsent"("patientID", "hcpID")
    WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE INDEX "PatientHcpConsent_patientID_hcpID_idx" ON "PatientHcpConsent"("patientID", "hcpID");

-- CreateIndex
CREATE INDEX "PatientHcpConsent_hcpID_status_idx" ON "PatientHcpConsent"("hcpID", "status");

-- AddForeignKey
ALTER TABLE "PatientHcpConsent" ADD CONSTRAINT "PatientHcpConsent_patientID_fkey" FOREIGN KEY ("patientID") REFERENCES "Patient"("patientID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientHcpConsent" ADD CONSTRAINT "PatientHcpConsent_hcpID_fkey" FOREIGN KEY ("hcpID") REFERENCES "HealthcareProfessional"("hcpID") ON DELETE RESTRICT ON UPDATE CASCADE;
