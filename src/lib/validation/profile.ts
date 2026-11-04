import { z } from "zod";

const profileFields = {
  displayName: z.string().trim().min(1, "Name cannot be empty.").max(80, "Name must be at most 80 characters."),
  bio: z.string().trim().max(160, "Bio must be at most 160 characters."),
  avatarUrl: z.url({ protocol: /^https$/, error: "Avatar must be a valid HTTPS URL." }).max(2048).nullable(),
};

export const updateProfileSchema = z.object(profileFields).partial().strict()
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");

export const editProfileSchema = z.object({
  ...profileFields,
  avatarUrl: z.string().trim().transform((value) => value || null).pipe(profileFields.avatarUrl),
});
