import { z } from "zod";

const zCursorPayload = z.object({
	u: z.string(),
	i: z.string(),
});

export type ListCursor = z.infer<typeof zCursorPayload>;

export function encodeListCursor(updatedAt: Date, id: string): string {
	const payload: ListCursor = {
		u: updatedAt.toISOString(),
		i: id,
	};
	return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeListCursor(raw: string | undefined): ListCursor | null {
	if (!raw?.trim()) return null;
	try {
		const json = Buffer.from(raw, "base64url").toString("utf8");
		const parsed = zCursorPayload.safeParse(JSON.parse(json));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}
