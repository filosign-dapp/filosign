import { encryption } from "@filosign/crypto-utils";
import { fileCommentInfo } from "@filosign/shared";

export async function encryptFileComment(args: {
	dek: Uint8Array;
	pieceCid: string;
	commentId: string;
	body: string;
}): Promise<Uint8Array> {
	const bytes = new TextEncoder().encode(args.body);
	return encryption.encrypt({
		message: bytes,
		secretKey: args.dek,
		info: fileCommentInfo(args.pieceCid, args.commentId),
	});
}

export async function decryptFileComment(args: {
	dek: Uint8Array;
	pieceCid: string;
	commentId: string;
	ciphertext: Uint8Array;
}): Promise<string> {
	const plain = await encryption.decrypt({
		ciphertext: args.ciphertext,
		secretKey: args.dek,
		info: fileCommentInfo(args.pieceCid, args.commentId),
	});
	return new TextDecoder().decode(plain);
}
