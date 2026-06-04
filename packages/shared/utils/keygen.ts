import { z } from "zod";

/** Persisted in `users.keygenDataJson` after registration. */
export const zUserKeygenDataJson = z.object({
	saltPin: z.string(),
	saltSeed: z.string(),
	saltChallenge: z.string(),
	commitmentKem: z.string(),
	commitmentSig: z.string(),
});

export type UserKeygenDataJson = z.infer<typeof zUserKeygenDataJson>;
