import { describe, expect, test } from "bun:test";
import {
	type FocCdnFetch,
	verifyFocCdnCiphertext,
} from "@/lib/domains/foc/utils/cdn-verify";

const pieceCid = "bafkzcibtestpiececid";

function fetchSequence(
	handlers: Array<(url: string) => Response | Promise<Response>>,
): FocCdnFetch {
	let call = 0;
	return async (url) => {
		const handler = handlers[Math.min(call, handlers.length - 1)];
		call += 1;
		return handler(url);
	};
}

describe("verifyFocCdnCiphertext", () => {
	test("succeeds after CDN returns non-ok then matching bytes", async () => {
		const expectedBytes = new Uint8Array([1, 2, 3, 4]);

		await verifyFocCdnCiphertext({
			pieceCid,
			expectedBytes,
			attempts: 3,
			delayMs: 0,
			fetchCiphertext: fetchSequence([
				() => new Response(null, { status: 404 }),
				() => new Response(expectedBytes),
			]),
		});
	});

	test("throws after all attempts return non-ok", async () => {
		const expectedBytes = new Uint8Array([9, 9, 9]);

		await expect(
			verifyFocCdnCiphertext({
				pieceCid,
				expectedBytes,
				attempts: 2,
				delayMs: 0,
				fetchCiphertext: fetchSequence([
					() => new Response(null, { status: 503 }),
				]),
			}),
		).rejects.toThrow(/FOC CDN verify failed/);
	});

	test("throws immediately on byte mismatch without retrying", async () => {
		const expectedBytes = new Uint8Array([1, 2, 3]);
		let calls = 0;
		const fetchCiphertext: FocCdnFetch = async () => {
			calls += 1;
			return new Response(new Uint8Array([9, 9, 9]));
		};

		await expect(
			verifyFocCdnCiphertext({
				pieceCid,
				expectedBytes,
				attempts: 5,
				delayMs: 0,
				fetchCiphertext,
			}),
		).rejects.toThrow(/FOC CDN bytes mismatch/);

		expect(calls).toBe(1);
	});
});
