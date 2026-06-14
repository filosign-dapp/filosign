import { afterEach, describe, expect, it, mock } from "bun:test";
import { getAddress } from "viem";
import type { EnsureAcknowledgedDeps } from "../src/lib/ack-file/ensure-acknowledged";

const ackFileMock = mock(async () => true as const);

mock.module("../src/lib/ack-file/ack-file", () => ({
	ackFile: ackFileMock,
}));

const { ensureAcknowledged } = await import(
	"../src/lib/ack-file/ensure-acknowledged"
);

function buildDeps(
	detail: Awaited<
		ReturnType<
			EnsureAcknowledgedDeps["rpcQuery"]["files"]["piece"]["detail"]["call"]
		>
	>,
): EnsureAcknowledgedDeps {
	return {
		contracts: {} as EnsureAcknowledgedDeps["contracts"],
		wallet: {} as EnsureAcknowledgedDeps["wallet"],
		authSubjectCommitment: "0xabc",
		rpcQuery: {
			files: {
				piece: {
					detail: {
						call: async () => detail,
					},
				},
			},
		} as unknown as EnsureAcknowledgedDeps["rpcQuery"],
	};
}

afterEach(() => {
	ackFileMock.mockClear();
});

describe("ensureAcknowledged", () => {
	it("skips ack when participant already acknowledged", async () => {
		await ensureAcknowledged(
			buildDeps({
				pieceCid: "bafytest",
				sender: getAddress("0x1111111111111111111111111111111111111111"),
				registryAddress: getAddress(
					"0x2222222222222222222222222222222222222222",
				),
				participantAccess: { acknowledged: true },
			} as never),
			"bafytest",
		);

		expect(ackFileMock).not.toHaveBeenCalled();
	});

	it("calls ackFile when not yet acknowledged", async () => {
		const deps = buildDeps({
			pieceCid: "bafytest",
			sender: getAddress("0x1111111111111111111111111111111111111111"),
			registryAddress: getAddress("0x2222222222222222222222222222222222222222"),
			participantAccess: { acknowledged: false },
			signers: [],
			viewers: [],
		} as never);

		await ensureAcknowledged(deps, "bafytest");

		expect(ackFileMock).toHaveBeenCalledTimes(1);
		expect(ackFileMock).toHaveBeenCalledWith(deps, { pieceCid: "bafytest" });
	});
});
