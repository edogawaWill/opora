import RegistrationShell from "@/components/auth/registration-shell";
import HcpSignupForm from "@/components/auth/hcp-signup-form";

export default function HealthcareProfessionalSignupPage() {
    return (
        <RegistrationShell variant="hcp">
            <HcpSignupForm />
        </RegistrationShell>
    );
}
