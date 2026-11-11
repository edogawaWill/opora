-- CreateTable
CREATE TABLE "User" (
    "userID" SERIAL NOT NULL,
    "fullName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "phoneNo" VARCHAR(15) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "accountStatus" VARCHAR(20) NOT NULL,
    "dateRegistered" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userID")
);

-- CreateTable
CREATE TABLE "Patient" (
    "patientID" SERIAL NOT NULL,
    "userID" INTEGER NOT NULL,
    "icNumber" VARCHAR(14) NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "gender" VARCHAR(10) NOT NULL,
    "address" TEXT NOT NULL,
    "bloodType" VARCHAR(3),
    "allergies" TEXT,
    "emergencyContact" VARCHAR(100),

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("patientID")
);

-- CreateTable
CREATE TABLE "HealthcareProfessional" (
    "hcpID" SERIAL NOT NULL,
    "userID" INTEGER NOT NULL,
    "licenseNo" VARCHAR(20) NOT NULL,
    "specialization" VARCHAR(60) NOT NULL,
    "workplace" VARCHAR(120) NOT NULL,
    "yearsOfExperience" INTEGER NOT NULL,
    "verificationStatus" VARCHAR(20) NOT NULL DEFAULT 'Pending',
    "verifiedBy" INTEGER,

    CONSTRAINT "HealthcareProfessional_pkey" PRIMARY KEY ("hcpID")
);

-- CreateTable
CREATE TABLE "Admin" (
    "adminID" SERIAL NOT NULL,
    "userID" INTEGER NOT NULL,
    "position" VARCHAR(50) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("adminID")
);

-- CreateTable
CREATE TABLE "Symptom" (
    "symptomID" SERIAL NOT NULL,
    "symptomName" VARCHAR(80) NOT NULL,
    "bodyPart" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Symptom_pkey" PRIMARY KEY ("symptomID")
);

-- CreateTable
CREATE TABLE "SymptomRecord" (
    "recordID" SERIAL NOT NULL,
    "patientID" INTEGER NOT NULL,
    "symptomID" INTEGER NOT NULL,
    "severity" INTEGER NOT NULL,
    "onsetDate" DATE NOT NULL,
    "duration" VARCHAR(30) NOT NULL,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SymptomRecord_pkey" PRIMARY KEY ("recordID"),
    CONSTRAINT "SymptomRecord_severity_check"
        CHECK ("severity" BETWEEN 1 AND 10)
);

-- CreateTable
CREATE TABLE "Disease" (
    "diseaseID" SERIAL NOT NULL,
    "diseaseName" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "causes" TEXT NOT NULL,
    "treatment" TEXT NOT NULL,
    "prevention" TEXT NOT NULL,
    "whenToSeekCare" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" INTEGER NOT NULL,

    CONSTRAINT "Disease_pkey" PRIMARY KEY ("diseaseID")
);

-- CreateTable
CREATE TABLE "DiseaseSymptom" (
    "diseaseID" INTEGER NOT NULL,
    "symptomID" INTEGER NOT NULL,

    CONSTRAINT "DiseaseSymptom_pkey" PRIMARY KEY ("diseaseID","symptomID")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "appointmentID" SERIAL NOT NULL,
    "patientID" INTEGER NOT NULL,
    "hcpID" INTEGER NOT NULL,
    "appointmentDate" DATE NOT NULL,
    "appointmentTime" TIME(0) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("appointmentID")
);

-- CreateTable
CREATE TABLE "Message" (
    "messageID" SERIAL NOT NULL,
    "senderID" INTEGER NOT NULL,
    "receiverID" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readStatus" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("messageID")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "assessmentID" SERIAL NOT NULL,
    "patientID" INTEGER NOT NULL,
    "assessmentDate" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "symptomsInput" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "resultSummary" TEXT NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("assessmentID")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "diagnosisID" SERIAL NOT NULL,
    "patientID" INTEGER NOT NULL,
    "diagnosisName" VARCHAR(120) NOT NULL,
    "diagnosisDate" DATE,
    "diagnosedBy" VARCHAR(120),
    "notes" TEXT,
    "recordedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("diagnosisID")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "auditLogID" SERIAL NOT NULL,
    "adminID" INTEGER NOT NULL,
    "action" VARCHAR(30) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityID" INTEGER NOT NULL,
    "changeSummary" TEXT NOT NULL,
    "changedFields" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("auditLogID")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userID_key" ON "Patient"("userID");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_icNumber_key" ON "Patient"("icNumber");

-- CreateIndex
CREATE UNIQUE INDEX "HealthcareProfessional_userID_key" ON "HealthcareProfessional"("userID");

-- CreateIndex
CREATE UNIQUE INDEX "HealthcareProfessional_licenseNo_key" ON "HealthcareProfessional"("licenseNo");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_userID_key" ON "Admin"("userID");

-- CreateIndex
CREATE UNIQUE INDEX "Symptom_symptomName_key" ON "Symptom"("symptomName");

-- CreateIndex
CREATE UNIQUE INDEX "Disease_diseaseName_key" ON "Disease"("diseaseName");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthcareProfessional" ADD CONSTRAINT "HealthcareProfessional_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthcareProfessional" ADD CONSTRAINT "HealthcareProfessional_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "Admin"("adminID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomRecord" ADD CONSTRAINT "SymptomRecord_patientID_fkey" FOREIGN KEY ("patientID") REFERENCES "Patient"("patientID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomRecord" ADD CONSTRAINT "SymptomRecord_symptomID_fkey" FOREIGN KEY ("symptomID") REFERENCES "Symptom"("symptomID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disease" ADD CONSTRAINT "Disease_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "Admin"("adminID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiseaseSymptom" ADD CONSTRAINT "DiseaseSymptom_diseaseID_fkey" FOREIGN KEY ("diseaseID") REFERENCES "Disease"("diseaseID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiseaseSymptom" ADD CONSTRAINT "DiseaseSymptom_symptomID_fkey" FOREIGN KEY ("symptomID") REFERENCES "Symptom"("symptomID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientID_fkey" FOREIGN KEY ("patientID") REFERENCES "Patient"("patientID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_hcpID_fkey" FOREIGN KEY ("hcpID") REFERENCES "HealthcareProfessional"("hcpID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderID_fkey" FOREIGN KEY ("senderID") REFERENCES "User"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverID_fkey" FOREIGN KEY ("receiverID") REFERENCES "User"("userID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_patientID_fkey" FOREIGN KEY ("patientID") REFERENCES "Patient"("patientID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_patientID_fkey" FOREIGN KEY ("patientID") REFERENCES "Patient"("patientID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminID_fkey" FOREIGN KEY ("adminID") REFERENCES "Admin"("adminID") ON DELETE RESTRICT ON UPDATE CASCADE;
