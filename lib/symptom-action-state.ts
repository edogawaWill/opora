export type SymptomActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const INITIAL_SYMPTOM_ACTION_STATE: SymptomActionState = {
  status: "idle",
  message: "",
};
