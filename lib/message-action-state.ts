export type MessageActionState = {
  status: "idle" | "success" | "error";
  message: string;
  messageID?: number;
};
