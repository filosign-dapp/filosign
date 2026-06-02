import { zHexString } from "@filosign/shared/zod";
import { useMutation } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	type DecryptedAttachmentPacketFile,
	decryptAttachmentPacketAccess,
} from "../../lib/attachment-packets";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { getSessionSeed } from "../auth/session-seed";

export type DownloadSupplementaryPacketArgs = {
	pieceCid: string;
	packetId: string;
	recipientEmail: string;
};

export type DownloadableSupplementaryFile = Pick<
	DecryptedAttachmentPacketFile,
	"name" | "mimeType" | "bytes"
>;

export type DownloadSupplementaryPacketResult = {
	packetId: string;
	files: DownloadableSupplementaryFile[];
};

export function useDownloadSupplementaryPacket() {
	const { wallet } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation<
		DownloadSupplementaryPacketResult,
		Error,
		DownloadSupplementaryPacketArgs
	>({
		mutationFn: async (args) => {
			if (!wallet || !isAuthed) {
				throw new Error("not connected");
			}

			const keySeed = getSessionSeed(wallet.account.address);
			if (!keySeed) {
				throw new Error("Unlock your wallet keys to download extra files");
			}

			const access = await rpcQuery.attachments.packetAccess.call({
				pieceCid: args.pieceCid,
				packetId: args.packetId,
			});

			const kemParsed = zHexString().safeParse(access.kemCiphertext);
			const dekParsed = zHexString().safeParse(access.encryptedPacketDek);
			if (!kemParsed.success || !dekParsed.success) {
				throw new Error(
					"Extra files are not ready for download on this device yet",
				);
			}

			const files = await decryptAttachmentPacketAccess({
				packetCid: access.packetCid,
				recipientEmail: args.recipientEmail,
				downloadUrl: access.downloadUrl,
				kemCiphertext: kemParsed.data,
				encryptedPacketDek: dekParsed.data,
				keySeed: new Uint8Array(Array.from(keySeed)),
			});

			return {
				packetId: access.packetId,
				files: files.map((f) => ({
					name: f.name,
					mimeType: f.mimeType,
					bytes: f.bytes,
				})),
			};
		},
	});
}

export function triggerBrowserFileDownload(file: {
	name: string;
	mimeType: string;
	bytes: Uint8Array;
}) {
	const blob = new Blob([Uint8Array.from(file.bytes)], { type: file.mimeType });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = file.name;
	anchor.click();
	URL.revokeObjectURL(url);
}
