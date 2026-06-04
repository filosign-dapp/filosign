import { describe, expect, test } from "bun:test";
import type { MySupplementaryPacketRow } from "@filosign/react/files";
import {
	supplementaryPacketAccessState,
	supplementaryPacketStatusLabel,
} from "./supplementary-packet-sign-state";

const basePacket = {
	packetId: "pkt-1",
	label: "Exhibit A",
	releaseMode: "conditional" as const,
	cancelled: false,
	unlockConditionLabel: "Unlocks when everyone signs",
	canDecrypt: true,
};

describe("supplementaryPacketAccessState", () => {
	test("locked when not unlocked", () => {
		const packet: MySupplementaryPacketRow = {
			...basePacket,
			unlocked: false,
		};
		expect(supplementaryPacketAccessState(packet).status).toBe("locked");
		expect(
			supplementaryPacketStatusLabel(supplementaryPacketAccessState(packet)),
		).toBe("Unlocks when everyone signs");
	});

	test("awaiting_keys when unlocked without decrypt material", () => {
		const packet: MySupplementaryPacketRow = {
			...basePacket,
			unlocked: true,
			canDecrypt: false,
		};
		expect(supplementaryPacketAccessState(packet).status).toBe("awaiting_keys");
	});

	test("ready when unlocked with decrypt material", () => {
		const packet: MySupplementaryPacketRow = {
			...basePacket,
			unlocked: true,
		};
		expect(supplementaryPacketAccessState(packet).status).toBe("ready");
	});
});
