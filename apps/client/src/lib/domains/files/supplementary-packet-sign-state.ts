import type { MySupplementaryPacketRow } from "@filosign/react/files";

export type SupplementaryPacketAccessState =
	| { status: "locked"; packet: MySupplementaryPacketRow }
	| { status: "awaiting_keys"; packet: MySupplementaryPacketRow }
	| { status: "ready"; packet: MySupplementaryPacketRow };

export function supplementaryPacketAccessState(
	packet: MySupplementaryPacketRow,
): SupplementaryPacketAccessState {
	if (!packet.unlocked) {
		return { status: "locked", packet };
	}
	if (!packet.canDecrypt) {
		return { status: "awaiting_keys", packet };
	}
	return { status: "ready", packet };
}

export function supplementaryPacketStatusLabel(
	state: SupplementaryPacketAccessState,
): string {
	switch (state.status) {
		case "locked":
			return state.packet.unlockConditionLabel;
		case "awaiting_keys":
			return "Unlock your wallet keys to download";
		case "ready":
			return "Ready to download";
	}
}

export function supplementaryPacketActionTitle(
	state: SupplementaryPacketAccessState,
): string {
	switch (state.status) {
		case "locked":
			return state.packet.unlockConditionLabel;
		case "awaiting_keys":
			return "Unlock wallet keys to download";
		case "ready":
			return "Download extra files";
	}
}
