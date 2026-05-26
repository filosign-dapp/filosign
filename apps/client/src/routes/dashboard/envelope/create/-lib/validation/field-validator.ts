import type { z } from "zod";

export function fieldErrorMessage(
	errors: readonly unknown[] | undefined,
): string | undefined {
	const first = errors?.[0];
	return typeof first === "string" ? first : undefined;
}

/** Adapts a Zod schema to a TanStack Form field `onSubmit` validator. */
export function zodFieldValidator<T>(schema: z.ZodType<T>) {
	return ({ value }: { value: T }) => {
		const result = schema.safeParse(value);
		if (!result.success) {
			return result.error.issues[0]?.message;
		}
		return undefined;
	};
}
