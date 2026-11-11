export type DiseaseActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const INITIAL_DISEASE_ACTION_STATE: DiseaseActionState = {
  status: "idle",
  message: "",
};
