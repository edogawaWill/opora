export type RegistrationField = "email" | "licenseNo";

export type RegistrationActionState = {
  message: string;
  fieldErrors?: Partial<Record<RegistrationField, string>>;
  redirectTo?: "/verify-email?sent=1";
};

export const INITIAL_REGISTRATION_STATE: RegistrationActionState = {
  message: "",
};
