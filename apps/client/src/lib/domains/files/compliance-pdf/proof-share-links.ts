import {
	buildChannelShareLinks,
	type ChannelShareLinks,
} from "@/src/lib/components/app/share-via-buttons";
import { DOCS_LINKS } from "@/src/lib/docs/links";

export function buildProofPacketShareLinks(
	pieceCid: string,
): ChannelShareLinks {
	const verifyUrl = DOCS_LINKS.verifyProofPacket();
	const message = [
		"I signed a document on Filosign.",
		"",
		`Document: ${pieceCid}`,
		"",
		"Download the proof packet from Filosign, then verify it independently:",
		verifyUrl,
	].join("\n");

	return buildChannelShareLinks({
		message,
		url: verifyUrl,
		subject: "Filosign proof packet verification",
		telegramText: "Verify a Filosign proof packet",
	});
}
