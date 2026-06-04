import { z } from "zod";

export const profileSchema = z.object({
	personal: z.object({
		firstName: z
			.string()
			.min(1, { error: "First name is required" })
			.max(50, { error: "First name too long" }),
		lastName: z
			.string()
			.min(1, { error: "Last name is required" })
			.max(50, { error: "Last name too long" }),
		walletAddress: z.string().optional(),
		email: z.email({ error: "Invalid email" }).optional(),
	}),
	profilePicture: z.string().nullable(),
});

export type ProfileForm = z.infer<typeof profileSchema>;
