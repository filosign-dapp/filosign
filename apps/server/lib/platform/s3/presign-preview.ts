export const OBJECT_PREVIEW_TTL_SECONDS = 60 * 15;

export type ObjectPreviewPresigner = (
	storageKey: string,
	options: { expiresIn: number },
) => Promise<string>;

async function defaultPresigner(
	storageKey: string,
	options: { expiresIn: number },
): Promise<string> {
	const { bucket } = await import("@/lib/platform/s3/client");
	return bucket.presign(storageKey, {
		method: "GET",
		expiresIn: options.expiresIn,
	});
}

export async function presignObjectPreviewGet(
	storageKey: string | null | undefined,
	presign?: ObjectPreviewPresigner,
): Promise<string | null> {
	if (!storageKey) return null;
	const resolve = presign ?? defaultPresigner;
	try {
		return await resolve(storageKey, {
			expiresIn: OBJECT_PREVIEW_TTL_SECONDS,
		});
	} catch {
		return null;
	}
}
