import { z } from "zod";
import { usernameSchema } from "../../shared/validation";

export const signInSchema = z.object({
  email: z.email().trim().max(254), password: z.string().min(1).max(128),
}).strict();
export const signUpSchema = signInSchema.extend({
  password: z.string().min(8).max(128),
  username: usernameSchema,
  displayName: z.string().trim().min(1).max(80),
});
