export type DiagnosisActionState = {
  status: "idle" | "success" | "error";
  message: string;
  diagnosisID?: number;
};

export const INITIAL_DIAGNOSIS_ACTION_STATE: DiagnosisActionState = {
  status: "idle",
  message: "",
};
