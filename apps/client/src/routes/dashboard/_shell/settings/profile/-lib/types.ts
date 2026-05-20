import { z } from "zod";

export const profileSchema = z.object({
	personal: z.object({
		firstName: z
			.string()
			.min(1, "First name is required")
			.max(50, "First name too long"),
		lastName: z
			.string()
			.min(1, "Last name is required")
			.max(50, "Last name too long"),
		walletAddress: z.string().optional(),
		email: z.string().email("Invalid email").optional(),
	}),
	profilePicture: z.string().nullable(),
});

export type ProfileForm = z.infer<typeof profileSchema>;
