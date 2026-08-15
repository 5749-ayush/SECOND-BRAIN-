import { z } from "zod";

export const memberRoleSchema = z.enum(["owner", "member"]);

export interface Member {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: z.infer<typeof memberRoleSchema>;
  status: "active";
  createdAt: string;
  createdBy: string;
}
