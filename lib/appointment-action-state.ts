export type AppointmentActionState = {
  status: "idle" | "success" | "error";
  message: string;
  appointmentID?: number;
};
