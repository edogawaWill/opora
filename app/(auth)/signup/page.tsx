
import RegistrationShell from "@/components/auth/registration-shell";
import PatientSignupForm from "@/components/auth/patient-signup-form";

export default function PatientSignupPage() {
  return (
    <RegistrationShell>
      <PatientSignupForm />
    </RegistrationShell>
  );
}
