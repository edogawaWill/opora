import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ appointmentId: string }>;
};

export default async function DirectHcpAppointmentPage({ params }: PageProps) {
  const { appointmentId } = await params;
  redirect(`/hcp/appointments?selected=${encodeURIComponent(appointmentId)}`);
}
