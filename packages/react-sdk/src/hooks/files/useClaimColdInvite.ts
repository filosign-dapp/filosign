import { zHexString } from "@filosign/shared/zod";
import { useMutation } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useClaimColdInvite() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (args: {
			inviteToken: string;
			kemCiphertext: `0x${string}`;
			encryptedEncryptionKey: `0x${string}`;
			attachmentWraps?: {
				packetId: string;
				kemCiphertext: `0x${string}`;
				encryptedPacketDek: `0x${string}`;
			}[];
		}) => {
			if (!isAuthed) throw new Error("Not authenticated");

			return rpcQuery.files.coldInvite.claim.call({
				inviteToken: args.inviteToken,
				body: {
					kemCiphertext: zHexString().parse(args.kemCiphertext),
					encryptedEncryptionKey: zHexString().parse(
						args.encryptedEncryptionKey,
					),
					...(args.attachmentWraps
						? {
								attachmentWraps: args.attachmentWraps.map((w) => ({
									packetId: w.packetId,
									kemCiphertext: zHexString().parse(w.kemCiphertext),
									encryptedPacketDek: zHexString().parse(w.encryptedPacketDek),
								})),
							}
						: {}),
				},
			});
		},
	});
}
