import { createHash } from "node:crypto";

export function buildEmailIdempotencyKey(segments: string[]): string {
	return createHash("sha256")
		.update(segments.join("\0"))
		.digest("hex")
		.slice(0, 240);
}
