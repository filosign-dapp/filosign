import { archivalCdnUrl } from "@/lib/platform/foc";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const DEFAULT_POLL_ATTEMPTS = 12;
const DEFAULT_POLL_DELAY_MS = 5000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function bytesMatch(a: Uint8Array, b: Uint8Array): boolean {
	return a.byteLength === b.byteLength && a.every((byte, i) => byte === b[i]);
}

export function assertFocBytesMatch(args: {
	pieceCid: string;
	source: string;
	actualBytes: Uint8Array;
	expectedBytes: Uint8Array;
}): void {
	if (bytesMatch(args.actualBytes, args.expectedBytes)) {
		return;
	}
	throw new Error(`FOC ${args.source} bytes mismatch for ${args.pieceCid}`);
}

export type FocCdnFetch = (url: string) => Promise<Response>;

/** Poll Filbeam CDN until ciphertext matches R2 bytes (eventual consistency after upload). */
export async function verifyFocCdnCiphertext(args: {
	pieceCid: string;
	expectedBytes: Uint8Array;
	attempts?: number;
	delayMs?: number;
	fetchCiphertext?: FocCdnFetch;
}): Promise<void> {
	const { pieceCid, expectedBytes } = args;
	const attempts = args.attempts ?? DEFAULT_POLL_ATTEMPTS;
	const delayMs = args.delayMs ?? DEFAULT_POLL_DELAY_MS;
	const fetchCiphertext = args.fetchCiphertext ?? ((url) => fetch(url));
	const cdnUrl = archivalCdnUrl(pieceCid);

	let lastStatus: number | undefined;
	let lastError: unknown;

	for (let i = 0; i < attempts; i++) {
		const focRes = await tryCatch(fetchCiphertext(cdnUrl));
		if (focRes.error) {
			lastError = focRes.error;
			logger.info(
				{
					pieceCid,
					attempt: i + 1,
					attempts,
					cdnUrl,
					err: focRes.error,
				},
				"foc-transition: CDN verify attempt failed (fetch error)",
			);
		} else if (!focRes.data.ok) {
			lastStatus = focRes.data.status;
			logger.info(
				{
					pieceCid,
					attempt: i + 1,
					attempts,
					cdnUrl,
					status: focRes.data.status,
				},
				"foc-transition: CDN verify attempt failed (HTTP not ok)",
			);
		} else {
			const focBytes = new Uint8Array(await focRes.data.arrayBuffer());
			assertFocBytesMatch({
				pieceCid,
				source: "CDN",
				actualBytes: focBytes,
				expectedBytes,
			});
			if (i > 0) {
				logger.info(
					{ pieceCid, attempt: i + 1, attempts, cdnUrl },
					"foc-transition: CDN verify succeeded after poll",
				);
			}
			return;
		}

		if (i < attempts - 1) await sleep(delayMs);
	}

	throw new Error(`FOC CDN verify failed for ${pieceCid}`, {
		cause:
			lastError ??
			(lastStatus !== undefined ? `HTTP ${lastStatus}` : undefined),
	});
}
